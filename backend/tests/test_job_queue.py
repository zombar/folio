"""TDD tests for priority job queue with WAL persistence."""
import pytest
import json
from datetime import datetime

from app.services.job_queue import (
    PriorityJobQueue,
    Job,
    JobPriority,
    JobType,
)


class TestJobCreation:
    """Tests for Job dataclass."""

    def test_create_job_with_required_fields(self):
        """Should create a job with required fields."""
        job = Job(
            id="test-123",
            job_type=JobType.GENERATION,
            priority=JobPriority.HIGH,
            params={"prompt": "test"},
            created_at=datetime.utcnow().isoformat(),
        )
        assert job.id == "test-123"
        assert job.job_type == JobType.GENERATION
        assert job.priority == JobPriority.HIGH
        assert job.params == {"prompt": "test"}
        assert job.preempted_state is None

    def test_create_job_with_preempted_state(self):
        """Should create a job with preempted state."""
        job = Job(
            id="test-123",
            job_type=JobType.GENERATION,
            priority=JobPriority.HIGH,
            params={"prompt": "test"},
            created_at=datetime.utcnow().isoformat(),
            preempted_state={"progress": 50},
        )
        assert job.preempted_state == {"progress": 50}


class TestPriorityQueue:
    """Tests for priority ordering in the queue."""

    @pytest.fixture
    def temp_storage(self, tmp_path):
        """Provide a temporary storage directory."""
        return tmp_path

    @pytest.fixture
    def queue(self, temp_storage):
        """Create a fresh queue for each test."""
        return PriorityJobQueue(temp_storage)

    def _make_job(self, id: str, priority: JobPriority) -> Job:
        """Helper to create test jobs."""
        return Job(
            id=id,
            job_type=JobType.GENERATION,
            priority=priority,
            params={"prompt": f"test-{id}"},
            created_at=datetime.utcnow().isoformat(),
        )

    @pytest.mark.asyncio
    async def test_critical_dequeued_before_high(self, queue):
        """Critical priority jobs should be dequeued before high priority."""
        high_job = self._make_job("high1", JobPriority.HIGH)
        critical_job = self._make_job("crit1", JobPriority.CRITICAL)

        await queue.enqueue(high_job)
        await queue.enqueue(critical_job)

        result = await queue.dequeue()
        assert result is not None
        assert result.id == "crit1"

    @pytest.mark.asyncio
    async def test_high_dequeued_before_low(self, queue):
        """High priority jobs should be dequeued before low priority."""
        low_job = self._make_job("low1", JobPriority.LOW)
        high_job = self._make_job("high1", JobPriority.HIGH)

        await queue.enqueue(low_job)
        await queue.enqueue(high_job)

        result = await queue.dequeue()
        assert result is not None
        assert result.id == "high1"

    @pytest.mark.asyncio
    async def test_critical_dequeued_before_low(self, queue):
        """Critical priority jobs should be dequeued before low priority."""
        low_job = self._make_job("low1", JobPriority.LOW)
        critical_job = self._make_job("crit1", JobPriority.CRITICAL)

        await queue.enqueue(low_job)
        await queue.enqueue(critical_job)

        result = await queue.dequeue()
        assert result is not None
        assert result.id == "crit1"

    @pytest.mark.asyncio
    async def test_fifo_within_same_priority(self, queue):
        """Jobs with same priority should be dequeued in FIFO order."""
        job1 = self._make_job("high1", JobPriority.HIGH)
        job2 = self._make_job("high2", JobPriority.HIGH)
        job3 = self._make_job("high3", JobPriority.HIGH)

        await queue.enqueue(job1)
        await queue.enqueue(job2)
        await queue.enqueue(job3)

        result1 = await queue.dequeue()
        result2 = await queue.dequeue()
        result3 = await queue.dequeue()

        assert result1.id == "high1"
        assert result2.id == "high2"
        assert result3.id == "high3"

    @pytest.mark.asyncio
    async def test_dequeue_returns_none_when_empty(self, queue):
        """Dequeue should return None when queue is empty."""
        result = await queue.dequeue()
        assert result is None

    @pytest.mark.asyncio
    async def test_queue_size(self, queue):
        """Queue should report correct size."""
        assert queue.size == 0

        await queue.enqueue(self._make_job("job1", JobPriority.HIGH))
        assert queue.size == 1

        await queue.enqueue(self._make_job("job2", JobPriority.CRITICAL))
        assert queue.size == 2

        await queue.dequeue()
        assert queue.size == 1


