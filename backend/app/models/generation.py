from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.database import Base


class GenerationStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class GenerationType(str, enum.Enum):
    TXT2IMG = "txt2img"
    INPAINT = "inpaint"
    UPSCALE = "upscale"
    OUTPAINT = "outpaint"
    ANIMATE = "animate"


class Generation(Base):
    __tablename__ = "generations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    portfolio_id = Column(String(36), ForeignKey("portfolios.id"), nullable=False)

    # Generation type
    generation_type = Column(String(20), default="txt2img")

    # Generation parameters
    prompt = Column(Text, nullable=False)
    negative_prompt = Column(Text, nullable=True)
    width = Column(Integer, default=1024)
    height = Column(Integer, default=1024)
    seed = Column(Integer, nullable=True)
    steps = Column(Integer, default=30)
    cfg_scale = Column(Float, default=5.5)
    sampler = Column(String(50), default="dpmpp_2m")
    scheduler = Column(String(50), default="karras")

    # Status
    status = Column(SQLEnum(GenerationStatus), default=GenerationStatus.PENDING)
    progress = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)

    # Output
    image_path = Column(String(500), nullable=True)
    thumbnail_path = Column(String(500), nullable=True)

    # Iteration (for variations)
    parent_id = Column(String(36), ForeignKey("generations.id"), nullable=True)

    # Source generation (for inpaint/upscale/outpaint)
    source_generation_id = Column(String(36), ForeignKey("generations.id"), nullable=True)

    # Model/Workflow selection
    workflow_id = Column(String(36), nullable=True)
    model_filename = Column(String(500), nullable=True)
    lora_filename = Column(String(500), nullable=True)

    # Inpainting fields
    mask_path = Column(String(500), nullable=True)
    denoising_strength = Column(Float, nullable=True)
    grow_mask_by = Column(Integer, nullable=True)

    # Upscaling fields
    upscale_factor = Column(Float, nullable=True)
    upscale_model = Column(String(100), nullable=True)
    sharpen_amount = Column(Float, nullable=True)

    # Outpainting fields
    outpaint_left = Column(Integer, nullable=True)
    outpaint_right = Column(Integer, nullable=True)
    outpaint_top = Column(Integer, nullable=True)
    outpaint_bottom = Column(Integer, nullable=True)
    outpaint_feather = Column(Integer, nullable=True)

    # Animation fields
    video_path = Column(String(500), nullable=True)
    motion_bucket_id = Column(Integer, nullable=True)  # SVD motion 1-127
    fps = Column(Integer, nullable=True)
    duration_seconds = Column(Float, nullable=True)

    # ComfyUI tracking
    comfyui_prompt_id = Column(String(100), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    portfolio = relationship("Portfolio", back_populates="generations")
    parent = relationship(
        "Generation", remote_side=[id], backref="iterations", foreign_keys=[parent_id]
    )
    source_generation = relationship(
        "Generation", remote_side=[id], foreign_keys=[source_generation_id]
    )

    def to_dict(self):
        return {
            "id": self.id,
            "portfolio_id": self.portfolio_id,
            "generation_type": self.generation_type,
            "prompt": self.prompt,
            "negative_prompt": self.negative_prompt,
            "width": self.width,
            "height": self.height,
            "seed": self.seed,
            "steps": self.steps,
            "cfg_scale": self.cfg_scale,
            "sampler": self.sampler,
            "scheduler": self.scheduler,
            "status": self.status.value if self.status else None,
            "progress": self.progress,
            "error_message": self.error_message,
            "image_path": self.image_path,
            "thumbnail_path": self.thumbnail_path,
            "parent_id": self.parent_id,
            "source_generation_id": self.source_generation_id,
            "workflow_id": self.workflow_id,
            "model_filename": self.model_filename,
            "lora_filename": self.lora_filename,
            # Inpainting fields
            "mask_path": self.mask_path,
            "denoising_strength": self.denoising_strength,
            "grow_mask_by": self.grow_mask_by,
            # Upscaling fields
            "upscale_factor": self.upscale_factor,
            "upscale_model": self.upscale_model,
            "sharpen_amount": self.sharpen_amount,
            # Outpainting fields
            "outpaint_left": self.outpaint_left,
            "outpaint_right": self.outpaint_right,
            "outpaint_top": self.outpaint_top,
            "outpaint_bottom": self.outpaint_bottom,
            "outpaint_feather": self.outpaint_feather,
            # Animation fields
            "video_path": self.video_path,
            "motion_bucket_id": self.motion_bucket_id,
            "fps": self.fps,
            "duration_seconds": self.duration_seconds,
            # Timestamps
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
