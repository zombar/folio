from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


GenerationType = Literal["txt2img", "inpaint", "upscale", "outpaint"]


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
    quantity: int = Field(default=1, ge=1, le=25)
    # Generation type
    generation_type: GenerationType = "txt2img"
    source_generation_id: Optional[str] = None
    # Inpainting fields
    mask_image_base64: Optional[str] = None
    denoising_strength: Optional[float] = None
    grow_mask_by: Optional[int] = None
    # Upscaling fields
    upscale_factor: Optional[float] = None
    upscale_model: Optional[str] = None
    sharpen_amount: Optional[float] = None
    # Outpainting fields
    outpaint_left: Optional[int] = None
    outpaint_right: Optional[int] = None
    outpaint_top: Optional[int] = None
    outpaint_bottom: Optional[int] = None
    outpaint_feather: Optional[int] = None


class GenerationResponse(BaseModel):
    id: str
    portfolio_id: str
    generation_type: str
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
    source_generation_id: Optional[str]
    workflow_id: Optional[str]
    model_filename: Optional[str]
    lora_filename: Optional[str]
    # Inpainting fields
    mask_path: Optional[str]
    denoising_strength: Optional[float]
    grow_mask_by: Optional[int]
    # Upscaling fields
    upscale_factor: Optional[float]
    upscale_model: Optional[str]
    sharpen_amount: Optional[float]
    # Outpainting fields
    outpaint_left: Optional[int]
    outpaint_right: Optional[int]
    outpaint_top: Optional[int]
    outpaint_bottom: Optional[int]
    outpaint_feather: Optional[int]
    # Timestamps
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True