class TestPreemption:
    """Tests for job preemption."""

    @pytest.fixture
    def temp_storage(self, tmp_path):
        return tmp_path

    @pytest.fixture
    def queue(self, temp_storage):
        return PriorityJobQueue(temp_storage)

    def _make_job(self, id: str, priority: JobPriority) -> Job:
        return Job(
            id=id,
            job_type=JobType.GENERATION,
            priority=priority,
            params={"prompt": f"test-{id}"},
            created_at=datetime.utcnow().isoformat(),
        )

    @pytest.mark.asyncio
    async def test_should_preempt_low_for_critical(self, queue):
        """Should signal preemption when critical job arrives during low job."""
        low_job = self._make_job("low1", JobPriority.LOW)
        await queue.enqueue(low_job)
        await queue.dequeue()  # Start processing low job
        await queue.set_current_job(low_job)

        critical_job = self._make_job("crit1", JobPriority.CRITICAL)
        await queue.enqueue(critical_job)

        assert await queue.should_preempt() is True

    @pytest.mark.asyncio
    async def test_should_preempt_low_for_high(self, queue):
        """Should signal preemption when high job arrives during low job."""
        low_job = self._make_job("low1", JobPriority.LOW)
        await queue.enqueue(low_job)
        await queue.dequeue()
        await queue.set_current_job(low_job)

        high_job = self._make_job("high1", JobPriority.HIGH)
        await queue.enqueue(high_job)

        assert await queue.should_preempt() is True

    @pytest.mark.asyncio
    async def test_should_preempt_high_for_critical(self, queue):
        """Should signal preemption when critical job arrives during high job."""
        high_job = self._make_job("high1", JobPriority.HIGH)
        await queue.enqueue(high_job)
        await queue.dequeue()
        await queue.set_current_job(high_job)

        critical_job = self._make_job("crit1", JobPriority.CRITICAL)
        await queue.enqueue(critical_job)

        assert await queue.should_preempt() is True

    @pytest.mark.asyncio
    async def test_should_not_preempt_high_for_high(self, queue):
        """Should not preempt when high job arrives during high job."""
        high_job1 = self._make_job("high1", JobPriority.HIGH)
        await queue.enqueue(high_job1)
        await queue.dequeue()
        await queue.set_current_job(high_job1)

        high_job2 = self._make_job("high2", JobPriority.HIGH)
        await queue.enqueue(high_job2)

        assert await queue.should_preempt() is False

    @pytest.mark.asyncio
    async def test_should_not_preempt_critical_for_critical(self, queue):
        """Should not preempt when critical job arrives during critical job."""
        crit_job1 = self._make_job("crit1", JobPriority.CRITICAL)
        await queue.enqueue(crit_job1)
        await queue.dequeue()
        await queue.set_current_job(crit_job1)

        crit_job2 = self._make_job("crit2", JobPriority.CRITICAL)
        await queue.enqueue(crit_job2)

        assert await queue.should_preempt() is False

    @pytest.mark.asyncio
    async def test_preempt_saves_job_state(self, queue):
        """Preempted job should be saved with state for resumption."""
        high_job = self._make_job("high1", JobPriority.HIGH)
        await queue.enqueue(high_job)
        await queue.dequeue()
        await queue.set_current_job(high_job)

        preempted = await queue.preempt_current(state={"progress": 50})
        assert preempted is not None
        assert preempted.id == "high1"
        assert preempted.preempted_state == {"progress": 50}

    @pytest.mark.asyncio
    async def test_preempted_job_resumes_after_critical(self, queue):
        """Preempted jobs should be resumed after higher priority completes."""
        high_job = self._make_job("high1", JobPriority.HIGH)
        await queue.enqueue(high_job)
        await queue.dequeue()
        await queue.set_current_job(high_job)

        # Critical job arrives
        critical_job = self._make_job("crit1", JobPriority.CRITICAL)
        await queue.enqueue(critical_job)

        # Preempt the high job
        await queue.preempt_current(state={"progress": 50})

        # Dequeue should get critical first
        result = await queue.dequeue()
        assert result.id == "crit1"

        # Complete critical job
        await queue.complete(critical_job.id)

        # Now should get preempted high job back
        result = await queue.dequeue()
        assert result is not None
        assert result.id == "high1"
        assert result.preempted_state == {"progress": 50}


