import asyncio
import json
import uuid
from typing import Dict, Any


class EventBus:
    """In-memory event bus for real-time updates."""

    def __init__(self):
        self._subscribers: Dict[str, asyncio.Queue] = {}

    def subscribe(self, queue: asyncio.Queue) -> str:
        """Subscribe to events. Returns subscriber ID."""
        subscriber_id = str(uuid.uuid4())
        self._subscribers[subscriber_id] = queue
        return subscriber_id

    def unsubscribe(self, subscriber_id: str):
        """Unsubscribe from events."""
        self._subscribers.pop(subscriber_id, None)

    async def publish(self, event_type: str, data: Dict[str, Any]):
        """Publish an event to all subscribers."""
        event = {
            "type": event_type,
            "data": json.dumps(data),
        }

        # Send to all subscribers
        for queue in list(self._subscribers.values()):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                pass  # Skip if queue is full


# Global event bus instance
event_bus = EventBus()
