from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.chat import Conversation, Message, MessageRole
from app.schemas.chat import (
    ConversationCreate,
    ConversationUpdate,
    ConversationResponse,
    ConversationWithMessages,
    MessageResponse,
)


class ChatService:
    """Service for chat/conversation operations."""

    def __init__(self, db: Session):
        self.db = db

    def list_conversations(
        self, limit: int = 10, offset: int = 0
    ) -> List[ConversationResponse]:
        """List conversations, ordered by most recent."""
        conversations = (
            self.db.query(Conversation)
            .order_by(Conversation.updated_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return [ConversationResponse(**c.to_dict()) for c in conversations]

    def count_conversations(self) -> int:
        """Count total conversations."""
        return self.db.query(Conversation).count()

    def get_conversation(
        self, conversation_id: str
    ) -> Optional[ConversationWithMessages]:
        """Get a conversation with all messages."""
        conversation = (
            self.db.query(Conversation)
            .filter(Conversation.id == conversation_id)
            .first()
        )
        if not conversation:
            return None

        messages = [MessageResponse(**m.to_dict()) for m in conversation.messages]
        return ConversationWithMessages(**conversation.to_dict(), messages=messages)

    def create_conversation(self, data: ConversationCreate) -> ConversationResponse:
        """Create a new conversation."""
        conversation = Conversation(
            model=data.model,
            title=data.title,
        )
        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)
        return ConversationResponse(**conversation.to_dict())

    def update_conversation(
        self, conversation_id: str, data: ConversationUpdate
    ) -> Optional[ConversationResponse]:
        """Update a conversation."""
        conversation = (
            self.db.query(Conversation)
            .filter(Conversation.id == conversation_id)
            .first()
        )
        if not conversation:
            return None

        if data.title is not None:
            conversation.title = data.title
        if data.model is not None:
            conversation.model = data.model

        self.db.commit()
        self.db.refresh(conversation)
        return ConversationResponse(**conversation.to_dict())

    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation and all its messages."""
        conversation = (
            self.db.query(Conversation)
            .filter(Conversation.id == conversation_id)
            .first()
        )
        if not conversation:
            return False

        self.db.delete(conversation)
        self.db.commit()
        return True

    def add_message(
        self, conversation_id: str, role: MessageRole, content: str
    ) -> Optional[MessageResponse]:
        """Add a message to a conversation."""
        conversation = (
            self.db.query(Conversation)
            .filter(Conversation.id == conversation_id)
            .first()
        )
        if not conversation:
            return None

        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
        )
        self.db.add(message)

        # Auto-generate title from first user message if not set
        if not conversation.title and role == MessageRole.USER:
            conversation.title = content[:50] + ("..." if len(content) > 50 else "")

        self.db.commit()
        self.db.refresh(message)
        return MessageResponse(**message.to_dict())

    def get_messages_for_api(self, conversation_id: str) -> List[dict]:
        """Get messages formatted for OpenAI-compatible API."""
        conversation = (
            self.db.query(Conversation)
            .filter(Conversation.id == conversation_id)
            .first()
        )
        if not conversation:
            return []

        return [
            {"role": m.role.value, "content": m.content} for m in conversation.messages
        ]
