from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.portfolio import PortfolioCreate, PortfolioUpdate, PortfolioResponse
from app.schemas.generation import GenerationResponse
from app.services.portfolio_service import PortfolioService
from app.services.generation_service import GenerationService

router = APIRouter()


def get_portfolio_service(db: Session = Depends(get_db)) -> PortfolioService:
    return PortfolioService(db)


@router.get("/portfolios", response_model=List[PortfolioResponse])
async def list_portfolios(service: PortfolioService = Depends(get_portfolio_service)):
    """List all portfolios."""
    return service.list_all()


@router.post("/portfolios", response_model=PortfolioResponse, status_code=201)
async def create_portfolio(
    data: PortfolioCreate,
    service: PortfolioService = Depends(get_portfolio_service),
):
    """Create a new portfolio."""
    return service.create(data)


@router.get("/portfolios/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(
    portfolio_id: str,
    service: PortfolioService = Depends(get_portfolio_service),
):
    """Get a portfolio by ID."""
    portfolio = service.get(portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


@router.put("/portfolios/{portfolio_id}", response_model=PortfolioResponse)
async def update_portfolio(
    portfolio_id: str,
    data: PortfolioUpdate,
    service: PortfolioService = Depends(get_portfolio_service),
):
    """Update a portfolio."""
    portfolio = service.update(portfolio_id, data)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


@router.delete("/portfolios/{portfolio_id}", status_code=204)
async def delete_portfolio(
    portfolio_id: str,
    service: PortfolioService = Depends(get_portfolio_service),
):
    """Delete a portfolio."""
    success = service.delete(portfolio_id)
    if not success:
        raise HTTPException(status_code=404, detail="Portfolio not found")


def get_generation_service(db: Session = Depends(get_db)) -> GenerationService:
    return GenerationService(db)


@router.get("/portfolios/{portfolio_id}/animations", response_model=List[GenerationResponse])
async def list_portfolio_animations(
    portfolio_id: str,
    service: GenerationService = Depends(get_generation_service),
):
    """List all completed animations for a portfolio."""
    return service.list_animations(portfolio_id)
