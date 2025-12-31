from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class WorkflowCreate(BaseModel):
    """Schema for creating a workflow template."""

    name: str
    description: Optional[str] = None
    workflow_json: Dict[str, Any]
    category: Optional[str] = None


class WorkflowUpdate(BaseModel):
    """Schema for updating a workflow template."""

    name: Optional[str] = None
    description: Optional[str] = None
    workflow_json: Optional[Dict[str, Any]] = None
    category: Optional[str] = None


class WorkflowResponse(BaseModel):
    """Schema for workflow template response."""

    id: str
    name: str
    description: Optional[str]
    workflow_json: Dict[str, Any]
    category: Optional[str]
    is_builtin: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
