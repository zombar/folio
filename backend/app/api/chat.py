from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import json

from app.database import get_db
from app.schemas.chat import (
    ConversationCreate,
    ConversationUpdate,
    ConversationResponse,
    ConversationWithMessages,
    ChatRequest,
    ModelStatus,
    SwitchModelRequest,
    SetupRequest,
    SetupStatus,
)
from app.services.chat_service import ChatService
from app.services.sglang_manager import sglang_manager
from app.services.sglang_client import sglang_client
from app.models.chat import MessageRole
from app.config import settings
import os
from pathlib import Path

router = APIRouter()


def get_chat_service(db: Session = Depends(get_db)) -> ChatService:
    return ChatService(db)


# SGLang status and model management
@router.get("/chat/status", response_model=ModelStatus)
async def get_chat_status():
    """Get current SGLang/LLM status."""
    return ModelStatus(**sglang_manager.get_status())


@router.post("/chat/model", response_model=ModelStatus)
async def switch_model(data: SwitchModelRequest):
    """Switch to a different model (restarts SGLang server)."""
    success = await sglang_manager.switch_model(data.model_id)
    if not success:
        raise HTTPException(
            status_code=503,
            detail=sglang_manager.error or "Failed to switch model",
        )
    return ModelStatus(**sglang_manager.get_status())


# Setup endpoints
@router.get("/chat/setup", response_model=SetupStatus)
async def get_setup_status():
    """Get current setup status (HF token, model ready)."""
    hf_token_set = bool(settings.hf_token or os.environ.get("HF_TOKEN"))
    return SetupStatus(
        hf_token_set=hf_token_set,
        default_model=settings.default_model,
        status=sglang_manager.status,
    )


@router.post("/chat/setup", response_model=SetupStatus)
async def setup_chat(data: SetupRequest):
    """
    Save HF token and start the default model.

    The token is saved to .env file and the SGLang server
    is started with the default model (downloading if needed).
    """
    # Save token to .env file in data directory
    env_file = Path(settings.storage_path).parent / "data" / ".env"
    env_file.parent.mkdir(parents=True, exist_ok=True)

    # Read existing .env or create new
    env_content = {}
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and "=" in line and not line.startswith("#"):
                    key, value = line.split("=", 1)
                    env_content[key] = value

    # Update HF_TOKEN
    env_content["HF_TOKEN"] = data.hf_token

    # Write back
    with open(env_file, "w") as f:
        for key, value in env_content.items():
            f.write(f"{key}={value}\n")

    # Set in current environment and settings
    os.environ["HF_TOKEN"] = data.hf_token
    settings.hf_token = data.hf_token

    # Start SGLang with the default model (will download if needed)
    await sglang_manager.start_server(settings.default_model)

    return SetupStatus(
        hf_token_set=True,
        default_model=settings.default_model,
        status=sglang_manager.status,
    )


# Conversation CRUD
@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    limit: int = 10,
    offset: int = 0,
    service: ChatService = Depends(get_chat_service),
):
    """List conversations with pagination."""
    return service.list_conversations(limit=limit, offset=offset)


@router.get("/conversations/count")
async def count_conversations(
    service: ChatService = Depends(get_chat_service),
):
    """Get total conversation count."""
    return {"count": service.count_conversations()}


@router.post("/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(
    data: ConversationCreate,
    service: ChatService = Depends(get_chat_service),
):
    """Create a new conversation."""
    return service.create_conversation(data)


@router.get("/conversations/{conversation_id}", response_model=ConversationWithMessages)
async def get_conversation(
    conversation_id: str,
    service: ChatService = Depends(get_chat_service),
):
    """Get a conversation with all messages."""
    conversation = service.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.put("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    data: ConversationUpdate,
    service: ChatService = Depends(get_chat_service),
):
    """Update a conversation."""
    conversation = service.update_conversation(conversation_id, data)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: str,
    service: ChatService = Depends(get_chat_service),
):
    """Delete a conversation."""
    success = service.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")


# Chat streaming endpoint
@router.post("/conversations/{conversation_id}/chat")
async def chat(
    conversation_id: str,
    data: ChatRequest,
    db: Session = Depends(get_db),
):
    """Stream a chat response using SSE."""
    service = ChatService(db)

    # Verify conversation exists
    conversation = service.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if SGLang is ready
    if not await sglang_manager.is_ready():
        raise HTTPException(status_code=503, detail="LLM server is not ready")

    # Add user message
    service.add_message(conversation_id, MessageRole.USER, data.message)

    # Get all messages for context
    messages = service.get_messages_for_api(conversation_id)

    async def generate():
        full_response = ""
        try:
            async for chunk in sglang_client.chat_stream(
                model=conversation.model,
                messages=messages,
            ):
                full_response += chunk
                yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"

            # Save assistant response to database
            from app.database import SessionLocal

            with SessionLocal() as new_db:
                new_service = ChatService(new_db)
                new_service.add_message(
                    conversation_id, MessageRole.ASSISTANT, full_response
                )

            yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
