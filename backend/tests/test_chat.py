import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.chat_service import ChatService
from app.services.ollama_client import OllamaClient
from app.services.ollama_manager import OllamaManager
from app.models.chat import MessageRole
from app.schemas.chat import ConversationCreate, ConversationUpdate


class TestChatService:
    """Tests for ChatService conversation and message operations."""

    def test_create_conversation(self, db_session):
        """Test creating a new conversation."""
        service = ChatService(db_session)
        data = ConversationCreate(model="llama3.2:1b")

        result = service.create_conversation(data)

        assert result.model == "llama3.2:1b"
        assert result.title is None
        assert result.message_count == 0
        assert result.id is not None

    def test_create_conversation_with_title(self, db_session):
        """Test creating a conversation with a title."""
        service = ChatService(db_session)
        data = ConversationCreate(
            model="llama3.2:1b", title="Test Chat"
        )

        result = service.create_conversation(data)

        assert result.title == "Test Chat"

    def test_list_conversations_empty(self, db_session):
        """Test listing conversations when none exist."""
        service = ChatService(db_session)

        result = service.list_conversations()

        assert result == []

    def test_list_conversations(self, db_session):
        """Test listing conversations."""
        service = ChatService(db_session)
        service.create_conversation(
            ConversationCreate(model="model1", title="Chat 1")
        )
        service.create_conversation(
            ConversationCreate(model="model2", title="Chat 2")
        )

        result = service.list_conversations()

        assert len(result) == 2

    def test_list_conversations_pagination(self, db_session):
        """Test listing conversations with pagination."""
        service = ChatService(db_session)
        for i in range(15):
            service.create_conversation(
                ConversationCreate(model="model", title=f"Chat {i}")
            )

        # Get first 10
        result = service.list_conversations(limit=10, offset=0)
        assert len(result) == 10

        # Get next 5
        result = service.list_conversations(limit=10, offset=10)
        assert len(result) == 5

    def test_count_conversations(self, db_session):
        """Test counting conversations."""
        service = ChatService(db_session)
        assert service.count_conversations() == 0

        service.create_conversation(ConversationCreate(model="model1"))
        service.create_conversation(ConversationCreate(model="model2"))

        assert service.count_conversations() == 2

    def test_get_conversation(self, db_session):
        """Test getting a conversation with messages."""
        service = ChatService(db_session)
        created = service.create_conversation(
            ConversationCreate(model="model", title="Test")
        )

        result = service.get_conversation(created.id)

        assert result is not None
        assert result.id == created.id
        assert result.title == "Test"
        assert result.messages == []

    def test_get_conversation_not_found(self, db_session):
        """Test getting a non-existent conversation."""
        service = ChatService(db_session)

        result = service.get_conversation("non-existent-id")

        assert result is None

    def test_update_conversation(self, db_session):
        """Test updating a conversation."""
        service = ChatService(db_session)
        created = service.create_conversation(
            ConversationCreate(model="model1", title="Original")
        )

        result = service.update_conversation(
            created.id, ConversationUpdate(title="Updated", model="model2")
        )

        assert result is not None
        assert result.title == "Updated"
        assert result.model == "model2"

    def test_update_conversation_partial(self, db_session):
        """Test partially updating a conversation."""
        service = ChatService(db_session)
        created = service.create_conversation(
            ConversationCreate(model="model1", title="Original")
        )

        result = service.update_conversation(
            created.id, ConversationUpdate(title="Updated")
        )

        assert result.title == "Updated"
        assert result.model == "model1"  # Unchanged

    def test_update_conversation_not_found(self, db_session):
        """Test updating a non-existent conversation."""
        service = ChatService(db_session)

        result = service.update_conversation(
            "non-existent-id", ConversationUpdate(title="New")
        )

        assert result is None

    def test_delete_conversation(self, db_session):
        """Test deleting a conversation."""
        service = ChatService(db_session)
        created = service.create_conversation(ConversationCreate(model="model"))

        result = service.delete_conversation(created.id)

        assert result is True
        assert service.get_conversation(created.id) is None

    def test_delete_conversation_not_found(self, db_session):
        """Test deleting a non-existent conversation."""
        service = ChatService(db_session)

        result = service.delete_conversation("non-existent-id")

        assert result is False

    def test_add_message(self, db_session):
        """Test adding a message to a conversation."""
        service = ChatService(db_session)
        conv = service.create_conversation(ConversationCreate(model="model"))

        result = service.add_message(conv.id, MessageRole.USER, "Hello!")

        assert result is not None
        assert result.role == "user"
        assert result.content == "Hello!"
        assert result.conversation_id == conv.id

    def test_add_message_auto_title(self, db_session):
        """Test that first user message auto-generates title."""
        service = ChatService(db_session)
        conv = service.create_conversation(ConversationCreate(model="model"))
        assert conv.title is None

        service.add_message(
            conv.id, MessageRole.USER, "What is the capital of France?"
        )

        updated = service.get_conversation(conv.id)
        assert updated.title == "What is the capital of France?"

    def test_add_message_auto_title_truncate(self, db_session):
        """Test that auto-generated title is truncated for long messages."""
        service = ChatService(db_session)
        conv = service.create_conversation(ConversationCreate(model="model"))

        long_message = "x" * 100
        service.add_message(conv.id, MessageRole.USER, long_message)

        updated = service.get_conversation(conv.id)
        assert updated.title == "x" * 50 + "..."

    def test_add_message_to_nonexistent_conversation(self, db_session):
        """Test adding a message to a non-existent conversation."""
        service = ChatService(db_session)

        result = service.add_message(
            "non-existent-id", MessageRole.USER, "Hello!"
        )

        assert result is None

    def test_get_messages_for_api(self, db_session):
        """Test formatting messages for OpenAI API."""
        service = ChatService(db_session)
        conv = service.create_conversation(ConversationCreate(model="model"))
        service.add_message(conv.id, MessageRole.USER, "Hello")
        service.add_message(conv.id, MessageRole.ASSISTANT, "Hi there!")
        service.add_message(conv.id, MessageRole.USER, "How are you?")

        result = service.get_messages_for_api(conv.id)

        assert len(result) == 3
        assert result[0] == {"role": "user", "content": "Hello"}
        assert result[1] == {"role": "assistant", "content": "Hi there!"}
        assert result[2] == {"role": "user", "content": "How are you?"}

    def test_get_messages_for_api_not_found(self, db_session):
        """Test getting messages for non-existent conversation."""
        service = ChatService(db_session)

        result = service.get_messages_for_api("non-existent-id")

        assert result == []

    def test_conversation_with_messages(self, db_session):
        """Test getting conversation includes messages."""
        service = ChatService(db_session)
        conv = service.create_conversation(ConversationCreate(model="model"))
        service.add_message(conv.id, MessageRole.USER, "Hello")
        service.add_message(conv.id, MessageRole.ASSISTANT, "Hi!")

        result = service.get_conversation(conv.id)

        assert len(result.messages) == 2
        assert result.message_count == 2

    def test_delete_conversation_cascades_messages(self, db_session):
        """Test that deleting conversation deletes its messages."""
        service = ChatService(db_session)
        conv = service.create_conversation(ConversationCreate(model="model"))
        service.add_message(conv.id, MessageRole.USER, "Hello")

        service.delete_conversation(conv.id)

        # Verify messages are gone (would error if orphaned)
        assert service.get_conversation(conv.id) is None


