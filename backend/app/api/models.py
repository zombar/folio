from fastapi import APIRouter, Query
from typing import List, Optional
from pathlib import Path
from pydantic import BaseModel

from app.config import settings


router = APIRouter()


class ModelInfo(BaseModel):
    """Information about a model file."""

    filename: str
    path: str
    type: str  # "checkpoint" or "lora"
    size: int  # File size in bytes


# Valid model file extensions
CHECKPOINT_EXTENSIONS = {".safetensors", ".ckpt", ".pt"}
LORA_EXTENSIONS = {".safetensors", ".pt"}


def scan_models_directory(
    base_path: Path, model_type: str, extensions: set
) -> List[ModelInfo]:
    """Scan a directory for model files."""
    models = []
    dir_path = base_path / (
        "checkpoints" if model_type == "checkpoint" else "loras"
    )

    if not dir_path.exists():
        return models

    for file_path in dir_path.rglob("*"):
        if file_path.is_file() and file_path.suffix.lower() in extensions:
            relative_path = file_path.relative_to(base_path)
            models.append(
                ModelInfo(
                    filename=file_path.name,
                    path=str(relative_path),
                    type=model_type,
                    size=file_path.stat().st_size,
                )
            )

    return models


@router.get("/models", response_model=List[ModelInfo])
async def list_models(
    model_type: Optional[str] = Query(
        None, description="Filter by model type: 'checkpoint' or 'lora'"
    ),
) -> List[ModelInfo]:
    """
    List available models by scanning the models directory.

    The models directory should have the following structure:
    - models/checkpoints/ - SDXL, SD1.5, etc. (.safetensors, .ckpt)
    - models/loras/ - LoRA models (.safetensors)
    """
    models_path = Path(settings.models_path)
    models = []

    if model_type is None or model_type == "checkpoint":
        models.extend(
            scan_models_directory(models_path, "checkpoint", CHECKPOINT_EXTENSIONS)
        )

    if model_type is None or model_type == "lora":
        models.extend(scan_models_directory(models_path, "lora", LORA_EXTENSIONS))

    # Sort by filename
    models.sort(key=lambda m: m.filename.lower())

    return models