class TestWALPersistence:
    """Tests for Write-Ahead Log persistence."""

    @pytest.fixture
    def temp_storage(self, tmp_path):
        return tmp_path

    @pytest.fixture
    def queue(self, temp_storage):
        return PriorityJobQueue(temp_storage)

    def _make_job(self, id: str, priority: JobPriority) -> Job:
        return Job(
            id=id,
            job_type=JobType.GENERATION,
            priority=priority,
            params={"prompt": f"test-{id}"},
            created_at=datetime.utcnow().isoformat(),
        )

    @pytest.mark.asyncio
    async def test_enqueue_persists_to_log(self, queue, temp_storage):
        """Enqueue should immediately write to log file."""
        job = self._make_job("job1", JobPriority.HIGH)
        await queue.enqueue(job)

        log_file = temp_storage / "queue.log"
        assert log_file.exists()

        lines = log_file.read_text().splitlines()
        assert len(lines) == 1

        entry = json.loads(lines[0])
        assert entry["op"] == "enqueue"
        assert entry["job"]["id"] == "job1"

    @pytest.mark.asyncio
    async def test_dequeue_persists_to_log(self, queue, temp_storage):
        """Dequeue should immediately write to log file."""
        job = self._make_job("job1", JobPriority.HIGH)
        await queue.enqueue(job)
        await queue.dequeue()

        log_file = temp_storage / "queue.log"
        lines = log_file.read_text().splitlines()
        assert len(lines) == 2

        entry = json.loads(lines[1])
        assert entry["op"] == "dequeue"
        assert entry["job_id"] == "job1"

    @pytest.mark.asyncio
    async def test_complete_persists_to_log(self, queue, temp_storage):
        """Complete should immediately write to log file."""
        job = self._make_job("job1", JobPriority.HIGH)
        await queue.enqueue(job)
        await queue.dequeue()
        await queue.set_current_job(job)
        await queue.complete(job.id)

        log_file = temp_storage / "queue.log"
        lines = log_file.read_text().splitlines()

        # Find complete entry
        complete_entry = None
        for line in lines:
            entry = json.loads(line)
            if entry["op"] == "complete":
                complete_entry = entry
                break

        assert complete_entry is not None
        assert complete_entry["job_id"] == "job1"

    @pytest.mark.asyncio
    async def test_restore_from_log_on_init(self, temp_storage):
        """Queue should restore state from existing log on initialization."""
        # Manually write a log file
        log_file = temp_storage / "queue.log"
        job_data = {
            "id": "existing-job",
            "job_type": "generation",
            "priority": "high",
            "params": {"prompt": "test"},
            "created_at": datetime.utcnow().isoformat(),
            "preempted_state": None,
        }
        log_entry = {"op": "enqueue", "job": job_data, "ts": datetime.utcnow().isoformat()}
        log_file.write_text(json.dumps(log_entry) + "\n")

        # Create new queue instance - should restore from log
        queue = PriorityJobQueue(temp_storage)

        # Should have the job from log
        job = await queue.dequeue()
        assert job is not None
        assert job.id == "existing-job"

    @pytest.mark.asyncio
    async def test_crash_recovery_enqueue_only(self, temp_storage):
        """Queue should recover correctly with only enqueue entries."""
        queue1 = PriorityJobQueue(temp_storage)
        job1 = self._make_job("job1", JobPriority.HIGH)
        job2 = self._make_job("job2", JobPriority.HIGH)

        await queue1.enqueue(job1)
        await queue1.enqueue(job2)
        # Simulate crash - no explicit shutdown
        del queue1

        # New instance should have both jobs
        queue2 = PriorityJobQueue(temp_storage)
        assert queue2.size == 2

    @pytest.mark.asyncio
    async def test_crash_recovery_with_dequeue(self, temp_storage):
        """Queue should recover correctly after dequeue."""
        queue1 = PriorityJobQueue(temp_storage)
        job1 = self._make_job("job1", JobPriority.HIGH)
        job2 = self._make_job("job2", JobPriority.HIGH)

        await queue1.enqueue(job1)
        await queue1.enqueue(job2)
        await queue1.dequeue()  # Removes job1
        del queue1

        # New instance should only have job2
        queue2 = PriorityJobQueue(temp_storage)
        assert queue2.size == 1

        job = await queue2.dequeue()
        assert job.id == "job2"

    @pytest.mark.asyncio
    async def test_crash_recovery_with_preemption(self, temp_storage):
        """Queue should recover preempted jobs correctly."""
        queue1 = PriorityJobQueue(temp_storage)
        high_job = self._make_job("high1", JobPriority.HIGH)
        crit_job = self._make_job("crit1", JobPriority.CRITICAL)

        await queue1.enqueue(high_job)
        await queue1.dequeue()
        await queue1.set_current_job(high_job)
        await queue1.enqueue(crit_job)
        await queue1.preempt_current(state={"progress": 50})
        del queue1

        # New instance should have critical in queue, high in preempted
        queue2 = PriorityJobQueue(temp_storage)

        # Critical should come first
        job = await queue2.dequeue()
        assert job.id == "crit1"

        await queue2.complete(job.id)

        # Then preempted high job
        job = await queue2.dequeue()
        assert job.id == "high1"
        assert job.preempted_state == {"progress": 50}


