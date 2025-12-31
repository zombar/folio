from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables, SessionLocal
from app.api import portfolios, generations, images, events, health, models, workflows
from app.services.builtin_workflows import seed_builtin_workflows
from app.services.job_queue import init_job_queue, JobType, Job
from app.services.generation_service import process_generation_job
from app.services.animation_processor import process_animation_job


async def process_job(job: Job):
    """Route jobs to appropriate processor based on job type."""
    if job.job_type == JobType.ANIMATION:
        await process_animation_job(job)
    else:
        await process_generation_job(job)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup: create database tables
    create_tables()

    # Seed built-in workflows
    db = SessionLocal()
    try:
        seed_builtin_workflows(db)
    finally:
        db.close()

    # Initialize and start job queue worker
    storage_path = Path(settings.storage_path)
    job_queue = init_job_queue(storage_path)
    job_queue.set_processor(process_job)
    await job_queue.start_worker()

    yield

    # Shutdown: stop job queue worker
    await job_queue.stop_worker()


app = FastAPI(
    title="Folio",
    description="Portfolio-first AI image generator",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(portfolios.router, prefix="/api", tags=["portfolios"])
app.include_router(generations.router, prefix="/api", tags=["generations"])
app.include_router(images.router, prefix="/api", tags=["images"])
app.include_router(events.router, prefix="/api", tags=["events"])
app.include_router(models.router, prefix="/api", tags=["models"])
app.include_router(workflows.router, prefix="/api", tags=["workflows"])
