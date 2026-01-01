import asyncio
import subprocess
import signal
import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class SGLangManager:
    """Manages the SGLang server process lifecycle."""

    def __init__(self):
        self._process: Optional[subprocess.Popen] = None
        self._current_model: Optional[str] = None
        self._status: str = "stopped"
        self._error: Optional[str] = None
        self._lock = asyncio.Lock()

    @property
    def base_url(self) -> str:
        return f"http://{settings.sglang_host}:{settings.sglang_port}"

    @property
    def current_model(self) -> Optional[str]:
        return self._current_model

    @property
    def status(self) -> str:
        return self._status

    @property
    def error(self) -> Optional[str]:
        return self._error

    async def start_server(self, model_id: str) -> bool:
        """Start SGLang server with the specified model."""
        async with self._lock:
            if self._process is not None:
                await self._stop_server_internal()

            self._status = "loading"
            self._error = None
            self._current_model = model_id

            try:
                cmd = [
                    "python",
                    "-m",
                    "sglang.launch_server",
                    "--model-path",
                    model_id,
                    "--port",
                    str(settings.sglang_port),
                    "--host",
                    settings.sglang_host,
                ]

                if settings.hf_token:
                    cmd.extend(["--env", f"HF_TOKEN={settings.hf_token}"])

                logger.info(f"Starting SGLang server with model: {model_id}")
                self._process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    preexec_fn=lambda: signal.signal(signal.SIGINT, signal.SIG_IGN),
                )

                # Wait for server to be ready
                if await self._wait_for_ready():
                    self._status = "ready"
                    logger.info(f"SGLang server ready with model: {model_id}")
                    return True
                else:
                    self._status = "error"
                    self._error = "Server failed to start within timeout"
                    await self._stop_server_internal()
                    return False

            except Exception as e:
                logger.error(f"Failed to start SGLang server: {e}")
                self._status = "error"
                self._error = str(e)
                return False

    async def _wait_for_ready(self, timeout: int = 300, interval: float = 2.0) -> bool:
        """Wait for the server to be ready."""
        elapsed = 0.0
        while elapsed < timeout:
            if self._process is None or self._process.poll() is not None:
                # Process died
                if self._process:
                    stderr = self._process.stderr.read().decode() if self._process.stderr else ""
                    self._error = stderr[:500] if stderr else "Process exited unexpectedly"
                return False

            if await self._check_health():
                return True

            await asyncio.sleep(interval)
            elapsed += interval

        return False

    async def _check_health(self) -> bool:
        """Check if the server is responding."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/v1/models")
                return response.status_code == 200
        except Exception:
            return False

    async def stop_server(self) -> None:
        """Stop the SGLang server."""
        async with self._lock:
            await self._stop_server_internal()

    async def _stop_server_internal(self) -> None:
        """Internal method to stop server (must be called with lock held)."""
        if self._process is not None:
            logger.info("Stopping SGLang server")
            try:
                self._process.terminate()
                try:
                    self._process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    self._process.kill()
                    self._process.wait()
            except Exception as e:
                logger.error(f"Error stopping SGLang server: {e}")
            finally:
                self._process = None
                self._current_model = None
                self._status = "stopped"
                self._error = None

    async def switch_model(self, model_id: str) -> bool:
        """Switch to a different model by restarting the server."""
        if model_id == self._current_model and self._status == "ready":
            return True
        return await self.start_server(model_id)

    async def is_ready(self) -> bool:
        """Check if server is ready to handle requests."""
        if self._status != "ready":
            return False
        return await self._check_health()

    def get_status(self) -> dict:
        """Get current status as a dict."""
        return {
            "model_id": self._current_model,
            "status": self._status,
            "error": self._error,
        }


# Global singleton instance
sglang_manager = SGLangManager()
