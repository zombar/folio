import asyncio
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass


@dataclass
class Job:
    """A generation job."""
    id: str
    params: Dict[str, Any]


class JobQueue:
    """In-process asyncio job queue."""

    def __init__(self):
        self._queue: asyncio.Queue[Job] = asyncio.Queue()
        self._worker_task: Optional[asyncio.Task] = None
        self._processor: Optional[Callable] = None
        self._running = False

    async def enqueue(self, job: Job):
        """Add a job to the queue."""
        await self._queue.put(job)

    async def dequeue(self) -> Job:
        """Get the next job from the queue."""
        return await self._queue.get()

    def set_processor(self, processor: Callable):
        """Set the job processor function."""
        self._processor = processor

    async def start_worker(self):
        """Start the background worker."""
        if self._running:
            return

        self._running = True
        self._worker_task = asyncio.create_task(self._worker_loop())

    async def stop_worker(self):
        """Stop the background worker."""
        self._running = False
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass

    async def _worker_loop(self):
        """Background worker that processes jobs."""
        while self._running:
            try:
                job = await asyncio.wait_for(self.dequeue(), timeout=1.0)
                if self._processor:
                    await self._processor(job)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                print(f"Job processing error: {e}")

    @property
    def size(self) -> int:
        """Get the number of jobs in the queue."""
        return self._queue.qsize()


# Global job queue instance
job_queue = JobQueue()
