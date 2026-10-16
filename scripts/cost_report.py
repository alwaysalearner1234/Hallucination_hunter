"""Cost and usage report (Phase 3, Weeks 11-12 — B).

Reads GET /api/v1/metrics (stdlib only) and prints a human + JSON summary:
per-check averages, daily projection, and spike alerts for on-call.

Usage:
    python scripts/cost_report.py --base-url https://<prod-host> [--checks-per-day 200]

Pure helpers (summarize_metrics, alert_lines) are unit-tested in
tests/backend/test_phase3_prod.py; only fetch_metrics touches the network.
"""
import argparse
import json
import sys
import urllib.request

# Alert thresholds for beta/launch watch (tune from real traffic, Week 12).
ALERT_COST_PER_CHECK_USD = 0.05   # single-check mean above this = investigate
ALERT_CHECKS_PER_DAY = 1000       # volume above this = revisit rate limits
ALERT_PROJECTED_DAILY_USD = 20.0  # projected spend above this = page


def fetch_metrics(base_url, timeout=15):
    with urllib.request.urlopen(base_url.rstrip("/") + "/api/v1/metrics",
                                timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def summarize_metrics(metrics, checks_per_day=200):
    """Pure: turn a /metrics payload into per-check means + projection."""
    cost = metrics.get("cost", {})
    cache = metrics.get("cache", {})
    checks = int(cost.get("checks", 0) or 0)
    total_usd = float(cost.get("estimated_cost_usd", 0.0) or 0.0)
    searches = int(cost.get("searches", 0) or 0)
    tok_in = int(cost.get("llm_input_tokens", 0) or 0)
    tok_out = int(cost.get("llm_output_tokens", 0) or 0)
    mean = (total_usd / checks) if checks else 0.0
    return {
        "checks": checks,
        "total_usd": round(total_usd, 4),
        "mean_cost_per_check_usd": round(mean, 6),
        "mean_searches_per_check": round(searches / checks, 3) if checks else 0.0,
        "mean_input_tokens_per_check": round(tok_in / checks, 1) if checks else 0.0,
        "mean_output_tokens_per_check": round(tok_out / checks, 1) if checks else 0.0,
        "cache_hit_rate": float(cache.get("hit_rate", 0.0) or 0.0),
        "projected_daily_usd": round(mean * checks_per_day, 4),
        "projected_monthly_usd": round(mean * checks_per_day * 30, 2),
    }


def alert_lines(summary, checks_per_day=200):
    """Pure: on-call alerts when cost/volume/projection exceed budgets."""
    alerts = []
    if summary["mean_cost_per_check_usd"] > ALERT_COST_PER_CHECK_USD:
        alerts.append(
            f"cost-per-check {summary['mean_cost_per_check_usd']} > "
            f"{ALERT_COST_PER_CHECK_USD}: check model mix / cache hit rate"
        )
    if checks_per_day > ALERT_CHECKS_PER_DAY:
        alerts.append(
            f"volume {checks_per_day}/day > {ALERT_CHECKS_PER_DAY}: "
            "revisit rate limits + pool sizing"
        )
    if summary["projected_daily_usd"] > ALERT_PROJECTED_DAILY_USD:
        alerts.append(
            f"projected ${summary['projected_daily_usd']}/day > "
            f"${ALERT_PROJECTED_DAILY_USD}: cap modes or raise cache TTL"
        )
    return alerts


def main():
    ap = argparse.ArgumentParser(description="TruthLayer cost and usage report")
    ap.add_argument("--base-url", required=True)
    ap.add_argument("--checks-per-day", type=int, default=200)
    ap.add_argument("--json", action="store_true", help="print raw JSON summary")
    args = ap.parse_args()
    try:
        metrics = fetch_metrics(args.base_url)
    except Exception as e:
        print(f"could not fetch /metrics: {e}")
        return 2
    summary = summarize_metrics(metrics, args.checks_per_day)
    if args.json:
        print(json.dumps(summary, indent=2))
    else:
        print("checks:               ", summary["checks"])
        print("total spend (USD):    ", summary["total_usd"])
        print("mean cost/check (USD):", summary["mean_cost_per_check_usd"])
        print("mean searches/check:  ", summary["mean_searches_per_check"])
        print("mean in/out tokens:   ",
              summary["mean_input_tokens_per_check"],
              "/", summary["mean_output_tokens_per_check"])
        print("cache hit rate:       ", summary["cache_hit_rate"])
        print(f"projected @{args.checks_per_day}/day: "
              f"${summary['projected_daily_usd']}/day, "
              f"${summary['projected_monthly_usd']}/mo")
    for line in alert_lines(summary, args.checks_per_day):
        print("ALERT:", line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
