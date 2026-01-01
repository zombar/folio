import base64
import json
import random
from pathlib import Path
from datetime import datetime
from sqlalchemy.orm import Session
from typing import List, Optional
from PIL import Image
import io

from app.config import settings
from app.models.generation import Generation, GenerationStatus
from app.models.workflow import WorkflowTemplate
from app.schemas.generation import GenerationCreate, GenerationResponse
from app.services.event_bus import event_bus
from app.services.job_queue import get_job_queue, Job, JobType, JobPriority
from app.services.comfyui_client import comfyui_client


class GenerationService:
    """Service for generation operations."""

    def __init__(self, db: Session):
        self.db = db
        self._workflow_cache = {}

    def list_all(self, portfolio_id: Optional[str] = None) -> List[GenerationResponse]:
        """List all generations, optionally filtered by portfolio."""
        query = self.db.query(Generation)
        if portfolio_id:
            query = query.filter(Generation.portfolio_id == portfolio_id)
        generations = query.order_by(Generation.created_at.desc()).all()
        return [GenerationResponse(**g.to_dict()) for g in generations]

    def list_animations(self, portfolio_id: str) -> List[GenerationResponse]:
        """List completed animate-type generations for a portfolio."""
        generations = (
            self.db.query(Generation)
            .filter(
                Generation.portfolio_id == portfolio_id,
                Generation.generation_type == "animate",
                Generation.status == GenerationStatus.COMPLETED,
            )
            .order_by(Generation.created_at.desc())
            .all()
        )
        return [GenerationResponse(**g.to_dict()) for g in generations]

    def should_auto_animate(self, portfolio_id: str) -> bool:
        """Check if portfolio needs more animations (< 25% of txt2img)."""
        txt2img_count = (
            self.db.query(Generation)
            .filter(
                Generation.portfolio_id == portfolio_id,
                Generation.generation_type == "txt2img",
                Generation.status == GenerationStatus.COMPLETED,
            )
            .count()
        )

        if txt2img_count == 0:
            return False

        animate_count = (
            self.db.query(Generation)
            .filter(
                Generation.portfolio_id == portfolio_id,
                Generation.generation_type == "animate",
            )
            .count()
        )

        return animate_count / txt2img_count < 0.25

    def get_unanimated_generation(self, portfolio_id: str) -> Optional[Generation]:
        """Get a random completed txt2img generation without an animation."""
        from sqlalchemy import not_, select

        # Subquery to find source_generation_ids that have animations
        animated_ids_subquery = (
            select(Generation.source_generation_id)
            .where(
                Generation.portfolio_id == portfolio_id,
                Generation.generation_type == "animate",
                Generation.source_generation_id.isnot(None),
            )
        )

        # Get txt2img generations without animations
        unanimated = (
            self.db.query(Generation)
            .filter(
                Generation.portfolio_id == portfolio_id,
                Generation.generation_type == "txt2img",
                Generation.status == GenerationStatus.COMPLETED,
                Generation.image_path.isnot(None),
                not_(Generation.id.in_(animated_ids_subquery)),
            )
            .all()
        )

        if not unanimated:
            return None

        return random.choice(unanimated)

    async def create_animation(self, source_generation_id: str) -> Optional[GenerationResponse]:
        """Create an animation for a source generation with LOW priority."""
        source = self.db.query(Generation).filter(
            Generation.id == source_generation_id
        ).first()
        if not source:
            return None
        if source.status != GenerationStatus.COMPLETED:
            return None
        if not source.image_path:
            return None

        data = GenerationCreate(
            portfolio_id=source.portfolio_id,
            prompt=source.prompt,
            generation_type="animate",
            source_generation_id=source_generation_id,
            motion_bucket_id=15,  # Subtle motion for auto-animations
            fps=8,
            duration_seconds=2.0,  # 16 frames at 8 fps
        )
        return await self.create(data)

    async def maybe_auto_animate(self, portfolio_id: str) -> Optional[GenerationResponse]:
        """Auto-animate if portfolio has < 25% animations.

        Called after txt2img generation completes to maintain 25% animation ratio.
        """
        if not self.should_auto_animate(portfolio_id):
            return None

        source = self.get_unanimated_generation(portfolio_id)
        if not source:
            return None

        return await self.create_animation(source.id)

    def get(self, generation_id: str) -> Optional[GenerationResponse]:
        """Get a generation by ID."""
        generation = self.db.query(Generation).filter(Generation.id == generation_id).first()
        if not generation:
            return None
        return GenerationResponse(**generation.to_dict())

    async def create(self, data: GenerationCreate) -> GenerationResponse:
        """Create a new generation job."""
        # Generate seed if not provided
        seed = data.seed if data.seed is not None else random.randint(0, 2**32 - 1)

        # For inpainting/upscaling/outpainting/animate, validate source generation exists
        source_generation = None
        if data.generation_type in ("inpaint", "upscale", "outpaint", "animate"):
            if not data.source_generation_id:
                raise ValueError(f"source_generation_id is required for {data.generation_type}")
            source_generation = self.db.query(Generation).filter(
                Generation.id == data.source_generation_id
            ).first()
            if not source_generation:
                raise ValueError(f"Source generation {data.source_generation_id} not found")
            if source_generation.status != GenerationStatus.COMPLETED:
                raise ValueError("Source generation must be completed")
            if not source_generation.image_path:
                raise ValueError("Source generation has no image")

            # Adjust dimensions based on generation type
            if data.generation_type == "inpaint":
                # Use source dimensions for inpainting
                data.width = source_generation.width
                data.height = source_generation.height
            elif data.generation_type == "upscale":
                # Calculate output dimensions for upscaling
                upscale_factor = data.upscale_factor or 2.0
                data.width = int(source_generation.width * upscale_factor)
                data.height = int(source_generation.height * upscale_factor)
            elif data.generation_type == "outpaint":
                # Calculate new dimensions with padding
                left_right = (data.outpaint_left or 0) + (data.outpaint_right or 0)
                top_bottom = (data.outpaint_top or 0) + (data.outpaint_bottom or 0)
                data.width = source_generation.width + left_right
                data.height = source_generation.height + top_bottom
            elif data.generation_type == "animate":
                # Use source dimensions for animation
                data.width = source_generation.width
                data.height = source_generation.height

        # Create generation record
        generation = Generation(
            portfolio_id=data.portfolio_id,
            generation_type=data.generation_type,
            source_generation_id=data.source_generation_id,
            prompt=data.prompt,
            negative_prompt=data.negative_prompt,
            width=data.width,
            height=data.height,
            seed=seed,
            steps=data.steps,
            cfg_scale=data.cfg_scale,
            sampler=data.sampler,
            workflow_id=data.workflow_id,
            model_filename=data.model_filename,
            lora_filename=data.lora_filename,
            # Inpainting fields
            denoising_strength=data.denoising_strength,
            grow_mask_by=data.grow_mask_by,
            # Upscaling fields
            upscale_factor=data.upscale_factor,
            upscale_model=data.upscale_model,
            sharpen_amount=data.sharpen_amount,
            # Outpainting fields
            outpaint_left=data.outpaint_left,
            outpaint_right=data.outpaint_right,
            outpaint_top=data.outpaint_top,
            outpaint_bottom=data.outpaint_bottom,
            outpaint_feather=data.outpaint_feather,
            # Animation fields
            motion_bucket_id=data.motion_bucket_id,
            fps=data.fps,
            duration_seconds=data.duration_seconds,
            status=GenerationStatus.PENDING,
        )
        self.db.add(generation)
        self.db.commit()
        self.db.refresh(generation)

        # Save mask image if provided (for inpainting)
        if data.mask_image_base64:
            mask_path = self._save_mask_from_base64(generation.id, data.mask_image_base64)
            generation.mask_path = str(mask_path)
            self.db.commit()

        # Determine priority and job type based on generation type
        if data.generation_type == "animate":
            priority = JobPriority.LOW
            job_type = JobType.ANIMATION
        elif data.generation_type in ("inpaint", "upscale", "outpaint"):
            priority = JobPriority.CRITICAL
            job_type = JobType.GENERATION
        else:
            priority = JobPriority.HIGH
            job_type = JobType.GENERATION

        # Create job
        job = Job(
            id=generation.id,
            job_type=job_type,
            priority=priority,
            params={
                "generation_id": generation.id,
            },
            created_at=datetime.utcnow().isoformat(),
        )

        # Enqueue job
        await get_job_queue().enqueue(job)

        # Publish event
        await event_bus.publish("generation.created", {
            "id": generation.id,
            "status": "pending",
        })

        return GenerationResponse(**generation.to_dict())

    async def iterate(self, generation_id: str) -> Optional[GenerationResponse]:
        """Create a variation of an existing generation."""
        parent = self.db.query(Generation).filter(Generation.id == generation_id).first()
        if not parent:
            return None

        # Create new generation based on parent
        data = GenerationCreate(
            portfolio_id=parent.portfolio_id,
            prompt=parent.prompt,
            negative_prompt=parent.negative_prompt,
            width=parent.width,
            height=parent.height,
            seed=None,  # New random seed
            steps=parent.steps,
            cfg_scale=parent.cfg_scale,
            sampler=parent.sampler,
        )

        result = await self.create(data)

        # Update parent_id
        generation = self.db.query(Generation).filter(Generation.id == result.id).first()
        if generation:
            generation.parent_id = parent.id
            self.db.commit()
            self.db.refresh(generation)
            return GenerationResponse(**generation.to_dict())

        return result

    def delete(self, generation_id: str) -> bool:
        """Delete a generation."""
        generation = self.db.query(Generation).filter(Generation.id == generation_id).first()
        if not generation:
            return False

        # Delete image files
        if generation.image_path:
            image_path = Path(settings.storage_path) / generation.image_path
            if image_path.exists():
                image_path.unlink()
        if generation.thumbnail_path:
            thumb_path = Path(settings.storage_path) / generation.thumbnail_path
            if thumb_path.exists():
                thumb_path.unlink()

        self.db.delete(generation)
        self.db.commit()
        return True

    def _load_workflow(self, name: str) -> dict:
        """Load and cache workflow template."""
        if name not in self._workflow_cache:
            workflow_path = Path(__file__).parent.parent / "workflows" / f"{name}.json"
            with open(workflow_path) as f:
                self._workflow_cache[name] = json.load(f)
        return self._workflow_cache[name].copy()

    def _save_mask_from_base64(self, generation_id: str, mask_base64: str) -> Path:
        """Save mask image from base64 to storage as PNG with alpha channel.

        The frontend draws white where the user wants to inpaint (regenerate).
        ComfyUI's LoadImage node outputs:
        - Output 0: IMAGE (RGB pixels)
        - Output 1: MASK (from alpha channel)

        The VAEEncodeForInpaint node expects MASK where:
        - Alpha 0 = area to REGENERATE (transparent)
        - Alpha 255 = area to KEEP (opaque)

        The frontend sends a canvas where:
        - White pixels with alpha = area user painted = area to regenerate

        So we need to:
        1. Extract where the user painted (alpha > 0 in the source)
        2. Invert it: painted areas become transparent (alpha=0, regenerate)
        3. Save as RGBA so LoadImage can extract the alpha as MASK
        """
        from PIL import ImageOps

        # Decode base64 mask
        mask_data = base64.b64decode(mask_base64)

        storage_path = Path(settings.storage_path)
        dir_path = storage_path / "masks"
        dir_path.mkdir(parents=True, exist_ok=True)

        file_path = dir_path / f"{generation_id}_mask.png"

        # Load the mask image from frontend
        img = Image.open(io.BytesIO(mask_data))

        # Extract the painted areas
        if img.mode == "RGBA":
            # Frontend sends RGBA where alpha > 0 means painted area
            alpha = img.split()[3]
        elif img.mode == "LA":
            # Grayscale with alpha
            alpha = img.split()[1]
        elif img.mode == "L":
            # Pure grayscale - white = painted
            alpha = img
        else:
            # Convert to grayscale
            alpha = img.convert("L")

        # Invert: painted areas (high alpha/white) become transparent (low alpha)
        # This makes painted areas = regenerate in ComfyUI
        inverted_alpha = ImageOps.invert(alpha.convert("L"))

        # Create RGBA image with the inverted alpha channel
        # RGB can be anything (use white for visibility when debugging)
        width, height = img.size
        rgba_img = Image.new("RGBA", (width, height), (255, 255, 255, 255))
        rgba_img.putalpha(inverted_alpha)

        rgba_img.save(file_path, "PNG")

        return file_path.relative_to(storage_path)

    def _prepare_workflow(
        self,
        generation: Generation,
        source_image_name: Optional[str] = None,
        mask_image_name: Optional[str] = None,
    ) -> dict:
        """Prepare workflow with generation parameters."""
        import copy

        gen_type = generation.generation_type or "txt2img"

        # Choose workflow based on generation type
        if gen_type == "upscale":
            return self._prepare_upscale_workflow(generation, source_image_name)

        if gen_type == "inpaint":
            workflow = copy.deepcopy(self._load_workflow("inpaint_sdxl"))
            # Source image (LoadImage node 1)
            workflow["1"]["inputs"]["image"] = source_image_name
            # Mask image (LoadImage node 2)
            workflow["2"]["inputs"]["image"] = mask_image_name
            # VAEEncodeForInpaint (node 10) - grow_mask_by
            workflow["10"]["inputs"]["grow_mask_by"] = generation.grow_mask_by or 24
            # KSampler denoise (node 3)
            workflow["3"]["inputs"]["denoise"] = generation.denoising_strength or 0.85

        elif gen_type == "outpaint":
            workflow = copy.deepcopy(self._load_workflow("outpaint_sdxl"))
            # Source image (LoadImage node 1)
            workflow["1"]["inputs"]["image"] = source_image_name
            # ImagePadForOutpaint (node 2) - set padding amounts
            workflow["2"]["inputs"]["left"] = generation.outpaint_left or 0
            workflow["2"]["inputs"]["top"] = generation.outpaint_top or 0
            workflow["2"]["inputs"]["right"] = generation.outpaint_right or 0
            workflow["2"]["inputs"]["bottom"] = generation.outpaint_bottom or 0
            workflow["2"]["inputs"]["feathering"] = generation.outpaint_feather or 80
            # VAEEncodeForInpaint (node 10) - grow_mask_by
            workflow["10"]["inputs"]["grow_mask_by"] = generation.grow_mask_by or 24
            # KSampler denoise (node 3)
            workflow["3"]["inputs"]["denoise"] = generation.denoising_strength or 0.95

        else:
            # txt2img - default
            if generation.workflow_id:
                workflow_template = self.db.query(WorkflowTemplate).filter(
                    WorkflowTemplate.id == generation.workflow_id
                ).first()
                if workflow_template:
                    workflow = copy.deepcopy(workflow_template.workflow_json)
                else:
                    workflow = copy.deepcopy(self._load_workflow("txt2img_sdxl"))
            else:
                workflow = copy.deepcopy(self._load_workflow("txt2img_sdxl"))

            # Empty Latent Image (dimensions) - only for txt2img
            for node_id, node in workflow.items():
                if isinstance(node, dict) and node.get("class_type") == "EmptyLatentImage":
                    node["inputs"]["width"] = generation.width
                    node["inputs"]["height"] = generation.height
                    break

        # Common settings for all workflows (except upscale which returns early)

        # Positive prompt (CLIPTextEncode) - node 6
        if "6" in workflow and workflow["6"].get("class_type") == "CLIPTextEncode":
            workflow["6"]["inputs"]["text"] = generation.prompt

        # Negative prompt (CLIPTextEncode) - node 7
        if "7" in workflow and workflow["7"].get("class_type") == "CLIPTextEncode":
            workflow["7"]["inputs"]["text"] = generation.negative_prompt or ""

        # KSampler settings - node 3
        if "3" in workflow and workflow["3"].get("class_type") == "KSampler":
            workflow["3"]["inputs"]["seed"] = generation.seed
            workflow["3"]["inputs"]["steps"] = generation.steps
            workflow["3"]["inputs"]["cfg"] = generation.cfg_scale
            workflow["3"]["inputs"]["sampler_name"] = generation.sampler

        # Inject model filename if specified
        if generation.model_filename:
            for node in workflow.values():
                if isinstance(node, dict) and node.get("class_type") == "CheckpointLoaderSimple":
                    node["inputs"]["ckpt_name"] = generation.model_filename
                    break

        # Inject LoRA filename if specified
        if generation.lora_filename:
            for node in workflow.values():
                if isinstance(node, dict) and "LoraLoader" in node.get("class_type", ""):
                    node["inputs"]["lora_name"] = generation.lora_filename
                    break

        return workflow

    def _prepare_upscale_workflow(
        self,
        generation: Generation,
        source_image_name: str,
    ) -> dict:
        """Prepare upscale workflow."""
        import copy

        workflow = copy.deepcopy(self._load_workflow("upscale_realesrgan"))

        # Source image (LoadImage node 1)
        workflow["1"]["inputs"]["image"] = source_image_name

        # Upscale model (node 2)
        if generation.upscale_model:
            workflow["2"]["inputs"]["model_name"] = generation.upscale_model

        # Sharpening (node 4) - alpha controls sharpening strength
        sharpen_amount = generation.sharpen_amount or 0.0
        workflow["4"]["inputs"]["alpha"] = sharpen_amount

        return workflow


