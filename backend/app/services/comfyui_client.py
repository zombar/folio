import logging
import httpx
import asyncio
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class JobResult:
    """Result of a ComfyUI job."""
    prompt_id: str
    status: str  # "completed" | "failed"
    images: List[Dict[str, str]]  # [{"filename": "...", "subfolder": "..."}]
    error: Optional[str] = None


class ComfyUIClient:
    """HTTP client for ComfyUI API."""

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or settings.comfyui_url
        self._client: Optional[httpx.AsyncClient] = None
        logger.info("ComfyUI client initialized with base_url=%s", self.base_url)

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=300.0)
        return self._client

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None

    async def submit_workflow(self, workflow: Dict[str, Any]) -> str:
        """Submit a workflow to ComfyUI. Returns prompt_id."""
        logger.info("Submitting workflow to ComfyUI at %s/prompt", self.base_url)
        client = await self._get_client()
        try:
            response = await client.post(
                f"{self.base_url}/prompt",
                json={"prompt": workflow}
            )
            response.raise_for_status()
            data = response.json()
            prompt_id = data["prompt_id"]
            logger.info("Workflow submitted successfully, prompt_id=%s", prompt_id)
            return prompt_id
        except httpx.HTTPStatusError as e:
            body = e.response.text[:500] if e.response else "no body"
            logger.error("ComfyUI rejected workflow: status=%s body=%s", e.response.status_code, body)
            raise
        except Exception as e:
            logger.error("Failed to submit workflow to ComfyUI: %s", e)
            raise

    async def get_history(self, prompt_id: str) -> Optional[Dict[str, Any]]:
        """Get the history/status for a prompt."""
        client = await self._get_client()
        try:
            response = await client.get(f"{self.base_url}/history/{prompt_id}")
            response.raise_for_status()
            data = response.json()
            return data.get(prompt_id)
        except Exception as e:
            logger.error("Failed to get history for prompt_id=%s: %s", prompt_id, e)
            raise

    async def wait_for_completion(
        self,
        prompt_id: str,
        timeout: float = 300.0,
        poll_interval: float = 0.5,
    ) -> JobResult:
        """Poll until job completes."""
        logger.info("Waiting for completion of prompt_id=%s (timeout=%.0fs)", prompt_id, timeout)
        elapsed = 0.0
        last_log = 0.0

        while elapsed < timeout:
            history = await self.get_history(prompt_id)

            if history:
                status = history.get("status", {})

                # Log progress periodically
                if elapsed - last_log >= 10.0:
                    logger.info("Still waiting for prompt_id=%s (%.0fs elapsed, status=%s)",
                                prompt_id, elapsed, status.get("status_str", "unknown"))
                    last_log = elapsed

                # Check for completion
                if status.get("completed", False):
                    outputs = history.get("outputs", {})
                    images = self._extract_images(outputs)
                    logger.info("Prompt %s completed successfully, %d images", prompt_id, len(images))
                    return JobResult(
                        prompt_id=prompt_id,
                        status="completed",
                        images=images,
                    )

                # Check for errors
                if status.get("status_str") == "error":
                    messages = status.get("messages", [])
                    error_msg = "Unknown error"
                    # Find the execution_error message
                    for msg in messages:
                        if msg[0] == "execution_error" and len(msg) > 1:
                            error_data = msg[1]
                            error_msg = error_data.get("exception_message", str(error_data))
                            break
                    logger.error("Prompt %s failed in ComfyUI: %s", prompt_id, error_msg)
                    return JobResult(
                        prompt_id=prompt_id,
                        status="failed",
                        images=[],
                        error=error_msg,
                    )

            await asyncio.sleep(poll_interval)
            elapsed += poll_interval

        logger.error("Prompt %s timed out after %.0fs", prompt_id, timeout)
        return JobResult(
            prompt_id=prompt_id,
            status="failed",
            images=[],
            error="Timeout waiting for completion",
        )

    def _extract_images(self, outputs: Dict[str, Any]) -> List[Dict[str, str]]:
        """Extract image info from ComfyUI outputs."""
        images = []
        for node_id, node_output in outputs.items():
            if "images" in node_output:
                for img in node_output["images"]:
                    images.append({
                        "filename": img.get("filename", ""),
                        "subfolder": img.get("subfolder", ""),
                        "type": img.get("type", "output"),
                    })
        return images

    async def get_image(
        self, filename: str, subfolder: str = "", folder_type: str = "output"
    ) -> bytes:
        """Download an image from ComfyUI."""
        logger.info("Downloading image %s (subfolder=%s) from ComfyUI", filename, subfolder)
        client = await self._get_client()
        params = {
            "filename": filename,
            "subfolder": subfolder,
            "type": folder_type,
        }
        try:
            response = await client.get(f"{self.base_url}/view", params=params)
            response.raise_for_status()
            logger.info("Downloaded image %s (%d bytes)", filename, len(response.content))
            return response.content
        except Exception as e:
            logger.error("Failed to download image %s: %s", filename, e)
            raise

    async def get_object_info(self) -> Dict[str, Any]:
        """Get ComfyUI object info (available nodes and their inputs including model lists)."""
        logger.debug("Fetching object_info from ComfyUI")
        client = await self._get_client()
        try:
            response = await client.get(f"{self.base_url}/object_info")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("Failed to fetch object_info from ComfyUI: %s", e)
            raise

    async def get_system_stats(self) -> Dict[str, Any]:
        """Get ComfyUI system stats."""
        client = await self._get_client()
        response = await client.get(f"{self.base_url}/system_stats")
        response.raise_for_status()
        return response.json()

    async def upload_image(self, image_data: bytes, filename: str) -> str:
        """Upload an image to ComfyUI input folder. Returns the filename to use in workflows."""
        import mimetypes
        logger.info("Uploading image %s (%d bytes) to ComfyUI", filename, len(image_data))

        content_type = mimetypes.guess_type(filename)[0] or "image/png"
        files = {"image": (filename, image_data, content_type)}

        client = await self._get_client()
        try:
            response = await client.post(f"{self.base_url}/upload/image", files=files)
            response.raise_for_status()
            result = response.json()
            logger.info("Image uploaded to ComfyUI as %s", result.get("name"))
            return result["name"]
        except Exception as e:
            logger.error("Failed to upload image %s to ComfyUI: %s", filename, e)
            raise

    async def interrupt(self) -> bool:
        """Interrupt the currently running job. Returns True if successful."""
        try:
            client = await self._get_client()
            response = await client.post(f"{self.base_url}/interrupt")
            response.raise_for_status()
            logger.info("Interrupted current ComfyUI job")
            return True
        except Exception as e:
            logger.error("Failed to interrupt ComfyUI job: %s", e)
            return False


# Global client instance
comfyui_client = ComfyUIClient()