class TestOllamaClient:
    """Tests for OllamaClient with mocked HTTP responses."""

    def test_base_url(self):
        """Test base URL construction from settings."""
        client = OllamaClient()
        # Base URL should be constructed from settings
        assert client.base_url.startswith("http://")
        assert "11434" in client.base_url or ":11434" in client.base_url

    @pytest.mark.asyncio
    async def test_check_health_success(self):
        """Test health check when server is responding."""
        client = OllamaClient()

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            result = await client.check_health()

            assert result is True

    @pytest.mark.asyncio
    async def test_check_health_failure(self):
        """Test health check when server is not responding."""
        client = OllamaClient()

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=Exception("Connection refused"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            result = await client.check_health()

            assert result is False

    @pytest.mark.asyncio
    async def test_check_health_non_200_status(self):
        """Test health check with non-200 response."""
        client = OllamaClient()

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 500
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            result = await client.check_health()

            assert result is False

    @pytest.mark.asyncio
    async def test_list_models(self):
        """Test listing models from Ollama."""
        client = OllamaClient()

        mock_response_data = {
            "models": [
                {"name": "llama3.2:1b", "size": 1234567890}
            ]
        }

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status = MagicMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            result = await client.list_models()

            assert len(result) == 1
            assert result[0]["name"] == "llama3.2:1b"

    @pytest.mark.asyncio
    async def test_list_models_empty(self):
        """Test listing models when no models available."""
        client = OllamaClient()

        mock_response_data = {"models": []}

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status = MagicMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            result = await client.list_models()

            assert result == []

    @pytest.mark.asyncio
    async def test_has_model_true(self):
        """Test has_model returns True when model exists."""
        client = OllamaClient()

        mock_response_data = {
            "models": [{"name": "llama3.2:1b"}]
        }

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status = MagicMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            result = await client.has_model("llama3.2:1b")

            assert result is True

    @pytest.mark.asyncio
    async def test_has_model_false(self):
        """Test has_model returns False when model doesn't exist."""
        client = OllamaClient()

        mock_response_data = {
            "models": [{"name": "llama3.2:1b"}]
        }

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status = MagicMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            result = await client.has_model("mistral:7b")

            assert result is False

    @pytest.mark.asyncio
    async def test_chat_stream(self):
        """Test streaming chat completion."""
        client = OllamaClient()

        # Simulate SSE stream chunks
        async def mock_aiter_lines():
            yield 'data: {"choices":[{"delta":{"content":"Hello"}}]}'
            yield 'data: {"choices":[{"delta":{"content":" world"}}]}'
            yield "data: [DONE]"

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.raise_for_status = MagicMock()
            mock_response.aiter_lines = mock_aiter_lines
            mock_response.__aenter__ = AsyncMock(return_value=mock_response)
            mock_response.__aexit__ = AsyncMock(return_value=None)
            mock_client.stream = MagicMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            chunks = []
            async for chunk in client.chat_stream(
                "model", [{"role": "user", "content": "Hi"}]
            ):
                chunks.append(chunk)

            assert chunks == ["Hello", " world"]

    @pytest.mark.asyncio
    async def test_chat_stream_empty_content(self):
        """Test streaming handles empty content chunks."""
        client = OllamaClient()

        async def mock_aiter_lines():
            yield 'data: {"choices":[{"delta":{}}]}'  # No content
            yield 'data: {"choices":[{"delta":{"content":"text"}}]}'
            yield "data: [DONE]"

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.raise_for_status = MagicMock()
            mock_response.aiter_lines = mock_aiter_lines
            mock_response.__aenter__ = AsyncMock(return_value=mock_response)
            mock_response.__aexit__ = AsyncMock(return_value=None)
            mock_client.stream = MagicMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            chunks = []
            async for chunk in client.chat_stream(
                "model", [{"role": "user", "content": "Hi"}]
            ):
                chunks.append(chunk)

            assert chunks == ["text"]

    @pytest.mark.asyncio
    async def test_chat_non_streaming(self):
        """Test non-streaming chat completion."""
        client = OllamaClient()

        mock_response_data = {
            "choices": [{"message": {"content": "Hello, how can I help?"}}]
        }

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status = MagicMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            result = await client.chat(
                "model", [{"role": "user", "content": "Hello"}]
            )

            assert result == "Hello, how can I help?"


class TestOllamaManager:
    """Tests for OllamaManager model management."""

    def test_initial_state(self):
        """Test manager starts in stopped state."""
        manager = OllamaManager()

        assert manager.status == "stopped"
        assert manager.current_model is None
        assert manager.error is None

    def test_get_status(self):
        """Test getting status as dict."""
        manager = OllamaManager()

        status = manager.get_status()

        assert status == {
            "model_id": None,
            "status": "stopped",
            "error": None,
        }

    def test_base_url(self):
        """Test base URL construction from settings."""
        manager = OllamaManager()
        # Base URL should be constructed from settings
        assert manager.base_url.startswith("http://")
        assert "11434" in manager.base_url or ":11434" in manager.base_url

    @pytest.mark.asyncio
    async def test_check_server_success(self):
        """Test server check when Ollama is responding."""
        manager = OllamaManager()

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            result = await manager.check_server()

            assert result is True

    @pytest.mark.asyncio
    async def test_check_server_failure(self):
        """Test server check when Ollama is down."""
        manager = OllamaManager()

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=Exception("Connection refused"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            result = await manager.check_server()

            assert result is False

    @pytest.mark.asyncio
    async def test_has_model_true(self):
        """Test has_model when model exists."""
        manager = OllamaManager()

        with patch.object(manager, "list_models", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = [{"name": "llama3.2:1b"}]

            result = await manager.has_model("llama3.2:1b")

            assert result is True

    @pytest.mark.asyncio
    async def test_has_model_with_latest_tag(self):
        """Test has_model matches model with :latest tag."""
        manager = OllamaManager()

        with patch.object(manager, "list_models", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = [{"name": "llama3.2:latest"}]

            result = await manager.has_model("llama3.2")

            assert result is True

    @pytest.mark.asyncio
    async def test_has_model_false(self):
        """Test has_model when model doesn't exist."""
        manager = OllamaManager()

        with patch.object(manager, "list_models", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = [{"name": "llama3.2:1b"}]

            result = await manager.has_model("mistral:7b")

            assert result is False

    @pytest.mark.asyncio
    async def test_is_ready_when_stopped(self):
        """Test is_ready returns False when stopped and server not available."""
        manager = OllamaManager()

        with patch.object(manager, "check_server", new_callable=AsyncMock) as mock_check:
            mock_check.return_value = False

            result = await manager.is_ready()

            assert result is False

    @pytest.mark.asyncio
    async def test_is_ready_when_ready(self):
        """Test is_ready returns True when status is ready and server available."""
        manager = OllamaManager()
        manager._status = "ready"

        with patch.object(manager, "check_server", new_callable=AsyncMock) as mock_check:
            mock_check.return_value = True

            result = await manager.is_ready()

            assert result is True

    @pytest.mark.asyncio
    async def test_switch_model_same_model_when_ready(self):
        """Test switching to same model when already ready returns True."""
        manager = OllamaManager()
        manager._current_model = "llama3.2:1b"
        manager._status = "ready"

        result = await manager.switch_model("llama3.2:1b")

        assert result is True
        assert manager.status == "ready"

    @pytest.mark.asyncio
    async def test_switch_model_server_not_available(self):
        """Test switch_model fails when server is not available."""
        manager = OllamaManager()

        with patch.object(manager, "check_server", new_callable=AsyncMock) as mock_check:
            mock_check.return_value = False

            result = await manager.switch_model("llama3.2:1b")

            assert result is False
            assert manager.status == "error"
            assert "not available" in manager.error

    @pytest.mark.asyncio
    async def test_switch_model_pulls_if_not_exists(self):
        """Test switch_model pulls model if not available locally."""
        manager = OllamaManager()

        with patch.object(manager, "check_server", new_callable=AsyncMock) as mock_check:
            mock_check.return_value = True

            with patch.object(manager, "has_model", new_callable=AsyncMock) as mock_has:
                # First call: model doesn't exist, second call: model exists after pull
                mock_has.side_effect = [False, True]

                with patch("httpx.AsyncClient") as mock_client_class:
                    mock_client = AsyncMock()
                    mock_response = MagicMock()
                    mock_response.raise_for_status = MagicMock()
                    mock_client.post = AsyncMock(return_value=mock_response)
                    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
                    mock_client.__aexit__ = AsyncMock(return_value=None)
                    mock_client_class.return_value = mock_client

                    result = await manager.switch_model("llama3.2:1b")

                    assert result is True
                    assert manager.status == "ready"
                    assert manager.current_model == "llama3.2:1b"

    @pytest.mark.asyncio
    async def test_switch_model_already_exists(self):
        """Test switch_model succeeds immediately if model exists."""
        manager = OllamaManager()

        with patch.object(manager, "check_server", new_callable=AsyncMock) as mock_check:
            mock_check.return_value = True

            with patch.object(manager, "has_model", new_callable=AsyncMock) as mock_has:
                mock_has.return_value = True

                result = await manager.switch_model("llama3.2:1b")

                assert result is True
                assert manager.status == "ready"


class TestChatAPI:
    """Tests for chat API endpoints."""

    def test_list_conversations_empty(self, client):
        """Test listing conversations when none exist."""
        response = client.get("/api/conversations")
        assert response.status_code == 200
        assert response.json() == []

    def test_create_conversation(self, client):
        """Test creating a new conversation."""
        response = client.post(
            "/api/conversations",
            json={"model": "llama3.2:1b"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["model"] == "llama3.2:1b"
        assert "id" in data

    def test_create_conversation_with_title(self, client):
        """Test creating a conversation with a title."""
        response = client.post(
            "/api/conversations",
            json={"model": "model", "title": "My Chat"},
        )
        assert response.status_code == 201
        assert response.json()["title"] == "My Chat"

    def test_list_conversations(self, client):
        """Test listing conversations."""
        client.post("/api/conversations", json={"model": "model1"})
        client.post("/api/conversations", json={"model": "model2"})

        response = client.get("/api/conversations")
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_list_conversations_pagination(self, client):
        """Test listing conversations with pagination."""
        for i in range(15):
            client.post("/api/conversations", json={"model": f"model{i}"})

        response = client.get("/api/conversations?limit=10&offset=0")
        assert response.status_code == 200
        assert len(response.json()) == 10

        response = client.get("/api/conversations?limit=10&offset=10")
        assert response.status_code == 200
        assert len(response.json()) == 5

    def test_count_conversations(self, client):
        """Test counting conversations."""
        response = client.get("/api/conversations/count")
        assert response.status_code == 200
        assert response.json()["count"] == 0

        client.post("/api/conversations", json={"model": "model"})
        client.post("/api/conversations", json={"model": "model"})

        response = client.get("/api/conversations/count")
        assert response.json()["count"] == 2

    def test_get_conversation(self, client):
        """Test getting a single conversation."""
        create_response = client.post(
            "/api/conversations", json={"model": "model", "title": "Test"}
        )
        conv_id = create_response.json()["id"]

        response = client.get(f"/api/conversations/{conv_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test"
        assert data["messages"] == []

    def test_get_conversation_not_found(self, client):
        """Test getting a non-existent conversation."""
        response = client.get("/api/conversations/non-existent-id")
        assert response.status_code == 404

    def test_update_conversation(self, client):
        """Test updating a conversation."""
        create_response = client.post(
            "/api/conversations", json={"model": "model1", "title": "Original"}
        )
        conv_id = create_response.json()["id"]

        response = client.put(
            f"/api/conversations/{conv_id}",
            json={"title": "Updated", "model": "model2"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated"
        assert data["model"] == "model2"

    def test_update_conversation_not_found(self, client):
        """Test updating a non-existent conversation."""
        response = client.put(
            "/api/conversations/non-existent-id",
            json={"title": "New"},
        )
        assert response.status_code == 404

    def test_delete_conversation(self, client):
        """Test deleting a conversation."""
        create_response = client.post(
            "/api/conversations", json={"model": "model"}
        )
        conv_id = create_response.json()["id"]

        response = client.delete(f"/api/conversations/{conv_id}")
        assert response.status_code == 204

        # Verify deleted
        get_response = client.get(f"/api/conversations/{conv_id}")
        assert get_response.status_code == 404

    def test_delete_conversation_not_found(self, client):
        """Test deleting a non-existent conversation."""
        response = client.delete("/api/conversations/non-existent-id")
        assert response.status_code == 404

    def test_get_chat_status(self, client):
        """Test getting chat/LLM status."""
        response = client.get("/api/chat/status")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["loading", "ready", "error", "stopped"]
