"""Priority job queue with Write-Ahead Log (WAL) persistence."""
import asyncio
import json
import os
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, Any, Optional, Callable, List


class JobPriority(str, Enum):
    """Job priority levels for queue ordering."""
    CRITICAL = "critical"  # Inpaint/upscale/outpaint - preempts everything
    HIGH = "high"          # txt2img - normal generation
    LOW = "low"            # Future: animations


class JobType(str, Enum):
    """Types of jobs that can be queued."""
    GENERATION = "generation"


@dataclass
class Job:
    """A generation job with priority support."""
    id: str
    job_type: JobType
    priority: JobPriority
    params: Dict[str, Any]
    created_at: str
    preempted_state: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "job_type": self.job_type.value,
            "priority": self.priority.value,
            "params": self.params,
            "created_at": self.created_at,
            "preempted_state": self.preempted_state,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Job":
        """Create Job from dictionary."""
        return cls(
            id=data["id"],
            job_type=JobType(data["job_type"]),
            priority=JobPriority(data["priority"]),
            params=data["params"],
            created_at=data["created_at"],
            preempted_state=data.get("preempted_state"),
        )


class PriorityJobQueue:
    """Priority job queue with Write-Ahead Log persistence.

    Jobs are processed in priority order: CRITICAL > HIGH > preempted > LOW.
    All mutations are immediately persisted to a log file for crash recovery.
    """

    def __init__(self, storage_path: Path):
        """Initialize queue with storage path for WAL file.

        Args:
            storage_path: Directory where queue.log will be stored
        """
        self._storage_path = Path(storage_path)
        self._storage_path.mkdir(parents=True, exist_ok=True)
        self._log_file = self._storage_path / "queue.log"

        # In-memory queues by priority
        self._critical: List[Job] = []
        self._high: List[Job] = []
        self._low: List[Job] = []
        self._preempted: List[Job] = []

        # Current running job
        self._current_job: Optional[Job] = None

        # Worker management (kept for backward compatibility)
        self._worker_task: Optional[asyncio.Task] = None
        self._processor: Optional[Callable] = None
        self._running = False

        # Restore state from log
        self._load_from_log()

    def _append_log(self, entry: Dict[str, Any]) -> None:
        """Append entry to log file with fsync for durability."""
        entry["ts"] = datetime.utcnow().isoformat()
        with open(self._log_file, "a") as f:
            f.write(json.dumps(entry) + "\n")
            f.flush()
            os.fsync(f.fileno())

    def _load_from_log(self) -> None:
        """Replay log to reconstruct queue state."""
        if not self._log_file.exists():
            return

        # Track jobs by ID for replay
        jobs: Dict[str, Job] = {}
        dequeued: set = set()
        completed: set = set()
        preempted_jobs: Dict[str, Dict[str, Any]] = {}  # job_id -> preempted_state
        current_job_id: Optional[str] = None

        with open(self._log_file, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    op = entry.get("op")

                    if op == "enqueue":
                        job = Job.from_dict(entry["job"])
                        jobs[job.id] = job
                    elif op == "dequeue":
                        dequeued.add(entry["job_id"])
                    elif op == "complete":
                        completed.add(entry["job_id"])
                    elif op == "preempt":
                        job_id = entry["job_id"]
                        preempted_jobs[job_id] = entry.get("state")
                    elif op == "set_current":
                        current_job_id = entry["job_id"]
                    elif op == "clear_current":
                        current_job_id = None
                except (json.JSONDecodeError, KeyError):
                    continue

        # Reconstruct queues
        for job_id, job in jobs.items():
            if job_id in completed:
                continue

            # Check if preempted
            if job_id in preempted_jobs:
                job.preempted_state = preempted_jobs[job_id]
                self._preempted.append(job)
            elif job_id in dequeued:
                # Was dequeued but not completed - might have been current job
                if job_id == current_job_id:
                    self._current_job = job
                # Otherwise it's lost (crash during processing)
            else:
                # Still in queue
                if job.priority == JobPriority.CRITICAL:
                    self._critical.append(job)
                elif job.priority == JobPriority.HIGH:
                    self._high.append(job)
                else:
                    self._low.append(job)

    async def enqueue(self, job: Job) -> None:
        """Add a job to the appropriate priority queue."""
        self._append_log({"op": "enqueue", "job": job.to_dict()})

        if job.priority == JobPriority.CRITICAL:
            self._critical.append(job)
        elif job.priority == JobPriority.HIGH:
            self._high.append(job)
        else:
            self._low.append(job)

    async def dequeue(self) -> Optional[Job]:
        """Get the next job by priority: CRITICAL > HIGH > preempted > LOW."""
        job = None

        # Try critical first
        if self._critical:
            job = self._critical.pop(0)
        # Then high
        elif self._high:
            job = self._high.pop(0)
        # Then preempted (resume interrupted jobs)
        elif self._preempted:
            job = self._preempted.pop(0)
        # Finally low
        elif self._low:
            job = self._low.pop(0)

        if job:
            self._append_log({"op": "dequeue", "job_id": job.id})

        return job

    async def set_current_job(self, job: Job) -> None:
        """Mark a job as currently running."""
        self._current_job = job
        self._append_log({"op": "set_current", "job_id": job.id})

    async def get_current_job(self) -> Optional[Job]:
        """Get the currently running job."""
        return self._current_job

    async def clear_current_job(self) -> None:
        """Clear the current job marker."""
        self._current_job = None
        self._append_log({"op": "clear_current"})

    async def complete(self, job_id: str) -> None:
        """Mark a job as completed."""
        self._append_log({"op": "complete", "job_id": job_id})
        if self._current_job and self._current_job.id == job_id:
            self._current_job = None

    async def should_preempt(self) -> bool:
        """Check if current job should be preempted for higher priority."""
        if not self._current_job:
            return False

        current_priority = self._current_job.priority

        if current_priority == JobPriority.LOW:
            # LOW can be preempted by CRITICAL or HIGH
            return bool(self._critical) or bool(self._high)
        elif current_priority == JobPriority.HIGH:
            # HIGH can be preempted only by CRITICAL
            return bool(self._critical)

        # CRITICAL is never preempted
        return False

    async def preempt_current(self, state: Optional[Dict[str, Any]] = None) -> Optional[Job]:
        """Preempt the current job and save for later resumption."""
        if not self._current_job:
            return None

        job = self._current_job
        job.preempted_state = state

        self._append_log({
            "op": "preempt",
            "job_id": job.id,
            "state": state,
        })

        # Add to preempted queue (front for LIFO resumption)
        self._preempted.insert(0, job)
        self._current_job = None

        return job

    async def remove_job(self, job_id: str) -> bool:
        """Remove a specific job from the queue."""
        # Check all queues
        for queue in [self._critical, self._high, self._low, self._preempted]:
            for i, job in enumerate(queue):
                if job.id == job_id:
                    queue.pop(i)
                    self._append_log({"op": "remove", "job_id": job_id})
                    return True
        return False

    async def get_status(self) -> Dict[str, Any]:
        """Get current queue statistics."""
        running = 1 if self._current_job else 0
        pending = len(self._critical) + len(self._high) + len(self._low) + len(self._preempted)

        return {
            "running": running,
            "pending": pending,
            "total": running + pending,
            "critical_pending": len(self._critical),
            "high_pending": len(self._high),
            "low_pending": len(self._low),
            "preempted": len(self._preempted),
            "current_job": {
                "id": self._current_job.id,
                "priority": self._current_job.priority.value,
            } if self._current_job else None,
        }

    def compact_log(self) -> None:
        """Rewrite log with only active jobs (removes completed entries)."""
        if not self._log_file.exists():
            return

        # Collect current state
        active_jobs: List[Job] = []
        active_jobs.extend(self._critical)
        active_jobs.extend(self._high)
        active_jobs.extend(self._low)
        active_jobs.extend(self._preempted)

        # Write new compacted log
        temp_file = self._storage_path / "queue.log.tmp"
        with open(temp_file, "w") as f:
            for job in active_jobs:
                entry = {
                    "op": "enqueue",
                    "job": job.to_dict(),
                    "ts": datetime.utcnow().isoformat(),
                }
                # If preempted, add that info
                if job.preempted_state is not None:
                    f.write(json.dumps(entry) + "\n")
                    preempt_entry = {
                        "op": "preempt",
                        "job_id": job.id,
                        "state": job.preempted_state,
                        "ts": datetime.utcnow().isoformat(),
                    }
                    f.write(json.dumps(preempt_entry) + "\n")
                else:
                    f.write(json.dumps(entry) + "\n")
            f.flush()
            os.fsync(f.fileno())

        # Atomic replace
        temp_file.replace(self._log_file)

    @property
    def size(self) -> int:
        """Get total number of jobs waiting in queue."""
        return len(self._critical) + len(self._high) + len(self._low) + len(self._preempted)

    # Backward compatibility methods for existing code

    def set_processor(self, processor: Callable) -> None:
        """Set the job processor function."""
        self._processor = processor

    async def start_worker(self) -> None:
        """Start the background worker."""
        if self._running:
            return
        self._running = True
        self._worker_task = asyncio.create_task(self._worker_loop())

    async def stop_worker(self) -> None:
        """Stop the background worker."""
        self._running = False
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass

    async def _worker_loop(self) -> None:
        """Background worker that processes jobs."""
        while self._running:
            try:
                # Non-blocking check with small sleep
                job = await self.dequeue()
                if job:
                    await self.set_current_job(job)
                    if self._processor:
                        try:
                            await self._processor(job)
                        finally:
                            await self.complete(job.id)
                else:
                    await asyncio.sleep(0.1)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Job processing error: {e}")


# Global job queue instance - will be initialized with storage path
# when the app starts (see main.py)
job_queue: Optional[PriorityJobQueue] = None


def init_job_queue(storage_path: Path) -> PriorityJobQueue:
    """Initialize the global job queue with storage path."""
    global job_queue
    job_queue = PriorityJobQueue(storage_path)
    return job_queue


def get_job_queue() -> PriorityJobQueue:
    """Get the global job queue instance."""
    if job_queue is None:
        raise RuntimeError("Job queue not initialized. Call init_job_queue first.")
    return job_queue
