"""
Beta-traffic load test (Phase 2, Week 9 — B).

Hammers staging with concurrent POST /api/v1/verify (quick mode) and reports
p50/p95 latency, throughput, and error/429 counts.

Usage:
    python tests/load/run_load.py --base-url https://<staging-host> \
        --key tl_... --requests 100 --concurrency 10

Exit code is non-zero when p95 exceeds --p95-budget-s or errors exceed
--max-error-rate, so CI/nightly runs can gate on it. Not collected by pytest
(filename doesn't match test_*/ *_test patterns).
"""
import argparse
import asyncio
import statistics
import sys
import time

import httpx

CORPUS = [
    "The Earth orbits the Sun. Water boils at 100 degrees Celsius at sea level.",
    "Paris is the capital of France. The Eiffel Tower was completed in 1889.",
    "Mitochondria produce ATP through cellular respiration in eukaryotic cells.",
    "The Great Wall of China stretches over 21000 kilometers in total length.",
]


async def one_check(client: httpx.AsyncClient, url: str, headers: dict, text: str):
    started = time.perf_counter()
    try:
        resp = await client.post(url, json={"text": text, "mode": "quick"})
        elapsed = time.perf_counter() - started
        return elapsed, resp.status_code
    except Exception:
        return time.perf_counter() - started, "exception"


async def worker(sem: asyncio.Semaphore, client, url, headers, texts, results):
    async with sem:
        for text in texts:
            results.append(await one_check(client, url, headers, text))


async def main() -> int:
    parser = argparse.ArgumentParser(description="TruthLayer staging load test")
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--key", required=True, help="per-install API key for staging")
    parser.add_argument("--requests", type=int, default=100)
    parser.add_argument("--concurrency", type=int, default=10)
    parser.add_argument("--p95-budget-s", type=float, default=60.0)
    parser.add_argument("--max-error-rate", type=float, default=0.05)
    args = parser.parse_args()

    url = args.base_url.rstrip("/") + "/api/v1/verify"
    headers = {"X-API-Key": args.key}
    texts = [CORPUS[i % len(CORPUS)] for i in range(args.requests)]
    sem = asyncio.Semaphore(max(1, args.concurrency))
    results = []

    # Health gate first — don't load-test a sick host.
    async with httpx.AsyncClient(timeout=30.0) as client:
        health = await client.get(args.base_url.rstrip("/") + "/api/v1/health")
        print(f"health: {health.status_code} {health.text[:120]}")
        if health.status_code != 200:
            print("staging failed health gate — aborting load test")
            return 2

        # Split corpus across workers.
        chunks = [texts[i::args.concurrency] for i in range(args.concurrency)]
        started_all = time.perf_counter()
        await asyncio.gather(*[worker(sem, client, url, headers, c, results) for c in chunks])
        wall = time.perf_counter() - started_all

    latencies = sorted(lat for lat, _ in results)
    ok = sum(1 for _, status in results if status == 200)
    limited = sum(1 for _, status in results if status == 429)
    errors = len(results) - ok
    error_rate = errors / len(results) if results else 1.0

    def pct(p):
        return latencies[min(int(p / 100 * len(latencies)), len(latencies) - 1)] if latencies else 0.0

    print(f"requests={len(results)} wall_s={wall:.1f} rps={len(results)/wall:.1f}")
    print(f"ok={ok} rate_limited_429={limited} errors={errors} error_rate={error_rate:.3f}")
    print(f"latency_s p50={statistics.median(latencies):.2f} "
          f"p95={pct(95):.2f} max={max(latencies) if latencies else 0:.2f}")

    failed = False
    if pct(95) > args.p95_budget_s:
        print(f"FAIL: p95 {pct(95):.2f}s over budget {args.p95_budget_s}s")
        failed = True
    if error_rate > args.max_error_rate:
        print(f"FAIL: error rate {error_rate:.3f} over budget {args.max_error_rate}")
        failed = True
    print("LOAD TEST " + ("FAILED" if failed else "PASSED"))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
