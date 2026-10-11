"""
Per-check cost tracking (Phase 2, Week 8).

A ContextVar accumulator follows one verification through parallel claim
tasks (child tasks inherit the context). LLM/search clients record usage;
the service layer reads the summary, logs it, and folds it into Redis
cumulative counters for the cost dashboard (/api/v1/metrics).
"""
from contextvars import ContextVar
from typing import Any, Dict, Optional
import structlog
from app.core.config import settings
from app.core.redis_client import counter_names, incr_counter, incr_float_counter

logger = structlog.get_logger()

_check: ContextVar[Optional[Dict[str, Any]]] = ContextVar("tl_cost", default=None)


def new_check() -> None:
    _check.set({
        "llm_input_tokens": 0,
        "llm_output_tokens": 0,
        "searches": 0,
        "model": settings.LLM_PROVIDER,
    })


def _acc() -> Optional[Dict[str, Any]]:
    return _check.get()


def estimate_tokens(text: str) -> int:
    """Rough token estimate (~4 chars/token) when the provider gives no usage."""
    return max(1, len(text or "") // 4)


def record_llm(input_tokens: int, output_tokens: int, model: Optional[str] = None) -> None:
    acc = _acc()
    if acc is None:
        return
    acc["llm_input_tokens"] += max(0, int(input_tokens))
    acc["llm_output_tokens"] += max(0, int(output_tokens))
    if model:
        acc["model"] = model


def record_search(count: int = 1) -> None:
    acc = _acc()
    if acc is None:
        return
    acc["searches"] += max(0, int(count))


def estimated_cost_usd(llm_in: int, llm_out: int, searches: int) -> float:
    return (
        llm_in / 1000 * settings.COST_USD_PER_1K_INPUT_TOKENS
        + llm_out / 1000 * settings.COST_USD_PER_1K_OUTPUT_TOKENS
        + searches * settings.COST_USD_PER_SEARCH
    )


def summary() -> Dict[str, Any]:
    acc = _acc() or {
        "llm_input_tokens": 0,
        "llm_output_tokens": 0,
        "searches": 0,
        "model": settings.LLM_PROVIDER,
    }
    return {
        "llm_input_tokens": acc["llm_input_tokens"],
        "llm_output_tokens": acc["llm_output_tokens"],
        "searches": acc["searches"],
        "model": acc["model"],
        "estimated_cost_usd": round(
            estimated_cost_usd(
                acc["llm_input_tokens"], acc["llm_output_tokens"], acc["searches"]
            ),
            6,
        ),
    }


async def record_check_totals(report: Dict[str, Any]) -> None:
    """Fold one finished check into cumulative Redis counters (fail-silent)."""
    counters = counter_names()
    await incr_counter(counters["checks"])
    await incr_counter(counters["tokens_in"], report.get("llm_input_tokens", 0))
    await incr_counter(counters["tokens_out"], report.get("llm_output_tokens", 0))
    await incr_counter(counters["searches"], report.get("searches", 0))
    await incr_float_counter(counters["cost_usd"], report.get("estimated_cost_usd", 0.0))
    logger.info("check_cost", **report)
