from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path

from app.database import get_db
from app.config import settings
from app.models.generation import Generation

router = APIRouter()


@router.get("/images/{generation_id}")
async def get_image(generation_id: str, db: Session = Depends(get_db)):
    """Get the full image for a generation."""
    generation = db.query(Generation).filter(Generation.id == generation_id).first()
    if not generation:
        raise HTTPException(status_code=404, detail="Generation not found")

    if not generation.image_path:
        raise HTTPException(status_code=404, detail="Image not available")

    image_path = Path(settings.storage_path) / generation.image_path
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found")

    return FileResponse(image_path, media_type="image/webp")


@router.get("/images/{generation_id}/thumbnail")
async def get_thumbnail(generation_id: str, db: Session = Depends(get_db)):
    """Get the thumbnail for a generation."""
    generation = db.query(Generation).filter(Generation.id == generation_id).first()
    if not generation:
        raise HTTPException(status_code=404, detail="Generation not found")

    if not generation.thumbnail_path:
        raise HTTPException(status_code=404, detail="Thumbnail not available")

    thumbnail_path = Path(settings.storage_path) / generation.thumbnail_path
    if not thumbnail_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail file not found")

    return FileResponse(thumbnail_path, media_type="image/webp")
