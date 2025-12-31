from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.schemas.generation import GenerationCreate, GenerationResponse
from app.services.generation_service import GenerationService

router = APIRouter()


def get_generation_service(db: Session = Depends(get_db)) -> GenerationService:
    return GenerationService(db)


@router.get("/generations", response_model=List[GenerationResponse])
async def list_generations(
    portfolio_id: Optional[str] = None,
    service: GenerationService = Depends(get_generation_service),
):
    """List generations, optionally filtered by portfolio."""
    return service.list_all(portfolio_id=portfolio_id)


@router.post("/generations", response_model=GenerationResponse, status_code=201)
async def create_generation(
    data: GenerationCreate,
    service: GenerationService = Depends(get_generation_service),
):
    """Create a new image generation job."""
    return await service.create(data)


@router.get("/generations/{generation_id}", response_model=GenerationResponse)
async def get_generation(
    generation_id: str,
    service: GenerationService = Depends(get_generation_service),
):
    """Get a generation by ID."""
    generation = service.get(generation_id)
    if not generation:
        raise HTTPException(status_code=404, detail="Generation not found")
    return generation


@router.delete("/generations/{generation_id}", status_code=204)
async def delete_generation(
    generation_id: str,
    service: GenerationService = Depends(get_generation_service),
):
    """Delete a generation."""
    success = service.delete(generation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Generation not found")


@router.post(
    "/generations/{generation_id}/iterate",
    response_model=GenerationResponse,
    status_code=201,
)
async def iterate_generation(
    generation_id: str,
    service: GenerationService = Depends(get_generation_service),
):
    """Create a variation of an existing generation."""
    generation = await service.iterate(generation_id)
    if not generation:
        raise HTTPException(status_code=404, detail="Generation not found")
    return generation
