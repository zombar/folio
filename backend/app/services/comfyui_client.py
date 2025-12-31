import httpx
import asyncio
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from pathlib import Path

from app.config import settings


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
        client = await self._get_client()
        response = await client.post(
            f"{self.base_url}/prompt",
            json={"prompt": workflow}
        )
        response.raise_for_status()
        data = response.json()
        return data["prompt_id"]

    async def get_history(self, prompt_id: str) -> Optional[Dict[str, Any]]:
        """Get the history/status for a prompt."""
        client = await self._get_client()
        response = await client.get(f"{self.base_url}/history/{prompt_id}")
        response.raise_for_status()
        data = response.json()
        return data.get(prompt_id)

    async def wait_for_completion(
        self,
        prompt_id: str,
        timeout: float = 300.0,
        poll_interval: float = 0.5,
    ) -> JobResult:
        """Poll until job completes."""
        elapsed = 0.0

        while elapsed < timeout:
            history = await self.get_history(prompt_id)

            if history:
                status = history.get("status", {})

                # Check for completion
                if status.get("completed", False):
                    outputs = history.get("outputs", {})
                    images = self._extract_images(outputs)
                    return JobResult(
                        prompt_id=prompt_id,
                        status="completed",
                        images=images,
                    )

                # Check for errors
                if status.get("status_str") == "error":
                    messages = status.get("messages", [])
                    error_msg = messages[0][1] if messages else "Unknown error"
                    return JobResult(
                        prompt_id=prompt_id,
                        status="failed",
                        images=[],
                        error=error_msg,
                    )

            await asyncio.sleep(poll_interval)
            elapsed += poll_interval

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

    async def get_image(self, filename: str, subfolder: str = "", folder_type: str = "output") -> bytes:
        """Download an image from ComfyUI."""
        client = await self._get_client()
        params = {
            "filename": filename,
            "subfolder": subfolder,
            "type": folder_type,
        }
        response = await client.get(f"{self.base_url}/view", params=params)
        response.raise_for_status()
        return response.content

    async def get_system_stats(self) -> Dict[str, Any]:
        """Get ComfyUI system stats."""
        client = await self._get_client()
        response = await client.get(f"{self.base_url}/system_stats")
        response.raise_for_status()
        return response.json()


# Global client instance
comfyui_client = ComfyUIClient()
