"""
FastAPI main application entry point.
"""
from contextlib import asynccontextmanager
import asyncio
import time
import uuid
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog

from app.core.config import settings
from app.core.errors import RateLimitExceeded, error_body
from app.core.rate_limit import identity_for, rate_limit_middleware
from app.api.v1.verify import router as verify_router
from app.api.v1.health import router as health_router
from app.api.v1.keys import router as keys_router
from app.api.v1.metrics import router as metrics_router

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown."""
    if settings.SENTRY_DSN:
        try:
            import sentry_sdk
            sentry_sdk.init(
                dsn=settings.SENTRY_DSN,
                environment=settings.APP_ENV,
                traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
            )
            logger.info("sentry_enabled", env=settings.APP_ENV)
        except Exception as e:
            logger.warning("sentry_init_failed", error=str(e))
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


# ── Request context: ID + timing on every request (Phase 2, Week 8) ──
@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    """Bind request_id/key/method/path/status/duration to one log line.

    Clients may send X-Request-ID (extension correlates panel ↔ page);
    otherwise we mint one and echo it back on every response.
    """
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:16]
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = int((time.perf_counter() - start) * 1000)
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "http_request",
        request_id=request_id,
        identity=identity_for(request),
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=duration_ms,
    )
    return response


# ── Routes ────────────────────────────────────────────────────
# Auth rides explicitly on each verification route (require_api_key param)
# so handlers also receive the calling key for history scoping.
# /health + /metrics stay open for probes/dashboards; /keys stays open
# so new installs can get their key.
app.include_router(verify_router, prefix="/api/v1", tags=["Verification"])
app.include_router(keys_router, prefix="/api/v1", tags=["API Keys"])
app.include_router(metrics_router, prefix="/api/v1", tags=["Metrics"])
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
