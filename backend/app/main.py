"""
FastAPI main application entry point.
"""
import sys
import os

# Add agent directory to path so backend can import agent modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "agent"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog

from app.core.config import settings
from app.api.v1.verify import router as verify_router
from app.api.v1.health import router as health_router

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown."""
    logger.info("hallucination_hunter_starting", env=settings.APP_ENV)
    yield
    logger.info("hallucination_hunter_stopping")


app = FastAPI(
    title="Hallucination Hunter API",
    description="Claim-level AI trust verification. Verify AI responses with real evidence.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────
app.include_router(verify_router, prefix="/api/v1", tags=["Verification"])
app.include_router(health_router, prefix="/api/v1", tags=["Health & Upload"])


# ── Global error handlers ────────────────────────────────────
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=422, content={"detail": str(exc)})

@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    logger.error("unhandled_error", path=str(request.url), error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."},
    )


@app.get("/")
async def root():
    return {
        "name": "Hallucination Hunter API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
