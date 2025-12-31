from fastapi import APIRouter
import httpx

from app.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    """Check backend and ComfyUI health status."""
    comfyui_status = "unknown"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.comfyui_url}/system_stats")
            if response.status_code == 200:
                comfyui_status = "healthy"
            else:
                comfyui_status = "unhealthy"
    except Exception:
        comfyui_status = "unreachable"

    return {
        "status": "healthy",
        "comfyui": comfyui_status,
    }
