from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class GenerationCreate(BaseModel):
    portfolio_id: str
    prompt: str
    negative_prompt: Optional[str] = None
    width: int = 1024
    height: int = 1024
    seed: Optional[int] = None
    steps: int = 30
    cfg_scale: float = 7.0
    sampler: str = "euler"
    workflow_id: Optional[str] = None
    model_filename: Optional[str] = None
    lora_filename: Optional[str] = None


class GenerationResponse(BaseModel):
    id: str
    portfolio_id: str
    prompt: str
    negative_prompt: Optional[str]
    width: int
    height: int
    seed: Optional[int]
    steps: int
    cfg_scale: float
    sampler: str
    status: str
    progress: int
    error_message: Optional[str]
    image_path: Optional[str]
    thumbnail_path: Optional[str]
    parent_id: Optional[str]
    workflow_id: Optional[str]
    model_filename: Optional[str]
    lora_filename: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True
