from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, JSON, Enum as SQLEnum
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


class Generation(Base):
    __tablename__ = "generations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    portfolio_id = Column(String(36), ForeignKey("portfolios.id"), nullable=False)

    # Generation parameters
    prompt = Column(Text, nullable=False)
    negative_prompt = Column(Text, nullable=True)
    width = Column(Integer, default=1024)
    height = Column(Integer, default=1024)
    seed = Column(Integer, nullable=True)
    steps = Column(Integer, default=30)
    cfg_scale = Column(Float, default=7.0)
    sampler = Column(String(50), default="euler")

    # Status
    status = Column(SQLEnum(GenerationStatus), default=GenerationStatus.PENDING)
    progress = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)

    # Output
    image_path = Column(String(500), nullable=True)
    thumbnail_path = Column(String(500), nullable=True)

    # Iteration
    parent_id = Column(String(36), ForeignKey("generations.id"), nullable=True)

    # Model/Workflow selection
    workflow_id = Column(String(36), nullable=True)
    model_filename = Column(String(500), nullable=True)
    lora_filename = Column(String(500), nullable=True)

    # ComfyUI tracking
    comfyui_prompt_id = Column(String(100), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    portfolio = relationship("Portfolio", back_populates="generations")
    parent = relationship("Generation", remote_side=[id], backref="iterations")

    def to_dict(self):
        return {
            "id": self.id,
            "portfolio_id": self.portfolio_id,
            "prompt": self.prompt,
            "negative_prompt": self.negative_prompt,
            "width": self.width,
            "height": self.height,
            "seed": self.seed,
            "steps": self.steps,
            "cfg_scale": self.cfg_scale,
            "sampler": self.sampler,
            "status": self.status.value if self.status else None,
            "progress": self.progress,
            "error_message": self.error_message,
            "image_path": self.image_path,
            "thumbnail_path": self.thumbnail_path,
            "parent_id": self.parent_id,
            "workflow_id": self.workflow_id,
            "model_filename": self.model_filename,
            "lora_filename": self.lora_filename,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
