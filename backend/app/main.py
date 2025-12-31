from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables
from app.api import portfolios, generations, images, events, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup: create database tables
    create_tables()
    yield
    # Shutdown: cleanup if needed


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
