from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    role: Literal["user", "assistant", "system"]
    content: str
    created_at: datetime


class ConversationCreate(BaseModel):
    model: str
    title: Optional[str] = None


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    model: Optional[str] = None


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: Optional[str]
    model: str
    created_at: datetime
    updated_at: datetime
    message_count: int


class ConversationWithMessages(ConversationResponse):
    messages: List[MessageResponse]


class ChatRequest(BaseModel):
    message: str


class ModelStatus(BaseModel):
    model_id: Optional[str]
    status: Literal["loading", "ready", "error", "stopped"]
    error: Optional[str] = None
    progress: Optional[float] = None  # Download progress 0-100
    progress_status: Optional[str] = None  # e.g., "downloading", "verifying"


class SwitchModelRequest(BaseModel):
    model_id: str