class TestLogCompaction:
    """Tests for log file compaction."""

    @pytest.fixture
    def temp_storage(self, tmp_path):
        return tmp_path

    @pytest.fixture
    def queue(self, temp_storage):
        return PriorityJobQueue(temp_storage)

    def _make_job(self, id: str, priority: JobPriority) -> Job:
        return Job(
            id=id,
            job_type=JobType.GENERATION,
            priority=priority,
            params={"prompt": f"test-{id}"},
            created_at=datetime.utcnow().isoformat(),
        )

    @pytest.mark.asyncio
    async def test_compact_removes_completed_jobs(self, queue, temp_storage):
        """Compaction should remove entries for completed jobs."""
        job1 = self._make_job("job1", JobPriority.HIGH)
        job2 = self._make_job("job2", JobPriority.HIGH)

        await queue.enqueue(job1)
        await queue.enqueue(job2)
        dequeued = await queue.dequeue()
        await queue.set_current_job(dequeued)
        await queue.complete(dequeued.id)

        log_file = temp_storage / "queue.log"
        lines_before = len(log_file.read_text().splitlines())

        # Compact the log
        queue.compact_log()

        lines_after = len(log_file.read_text().splitlines())
        assert lines_after < lines_before

        # Queue should still work correctly after compaction
        queue2 = PriorityJobQueue(temp_storage)
        assert queue2.size == 1
        job = await queue2.dequeue()
        assert job.id == "job2"


class TestQueueStatus:
    """Tests for queue status reporting."""

    @pytest.fixture
    def temp_storage(self, tmp_path):
        return tmp_path

    @pytest.fixture
    def queue(self, temp_storage):
        return PriorityJobQueue(temp_storage)

    def _make_job(self, id: str, priority: JobPriority) -> Job:
        return Job(
            id=id,
            job_type=JobType.GENERATION,
            priority=priority,
            params={"prompt": f"test-{id}"},
            created_at=datetime.utcnow().isoformat(),
        )

    @pytest.mark.asyncio
    async def test_get_status_empty(self, queue):
        """Should report empty status correctly."""
        status = await queue.get_status()
        assert status["running"] == 0
        assert status["pending"] == 0
        assert status["total"] == 0

    @pytest.mark.asyncio
    async def test_get_status_with_jobs(self, queue):
        """Should report correct counts by priority."""
        await queue.enqueue(self._make_job("crit1", JobPriority.CRITICAL))
        await queue.enqueue(self._make_job("high1", JobPriority.HIGH))
        await queue.enqueue(self._make_job("high2", JobPriority.HIGH))
        await queue.enqueue(self._make_job("low1", JobPriority.LOW))

        status = await queue.get_status()
        assert status["pending"] == 4
        assert status["critical_pending"] == 1
        assert status["high_pending"] == 2
        assert status["low_pending"] == 1

    @pytest.mark.asyncio
    async def test_get_status_with_running_job(self, queue):
        """Should report running job correctly."""
        job = self._make_job("job1", JobPriority.HIGH)
        await queue.enqueue(job)
        await queue.dequeue()
        await queue.set_current_job(job)

        status = await queue.get_status()
        assert status["running"] == 1
        assert status["current_job"]["id"] == "job1"


class TestRemoveJob:
    """Tests for removing jobs from queue."""

    @pytest.fixture
    def temp_storage(self, tmp_path):
        return tmp_path

    @pytest.fixture
    def queue(self, temp_storage):
        return PriorityJobQueue(temp_storage)

    def _make_job(self, id: str, priority: JobPriority) -> Job:
        return Job(
            id=id,
            job_type=JobType.GENERATION,
            priority=priority,
            params={"prompt": f"test-{id}"},
            created_at=datetime.utcnow().isoformat(),
        )

    @pytest.mark.asyncio
    async def test_remove_job_from_queue(self, queue):
        """Should remove a specific job from queue."""
        job1 = self._make_job("job1", JobPriority.HIGH)
        job2 = self._make_job("job2", JobPriority.HIGH)

        await queue.enqueue(job1)
        await queue.enqueue(job2)

        removed = await queue.remove_job("job1")
        assert removed is True
        assert queue.size == 1

        # Should only have job2
        job = await queue.dequeue()
        assert job.id == "job2"

    @pytest.mark.asyncio
    async def test_remove_nonexistent_job(self, queue):
        """Should return False for nonexistent job."""
        removed = await queue.remove_job("nonexistent")
        assert removed is False
