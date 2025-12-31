from sqlalchemy import Column, String, Text, DateTime, Boolean, JSON
from datetime import datetime
import uuid

from app.database import Base


class WorkflowTemplate(Base):
    """Workflow template for ComfyUI workflows."""

    __tablename__ = "workflow_templates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    workflow_json = Column(JSON, nullable=False)
    category = Column(String(100), nullable=True)  # txt2img, img2img, inpaint, etc.
    is_builtin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "workflow_json": self.workflow_json,
            "category": self.category,
            "is_builtin": self.is_builtin,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
