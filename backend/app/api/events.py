from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
import asyncio

from app.services.event_bus import event_bus

router = APIRouter()


@router.get("/events/stream")
async def event_stream():
    """SSE endpoint for real-time event updates."""

    async def generate():
        queue = asyncio.Queue()
        subscriber_id = event_bus.subscribe(queue)

        try:
            # Send initial connection event
            yield {"event": "connected", "data": "{}"}

            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield {
                        "event": event["type"],
                        "data": event["data"],
                    }
                except asyncio.TimeoutError:
                    # Send keepalive
                    yield {"event": "ping", "data": "{}"}
        finally:
            event_bus.unsubscribe(subscriber_id)

    return EventSourceResponse(generate())
