import asyncio
import json
import logging
from typing import Optional, AsyncGenerator, Dict, Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class OllamaManager:
    """Manages Ollama model state and operations."""

    def __init__(self):
        self._current_model: Optional[str] = None
        self._status: str = "stopped"
        self._error: Optional[str] = None
        self._lock = asyncio.Lock()

    @property
    def base_url(self) -> str:
        return f"http://{settings.ollama_host}:{settings.ollama_port}"

    @property
    def current_model(self) -> Optional[str]:
        return self._current_model

    @property
    def status(self) -> str:
        return self._status

    @property
    def error(self) -> Optional[str]:
        return self._error

    async def check_server(self) -> bool:
        """Check if Ollama server is responding."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> list:
        """List available models."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                data = response.json()
                return data.get("models", [])
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            return []

    async def has_model(self, model: str) -> bool:
        """Check if a model is available locally."""
        try:
            models = await self.list_models()
            model_names = [m.get("name", "") for m in models]
            # Check exact match or match with default tag
            return (
                model in model_names
                or f"{model}:latest" in model_names
                or any(m.split(":")[0] == model.split(":")[0] for m in model_names)
            )
        except Exception:
            return False

    async def pull_model(
        self, model: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Pull a model from Ollama registry. Yields progress updates."""
        async with self._lock:
            self._status = "loading"
            self._error = None
            self._current_model = model

        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/pull",
                    json={"name": model, "stream": True},
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if line:
                            try:
                                data = json.loads(line)
                                yield data
                                # Check for completion
                                if data.get("status") == "success":
                                    async with self._lock:
                                        self._status = "ready"
                            except json.JSONDecodeError:
                                continue

            # Verify model was pulled successfully
            if await self.has_model(model):
                async with self._lock:
                    self._status = "ready"
                logger.info(f"Model {model} pulled successfully")
            else:
                async with self._lock:
                    self._status = "error"
                    self._error = "Model pull completed but model not found"

        except Exception as e:
            logger.error(f"Failed to pull model {model}: {e}")
            async with self._lock:
                self._status = "error"
                self._error = str(e)
            raise

    async def switch_model(self, model_id: str) -> bool:
        """Switch to a different model, pulling if necessary."""
        async with self._lock:
            # If already using this model and ready, no change needed
            if model_id == self._current_model and self._status == "ready":
                return True

            self._status = "loading"
            self._error = None
            self._current_model = model_id

        try:
            # Check if server is available
            if not await self.check_server():
                async with self._lock:
                    self._status = "error"
                    self._error = "Ollama server not available"
                return False

            # Check if model exists, if not pull it
            if not await self.has_model(model_id):
                logger.info(f"Model {model_id} not found locally, pulling...")
                # Pull the model (non-streaming for switch)
                async with httpx.AsyncClient(timeout=None) as client:
                    response = await client.post(
                        f"{self.base_url}/api/pull",
                        json={"name": model_id, "stream": False},
                        timeout=None,
                    )
                    response.raise_for_status()

            # Verify model is available
            if await self.has_model(model_id):
                async with self._lock:
                    self._status = "ready"
                logger.info(f"Switched to model: {model_id}")
                return True
            else:
                async with self._lock:
                    self._status = "error"
                    self._error = "Model not available after pull"
                return False

        except Exception as e:
            logger.error(f"Failed to switch model: {e}")
            async with self._lock:
                self._status = "error"
                self._error = str(e)
            return False

    async def is_ready(self) -> bool:
        """Check if manager is ready to handle requests."""
        if self._status != "ready":
            # Try to check if we can reach the server and have a model
            if await self.check_server():
                if self._current_model and await self.has_model(self._current_model):
                    async with self._lock:
                        self._status = "ready"
                    return True
            return False
        return await self.check_server()

    def get_status(self) -> dict:
        """Get current status as a dict."""
        return {
            "model_id": self._current_model,
            "status": self._status,
            "error": self._error,
        }


# Global singleton instance
ollama_manager = OllamaManager()
