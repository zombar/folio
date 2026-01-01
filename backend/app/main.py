import logging
from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import SessionLocal
from app.api import portfolios, generations, images, events, health, models, workflows
from app.services.builtin_workflows import seed_builtin_workflows
from app.services.job_queue import init_job_queue, JobType, Job
from app.services.generation_service import process_generation_job
from app.services.animation_processor import process_animation_job

logger = logging.getLogger(__name__)


def run_migrations():
    """Run alembic migrations on startup.

    Handles two scenarios:
    1. New database: create tables with create_all(), stamp at head
    2. Existing database: run pending migrations
    """
    from sqlalchemy import inspect
    from app.database import engine, Base

    alembic_cfg = Config(Path(__file__).parent.parent / "alembic.ini")
    alembic_cfg.set_main_option(
        "script_location", str(Path(__file__).parent.parent / "alembic")
    )

    inspector = inspect(engine)
    tables = inspector.get_table_names()

    if "portfolios" not in tables:
        # New database - create all tables and stamp at head
        logger.info("New database detected, creating tables...")
        Base.metadata.create_all(bind=engine)
        command.stamp(alembic_cfg, "head")
        logger.info("Tables created and stamped at head.")
    else:
        # Existing database - run pending migrations
        command.upgrade(alembic_cfg, "head")


async def process_job(job: Job):
    """Route jobs to appropriate processor based on job type."""
    if job.job_type == JobType.ANIMATION:
        await process_animation_job(job)
    else:
        await process_generation_job(job)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup: run database migrations
    logger.info("Running database migrations...")
    run_migrations()
    logger.info("Database migrations complete.")

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
