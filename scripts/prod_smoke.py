"""Production smoke test (Phase 3, Week 10-11 — B).

Hits a live host with stdlib only (no extra deps) and gates deploys:
health -> keyless 401 -> keyed verify -> keyed stream -> metrics.

Usage:
    python scripts/prod_smoke.py --base-url https://<prod-host> --key tl_...

Exit codes: 0 pass, 1 smoke failure, 2 usage/config error.
Live in scripts/ (not tests/) so pytest never collects it; pure helpers
below ARE unit-tested in tests/backend/test_phase3_prod.py.
"""
import argparse
import json
import sys
import urllib.request
import urllib.error

SMOKE_TEXT = "The Earth orbits the Sun. Water boils at 100 C at sea level."


def req(method, url, key=None, body=None, timeout=30, request_id=None):
    """Single HTTP call. Returns (status, headers_dict, body_text)."""
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if key:
        headers["X-API-Key"] = key
    if request_id:
        headers["X-Request-ID"] = request_id
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return resp.status, dict(resp.headers), resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode("utf-8", "replace")


def check_health_payload(payload):
    """Pure: prod health must report ok + configured LLM/search."""
    return (
        payload.get("status") == "ok"
        and payload.get("llm") == "configured"
        and payload.get("search") == "configured"
        and payload.get("database") == "ok"
        and payload.get("redis") == "ok"
    )


def check_stream_frames(text):
    """Pure: first SSE frames must open correctly and never hang silently."""
    has_retry = "retry:" in text
    has_connected = ": connected" in text or ":connected" in text
    terminal = ("event: complete" in text) or ("event: error" in text)
    return has_retry and has_connected and terminal


def main():
    ap = argparse.ArgumentParser(description="TruthLayer production smoke test")
    ap.add_argument("--base-url", required=True)
    ap.add_argument("--key", required=True, help="per-install API key for prod")
    ap.add_argument("--timeout", type=float, default=60.0)
    args = ap.parse_args()
    base = args.base_url.rstrip("/")
    failures = []

    def fail(msg):
        failures.append(msg)
        print(f"FAIL: {msg}")

    # 1. Health
    status, headers, body = req("GET", base + "/api/v1/health", timeout=15)
    print(f"health: {status} {body[:150]}")
    try:
        ok = status == 200 and check_health_payload(json.loads(body))
    except json.JSONDecodeError:
        ok = False
    if not ok:
        fail("health not fully ok/configured")

    # 2. Keyless verify must 401 on prod (REQUIRE_API_KEY=true).
    status, _, body = req("POST", base + "/api/v1/verify",
                          body={"text": SMOKE_TEXT}, timeout=15)
    print(f"keyless verify: {status} {body[:120]}")
    if status != 401:
        fail(f"keyless verify should be 401 on prod, got {status}")

    # 3. X-Request-ID is echoed on every response.
    status, headers, _ = req("GET", base + "/api/v1/health",
                             request_id="smoke-123", timeout=15)
    rid = headers.get("X-Request-ID") or headers.get("x-request-id")
    print(f"request-id echo: {rid}")
    if rid != "smoke-123":
        fail("X-Request-ID not echoed")

    # 4. Keyed sync verify (quick mode keeps the smoke fast).
    status, _, body = req("POST", base + "/api/v1/verify", key=args.key,
                          body={"text": SMOKE_TEXT, "mode": "quick"},
                          timeout=args.timeout)
    print(f"verify: {status} {body[:200]}")
    if status != 200:
        fail(f"keyed verify failed with {status}")
    else:
        try:
            payload = json.loads(body)
            if not payload.get("claims"):
                fail("verify returned zero claims")
        except json.JSONDecodeError:
            fail("verify returned non-JSON")

    # 5. Keyed SSE stream ends in complete/error (never hangs).
    status, _, body = req("POST", base + "/api/v1/verify/stream", key=args.key,
                          body={"text": SMOKE_TEXT, "mode": "quick"},
                          timeout=args.timeout)
    print(f"stream: {status} bytes={len(body)}")
    if status != 200 or not check_stream_frames(body):
        fail("stream did not open/terminate correctly")

    # 6. Metrics readable (dashboard feed).
    status, _, body = req("GET", base + "/api/v1/metrics", timeout=15)
    print(f"metrics: {status} {body[:150]}")
    if status != 200:
        fail("metrics unreadable")

    if failures:
        print(f"SMOKE FAILED ({len(failures)} checks)")
        return 1
    print("SMOKE PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
