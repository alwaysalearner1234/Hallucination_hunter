"""
FastAPI main application entry point.
"""
from contextlib import asynccontextmanager
import asyncio
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog

from app.core.config import settings
from app.core.errors import RateLimitExceeded, error_body
from app.core.rate_limit import rate_limit_middleware
from app.core.security import require_api_key
from app.api.v1.verify import router as verify_router
from app.api.v1.health import router as health_router
from app.api.v1.keys import router as keys_router

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
# Extension origins: MV3 pages run under chrome-extension://<id>, Firefox
# under moz-extension://. With allow_credentials=True the "*" entry echoes
# the request Origin back; the regex below makes extension clients explicit.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"(chrome-extension|moz-extension|safari-web-extension)://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate limiting (Redis per-key; health/keys/docs stay unlimited) ──
app.middleware("http")(rate_limit_middleware)

# ── Routes ────────────────────────────────────────────────────
# Verification surface requires the per-install key when REQUIRE_API_KEY
# is on (staging/prod). /health stays open for load-balancer probes and
# /keys must stay open so new installs can get their key.
app.include_router(
    verify_router,
    prefix="/api/v1",
    tags=["Verification"],
    dependencies=[Depends(require_api_key)],
)
app.include_router(keys_router, prefix="/api/v1", tags=["API Keys"])
app.include_router(health_router, prefix="/api/v1", tags=["Health & Upload"])


# ── Global error handlers (consistent {"detail", "code"} shape) ──
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=422, content=error_body("INVALID_INPUT", str(exc))
    )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content=error_body("RATE_LIMITED", "Rate limit exceeded. Slow down and retry."),
        headers={"Retry-After": str(exc.retry_after)},
    )


@app.exception_handler(TimeoutError)
@app.exception_handler(asyncio.TimeoutError)
async def timeout_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=504,
        content=error_body("TIMEOUT", "The request timed out. Try QUICK mode or fewer claims."),
    )

@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    logger.error("unhandled_error", path=str(request.url), error=str(exc))
    return JSONResponse(
        status_code=500,
        content=error_body("INTERNAL_ERROR", "An unexpected error occurred. Please try again."),
    )


@app.get("/")
async def root():
    return {
        "name": "Hallucination Hunter API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
