from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.portfolio import Portfolio
from app.schemas.portfolio import PortfolioCreate, PortfolioUpdate, PortfolioResponse


class PortfolioService:
    """Service for portfolio operations."""

    def __init__(self, db: Session):
        self.db = db

    def list_all(self) -> List[PortfolioResponse]:
        """List all portfolios."""
        portfolios = self.db.query(Portfolio).order_by(Portfolio.updated_at.desc()).all()
        return [PortfolioResponse(**p.to_dict()) for p in portfolios]

    def get(self, portfolio_id: str) -> Optional[PortfolioResponse]:
        """Get a portfolio by ID."""
        portfolio = self.db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
        if not portfolio:
            return None
        return PortfolioResponse(**portfolio.to_dict())

    def create(self, data: PortfolioCreate) -> PortfolioResponse:
        """Create a new portfolio."""
        portfolio = Portfolio(
            name=data.name,
            description=data.description,
        )
        self.db.add(portfolio)
        self.db.commit()
        self.db.refresh(portfolio)
        return PortfolioResponse(**portfolio.to_dict())

    def update(self, portfolio_id: str, data: PortfolioUpdate) -> Optional[PortfolioResponse]:
        """Update a portfolio."""
        portfolio = self.db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
        if not portfolio:
            return None

        if data.name is not None:
            portfolio.name = data.name
        if data.description is not None:
            portfolio.description = data.description
        if data.cover_image_id is not None:
            portfolio.cover_image_id = data.cover_image_id

        self.db.commit()
        self.db.refresh(portfolio)
        return PortfolioResponse(**portfolio.to_dict())

    def delete(self, portfolio_id: str) -> bool:
        """Delete a portfolio."""
        portfolio = self.db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
        if not portfolio:
            return False

        self.db.delete(portfolio)
        self.db.commit()
        return True
