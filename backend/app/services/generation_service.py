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
from app.services.job_queue import job_queue, Job
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

        # Create generation record
        generation = Generation(
            portfolio_id=data.portfolio_id,
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
            status=GenerationStatus.PENDING,
        )
        self.db.add(generation)
        self.db.commit()
        self.db.refresh(generation)

        # Prepare workflow
        workflow = self._prepare_workflow(generation)

        # Create job
        job = Job(
            id=generation.id,
            params={
                "workflow": workflow,
                "generation_id": generation.id,
            }
        )

        # Enqueue job
        await job_queue.enqueue(job)

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

    def _prepare_workflow(self, generation: Generation) -> dict:
        """Prepare workflow with generation parameters."""
        # Load workflow from database or file
        if generation.workflow_id:
            workflow_template = self.db.query(WorkflowTemplate).filter(
                WorkflowTemplate.id == generation.workflow_id
            ).first()
            if workflow_template:
                import copy
                workflow = copy.deepcopy(workflow_template.workflow_json)
            else:
                workflow = self._load_workflow("txt2img_sdxl")
        else:
            workflow = self._load_workflow("txt2img_sdxl")

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

        # Inject generation parameters
        # Find nodes by class_type to be more robust
        for node_id, node in workflow.items():
            if not isinstance(node, dict):
                continue
            class_type = node.get("class_type", "")

            if class_type == "CLIPTextEncode":
                # Check if this is positive or negative prompt based on connection
                # Node 6 is typically positive, node 7 is typically negative
                if node_id == "6":
                    node["inputs"]["text"] = generation.prompt
                elif node_id == "7":
                    node["inputs"]["text"] = generation.negative_prompt or ""

            elif class_type == "KSampler":
                node["inputs"]["seed"] = generation.seed
                node["inputs"]["steps"] = generation.steps
                node["inputs"]["cfg"] = generation.cfg_scale
                node["inputs"]["sampler_name"] = generation.sampler

            elif class_type == "EmptyLatentImage":
                node["inputs"]["width"] = generation.width
                node["inputs"]["height"] = generation.height

        return workflow


async def process_generation_job(job: Job):
    """Process a generation job."""
    import asyncio
    from app.database import get_db_session

    generation_id = job.params["generation_id"]
    workflow = job.params["workflow"]

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

                # Create thumbnail
                thumb_filename = f"{generation_id}_thumb.webp"
                thumb_path = images_path / thumb_filename
                img = Image.open(io.BytesIO(image_bytes))
                img.thumbnail((256, 256))
                img.save(thumb_path, "WEBP", quality=80)

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
