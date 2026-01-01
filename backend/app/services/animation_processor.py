"""Animation processing service for SVD animations."""
import json
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

from PIL import Image

from app.config import settings
from app.database import get_db_session
from app.models.generation import Generation, GenerationStatus
from app.services.comfyui_client import comfyui_client
from app.services.event_bus import event_bus
from app.services.job_queue import Job


class AnimationProcessor:
    """Processor for animation generation jobs."""

    def __init__(self, storage_path: Path):
        self.storage_path = Path(storage_path)
        self._workflow_cache = {}

    def _load_workflow(self, name: str) -> dict:
        """Load and cache workflow template."""
        if name not in self._workflow_cache:
            workflow_path = Path(__file__).parent.parent / "workflows" / f"{name}.json"
            with open(workflow_path) as f:
                self._workflow_cache[name] = json.load(f)
        return self._workflow_cache[name].copy()

    def _prepare_svd_workflow(
        self,
        source_image_name: str,
        generation: Generation,
        seed: int,
        source_width: int,
        source_height: int,
    ) -> dict:
        """Prepare Stable Video Diffusion workflow."""
        import copy

        workflow = copy.deepcopy(self._load_workflow("animate_svd"))

        frames = int((generation.duration_seconds or 3.0) * (generation.fps or 8))

        # SVD works best with specific resolutions - scale to fit within 1024x576 or 576x1024
        # while maintaining aspect ratio
        aspect = source_width / source_height
        if aspect >= 1:
            # Landscape or square - use 1024x576 base
            svd_width = 1024
            svd_height = int(1024 / aspect)
            # SVD requires height divisible by 64
            svd_height = max(320, min(576, (svd_height // 64) * 64))
        else:
            # Portrait - use 576x1024 base
            svd_height = 1024
            svd_width = int(1024 * aspect)
            # SVD requires width divisible by 64
            svd_width = max(320, min(576, (svd_width // 64) * 64))

        # Load source image
        workflow["1"]["inputs"]["image"] = source_image_name

        # SVD model settings - set dimensions, frames, fps, and motion
        workflow["3"]["inputs"]["width"] = svd_width
        workflow["3"]["inputs"]["height"] = svd_height
        workflow["3"]["inputs"]["video_frames"] = min(frames, 25)  # SVD limit
        workflow["3"]["inputs"]["fps"] = generation.fps or 8
        workflow["3"]["inputs"]["motion_bucket_id"] = generation.motion_bucket_id or 127
        workflow["3"]["inputs"]["augmentation_level"] = 0.0

        # Sampler
        workflow["4"]["inputs"]["seed"] = seed

        return workflow

    def _create_video_from_frames(
        self, generation_id: str, frames_dir: Path, fps: int
    ) -> Path:
        """Combine frames into video using ffmpeg."""
        now = datetime.utcnow()
        dir_path = self.storage_path / "animations" / str(now.year) / f"{now.month:02d}"
        dir_path.mkdir(parents=True, exist_ok=True)

        video_path = dir_path / f"{generation_id}.mp4"

        try:
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-framerate",
                    str(fps),
                    "-i",
                    str(frames_dir / "frame_%05d.png"),
                    "-c:v",
                    "libx264",
                    "-pix_fmt",
                    "yuv420p",
                    "-crf",
                    "18",
                    str(video_path),
                ],
                capture_output=True,
                check=True,
            )
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"Failed to create video: {e.stderr.decode()}")

        return video_path.relative_to(self.storage_path)

    def _create_video_thumbnail(self, generation_id: str, video_path: Path) -> Path:
        """Extract first frame as thumbnail using ffmpeg."""
        full_video_path = self.storage_path / video_path
        thumb_dir = self.storage_path / "images"
        thumb_dir.mkdir(parents=True, exist_ok=True)

        thumb_path = thumb_dir / f"{generation_id}_thumb.webp"

        try:
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(full_video_path),
                    "-vframes",
                    "1",
                    "-vf",
                    "scale=256:-1",
                    "-c:v",
                    "libwebp",
                    "-quality",
                    "80",
                    str(thumb_path),
                ],
                capture_output=True,
                check=True,
            )
        except (subprocess.CalledProcessError, FileNotFoundError):
            # Fallback: create placeholder thumbnail
            img = Image.new("RGB", (256, 256), color=(100, 100, 100))
            img.save(thumb_path, "WEBP", quality=80)

        return thumb_path.relative_to(self.storage_path)


async def process_animation_job(job: Job):
    """Process an animation job."""
    generation_id = job.params["generation_id"]

    processor = AnimationProcessor(Path(settings.storage_path))

    with get_db_session() as db:
        generation = db.query(Generation).filter(Generation.id == generation_id).first()
        if not generation:
            return

        try:
            # Update status to processing
            generation.status = GenerationStatus.PROCESSING
            db.commit()

            await event_bus.publish("generation.processing", {
                "id": generation_id,
                "status": "processing",
            })

            # Get source generation
            source_gen = db.query(Generation).filter(
                Generation.id == generation.source_generation_id
            ).first()
            if not source_gen or not source_gen.image_path:
                raise ValueError("Source generation image not found")

            # Upload source image to ComfyUI
            storage_path = Path(settings.storage_path)
            source_path = storage_path / source_gen.image_path
            with open(source_path, "rb") as f:
                source_data = f.read()
            source_image_name = await comfyui_client.upload_image(
                source_data, f"{generation_id}_source.webp"
            )

            # Get source image dimensions
            with Image.open(source_path) as img:
                source_width, source_height = img.size

            # Use seed from generation or generate new one
            import random
            seed = generation.seed if generation.seed else random.randint(0, 2**32 - 1)

            # Prepare workflow
            workflow = processor._prepare_svd_workflow(
                source_image_name, generation, seed, source_width, source_height
            )

            # Submit to ComfyUI
            prompt_id = await comfyui_client.submit_workflow(workflow)
            generation.comfyui_prompt_id = prompt_id
            db.commit()

            # Wait for completion (animations can take longer)
            result = await comfyui_client.wait_for_completion(prompt_id, timeout=600.0)

            if result.status == "completed" and result.images:
                # Download all frames from ComfyUI
                frames_dir = storage_path / "temp_frames" / generation_id
                frames_dir.mkdir(parents=True, exist_ok=True)

                for i, image_info in enumerate(result.images):
                    frame_data = await comfyui_client.get_image(
                        image_info["filename"], image_info.get("subfolder", "")
                    )
                    frame_path = frames_dir / f"frame_{i:05d}.png"
                    frame_path.write_bytes(frame_data)

                    # Clean up from ComfyUI output directory
                    subfolder = image_info.get("subfolder", "")
                    filename = image_info["filename"]
                    comfyui_output = storage_path / "comfyui-output"
                    if subfolder:
                        comfyui_file = comfyui_output / subfolder / filename
                    else:
                        comfyui_file = comfyui_output / filename
                    if comfyui_file.exists():
                        comfyui_file.unlink()

                # Create video from frames
                fps = generation.fps or 8
                video_path = processor._create_video_from_frames(generation_id, frames_dir, fps)
                thumbnail_path = processor._create_video_thumbnail(generation_id, video_path)

                # Clean up temp frames
                shutil.rmtree(frames_dir, ignore_errors=True)

                # Update generation
                generation.video_path = str(video_path)
                generation.thumbnail_path = str(thumbnail_path)
                generation.status = GenerationStatus.COMPLETED
                generation.completed_at = datetime.utcnow()
                db.commit()

                await event_bus.publish("generation.completed", {
                    "id": generation_id,
                    "status": "completed",
                    "video_path": generation.video_path,
                })
            else:
                generation.status = GenerationStatus.FAILED
                generation.error_message = result.error or "Animation failed"
                db.commit()

                await event_bus.publish("generation.failed", {
                    "id": generation_id,
                    "status": "failed",
                    "error": generation.error_message,
                })

        except Exception as e:
            generation.status = GenerationStatus.FAILED
            generation.error_message = str(e)
            db.commit()

            await event_bus.publish("generation.failed", {
                "id": generation_id,
                "status": "failed",
                "error": str(e),
            })
