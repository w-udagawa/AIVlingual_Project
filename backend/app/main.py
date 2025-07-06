"""
AIVlingual - Bilingual AI Vtuber Backend
Main FastAPI application entry point
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import Response
import uvicorn
from contextlib import asynccontextmanager
import logging

from app.api.websocket_handler import websocket_router
from app.api.v1.router import api_router
from app.core.config import settings
from app.services.database_service import init_db

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting AIVlingual backend...")
    await init_db()
    yield
    # Shutdown
    logger.info("Shutting down AIVlingual backend...")


# Create FastAPI app
app = FastAPI(
    title="AIVlingual API",
    description="Bilingual AI Vtuber System Backend",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS - must be before other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["http://localhost:3004"],  # Explicitly add port 3004
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(websocket_router, prefix="/ws", tags=["websocket"])
app.include_router(api_router, prefix="/api/v1", tags=["api"])

# Root endpoint
@app.get("/")
async def root():
    return {
        "service": "AIVlingual Backend",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/api/v1/health"
    }


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL.lower()
    )