async def process_generation_job(job: Job):
    """Process a generation job."""
    import asyncio
    from app.database import get_db_session

    generation_id = job.params["generation_id"]

    # Retry settings for model loading race condition
    max_retries = 3
    retry_delay = 2.0

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

            # For inpainting/upscaling/outpainting, upload source image to ComfyUI
            source_image_name = None
            mask_image_name = None
            gen_type = generation.generation_type or "txt2img"

            if gen_type in ("inpaint", "upscale", "outpaint"):
                # Get source generation image
                source_gen = db.query(Generation).filter(
                    Generation.id == generation.source_generation_id
                ).first()
                if not source_gen or not source_gen.image_path:
                    raise ValueError("Source generation image not found")

                # Read source image and upload to ComfyUI
                storage_path = Path(settings.storage_path)
                source_path = storage_path / source_gen.image_path
                with open(source_path, "rb") as f:
                    source_data = f.read()
                source_image_name = await comfyui_client.upload_image(
                    source_data, f"{generation_id}_source.webp"
                )

                # For inpainting, also upload the mask
                if gen_type == "inpaint":
                    if not generation.mask_path:
                        raise ValueError("Mask image not found")

                    mask_path = storage_path / generation.mask_path
                    with open(mask_path, "rb") as f:
                        mask_data = f.read()
                    mask_image_name = await comfyui_client.upload_image(
                        mask_data, f"{generation_id}_mask.png"
                    )

            # Prepare workflow - need a service instance for this
            service = GenerationService(db)
            workflow = service._prepare_workflow(generation, source_image_name, mask_image_name)

            # Retry loop for transient ComfyUI errors (e.g., model not loaded yet)
            result = None
            for attempt in range(max_retries):
                # Submit to ComfyUI
                prompt_id = await comfyui_client.submit_workflow(workflow)
                generation.comfyui_prompt_id = prompt_id
                db.commit()

                # Wait for completion
                result = await comfyui_client.wait_for_completion(prompt_id)

                # Check if it's a retryable error (model not loaded yet)
                if result.status == "failed" and result.error:
                    error_lower = result.error.lower()
                    is_model_loading_error = (
                        "clip input is invalid" in error_lower
                        or "none" in error_lower
                    )
                    if is_model_loading_error and attempt < max_retries - 1:
                        await asyncio.sleep(retry_delay)
                        continue
                break

            if result.status == "completed" and result.images:
                # Download and save image
                img_info = result.images[0]
                image_bytes = await comfyui_client.get_image(
                    img_info["filename"],
                    img_info.get("subfolder", ""),
                )

                # Save image
                storage_path = Path(settings.storage_path)
                images_path = storage_path / "images"
                images_path.mkdir(parents=True, exist_ok=True)

                image_filename = f"{generation_id}.webp"
                image_path = images_path / image_filename
                with open(image_path, "wb") as f:
                    f.write(image_bytes)

                # Create thumbnail with LANCZOS resampling for quality
                thumb_filename = f"{generation_id}_thumb.webp"
                thumb_path = images_path / thumb_filename
                img = Image.open(io.BytesIO(image_bytes))
                img.thumbnail((256, 256), Image.Resampling.LANCZOS)
                img.save(thumb_path, "WEBP", quality=80)

                # Clean up ComfyUI output file
                comfyui_output_path = storage_path / "comfyui-output"
                subfolder = img_info.get("subfolder", "")
                if subfolder:
                    comfyui_file = comfyui_output_path / subfolder / img_info["filename"]
                else:
                    comfyui_file = comfyui_output_path / img_info["filename"]
                if comfyui_file.exists():
                    comfyui_file.unlink()

                # Update generation
                generation.image_path = f"images/{image_filename}"
                generation.thumbnail_path = f"images/{thumb_filename}"
                generation.status = GenerationStatus.COMPLETED
                generation.completed_at = datetime.utcnow()
                db.commit()

                await event_bus.publish("generation.completed", {
                    "id": generation_id,
                    "status": "completed",
                    "image_path": generation.image_path,
                })

                # Auto-animate check for txt2img generations
                if generation.generation_type == "txt2img":
                    service = GenerationService(db)
                    await service.maybe_auto_animate(generation.portfolio_id)
            else:
                generation.status = GenerationStatus.FAILED
                generation.error_message = result.error or "Unknown error"
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
