from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PortfolioCreate(BaseModel):
    name: str
    description: Optional[str] = None


class PortfolioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cover_image_id: Optional[str] = None


class PortfolioResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    cover_image_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    image_count: int

    class Config:
        from_attributes = True
