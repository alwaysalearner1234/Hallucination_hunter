"""Phase 3 B tests — production, backups, privacy, cost report.

Covers pure helpers in scripts/prod_smoke.py + scripts/cost_report.py
(loaded by path so scripts/ needs no packaging) and static guarantees on
the prod deployment files + docs. No network, no docker.
"""
import importlib.util
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def load_script(name):
    path = os.path.join(ROOT, "scripts", name)
    spec = importlib.util.spec_from_file_location(f"scripts_{name.replace('.', '_')}", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


smoke = load_script("prod_smoke.py")
cost_report = load_script("cost_report.py")


class TestSmokeHelpers:
    def test_health_payload_ok(self):
        assert smoke.check_health_payload({
            "status": "ok", "database": "ok", "redis": "ok",
            "llm": "configured", "search": "configured",
        }) is True

    def test_health_payload_rejects_unconfigured(self):
        assert smoke.check_health_payload({
            "status": "ok", "database": "ok", "redis": "ok",
            "llm": "not_configured", "search": "configured",
        }) is False

    def test_stream_frames_require_terminal(self):
        good = ("retry: 10000\n: connected\n\n"
                "event: claims_extracted\ndata: {}\n\n"
                "event: complete\ndata: {}\n\n")
        assert smoke.check_stream_frames(good) is True
        hanging = "retry: 10000\n: connected\n\nevent: claim_verified\ndata: {}\n\n"
        assert smoke.check_stream_frames(hanging) is False

    def test_req_builds_headers(self, monkeypatch):
        seen = {}

        class FakeResp:
            status = 200
            headers = {}
            def __enter__(self): return self
            def __exit__(self, *a): return False
            def read(self): return b'{"status":"ok"}'

        def fake_urlopen(request, timeout=None):
            seen["headers"] = dict(request.headers)
            seen["method"] = request.get_method()
            return FakeResp()

        import urllib.request
        monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)
        status, _, _ = smoke.req("GET", "http://x/health", key="tl_abc",
                                 request_id="r1", timeout=5)
        assert status == 200
        header_vals = " ".join(seen["headers"].values())
        assert "tl_abc" in header_vals and "r1" in header_vals


class TestCostReport:
    def test_summarize_math(self):
        metrics = {"cost": {"checks": 4, "estimated_cost_usd": 0.20,
                            "searches": 8, "llm_input_tokens": 4000,
                            "llm_output_tokens": 2000},
                   "cache": {"hit_rate": 0.5}}
        s = cost_report.summarize_metrics(metrics, checks_per_day=100)
        assert s["mean_cost_per_check_usd"] == 0.05
        assert s["mean_searches_per_check"] == 2.0
        assert s["projected_daily_usd"] == 5.0
        assert s["projected_monthly_usd"] == 150.0

    def test_summarize_zero_checks_safe(self):
        s = cost_report.summarize_metrics({"cost": {}, "cache": {}})
        assert s["checks"] == 0 and s["mean_cost_per_check_usd"] == 0.0
        assert s["projected_daily_usd"] == 0.0

    def test_alerts_fire(self):
        s = {"mean_cost_per_check_usd": 1.0, "projected_daily_usd": 999.0}
        alerts = cost_report.alert_lines(s, checks_per_day=5000)
        assert len(alerts) == 3

    def test_no_alerts_when_quiet(self):
        s = {"mean_cost_per_check_usd": 0.001, "projected_daily_usd": 0.2}
        assert cost_report.alert_lines(s, checks_per_day=50) == []


class TestProdFiles:
    def _read(self, rel):
        with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
            return f.read()

    def test_prod_compose(self):
        text = self._read("docker-compose.prod.yml")
        assert 'REQUIRE_API_KEY: "true"' in text
        assert "Dockerfile.prod" in text
        assert "POSTGRES_PASSWORD:?" in text and "REDIS_PASSWORD:?" in text
        assert "GEMINI_API_KEY:?" in text and "JWT_SECRET:?" in text
        assert "restart: always" in text
        # prod must not bind-mount source trees
        assert "./backend:/app" not in text and "./agent:/agent" not in text

    def test_prod_dockerfile(self):
        text = self._read("backend/Dockerfile.prod")
        assert "USER appuser" in text
        assert "COPY agent/ /agent/" in text

    def test_backup_scripts(self):
        for name in ("scripts/backup.sh", "scripts/restore.sh"):
            text = self._read(name)
            assert "set -euo pipefail" in text
        assert "pg_dump" in self._read("scripts/backup.sh")
        assert "CREATE DATABASE" in self._read("scripts/restore.sh")

    def test_privacy_docs(self):
        assert "DELETE /api/v1/data" in self._read("docs/privacy-policy.md")
        assert "SHA-256" in self._read("docs/privacy-policy.md")
        assert "X-Request-ID" in self._read("docs/data-handling.md")
        perms = self._read("docs/extension-permissions-review.md")
        assert "host_permissions" in perms and "<all_urls>" in perms
        assert "allow_origin_regex" in perms
        assert "production-runbook.md" is not None
        runbook = self._read("docs/production-runbook.md")
        assert "prod_smoke.py" in runbook and "backup.sh" in runbook
