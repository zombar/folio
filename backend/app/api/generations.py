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
    """Create a new image generation job. If quantity > 1, creates multiple jobs."""
    first_generation = None
    for i in range(data.quantity):
        # Create a copy of data with seed=None for variations after the first
        if i == 0:
            generation = await service.create(data)
            first_generation = generation
        else:
            # Create variation with different seed
            variation_data = data.model_copy()
            variation_data.seed = None  # Let each variation get a random seed
            await service.create(variation_data)
    return first_generation


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
