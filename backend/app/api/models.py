import logging
from fastapi import APIRouter, Query
from typing import List, Optional
from pydantic import BaseModel

from app.services.comfyui_client import comfyui_client

logger = logging.getLogger(__name__)

router = APIRouter()


class ModelInfo(BaseModel):
    """Information about a model file."""

    filename: str
    path: str
    type: str  # "checkpoint" or "lora"
    size: int  # File size in bytes (0 when fetched from remote)


@router.get("/models", response_model=List[ModelInfo])
async def list_models(
    model_type: Optional[str] = Query(
        None, description="Filter by model type: 'checkpoint' or 'lora'"
    ),
) -> List[ModelInfo]:
    """
    List available models by querying the remote ComfyUI instance.
    """
    models = []

    try:
        object_info = await comfyui_client.get_object_info()

        if model_type is None or model_type == "checkpoint":
            checkpoints = _extract_model_names(object_info, "CheckpointLoaderSimple", "ckpt_name")
            models.extend(
                ModelInfo(filename=name, path=f"checkpoints/{name}", type="checkpoint", size=0)
                for name in checkpoints
            )

        if model_type is None or model_type == "lora":
            loras = _extract_model_names(object_info, "LoraLoader", "lora_name")
            models.extend(
                ModelInfo(filename=name, path=f"loras/{name}", type="lora", size=0)
                for name in loras
            )
    except Exception as e:
        logger.warning(f"Failed to fetch models from ComfyUI: {e}")
        return []

    models.sort(key=lambda m: m.filename.lower())
    return models


def _extract_model_names(object_info: dict, node_class: str, input_name: str) -> List[str]:
    """Extract model names from ComfyUI object_info response."""
    try:
        node = object_info.get(node_class, {})
        inputs = node.get("input", {}).get("required", {})
        options = inputs.get(input_name, [[]])[0]
        return list(options) if isinstance(options, (list, tuple)) else []
    except (KeyError, IndexError, TypeError):
        return []
