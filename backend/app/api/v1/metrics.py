"""
Operational metrics — GET /metrics (Phase 2, Weeks 6–8).

Read-only aggregates for the cost dashboard and cache monitoring:
verdict-cache hit/miss + cumulative per-check cost counters.
Open endpoint (no sensitive data); all reads fail-silent to zero.
"""
from fastapi import APIRouter
from app.core.redis_client import counter_names, read_counter, read_float_counter
from app.schemas.schemas import CacheMetrics, CostMetrics, MetricsResponse

router = APIRouter()


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    names = counter_names()
    hits = await read_counter(names["cache_hits"])
    misses = await read_counter(names["cache_misses"])
    total = hits + misses
    return MetricsResponse(
        cache=CacheMetrics(
            hits=hits,
            misses=misses,
            hit_rate=round(hits / total, 4) if total else 0.0,
        ),
        cost=CostMetrics(
            checks=await read_counter(names["checks"]),
            llm_input_tokens=await read_counter(names["tokens_in"]),
            llm_output_tokens=await read_counter(names["tokens_out"]),
            searches=await read_counter(names["searches"]),
            estimated_cost_usd=round(await read_float_counter(names["cost_usd"]), 4),
        ),
    )
