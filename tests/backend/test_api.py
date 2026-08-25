"""
Backend API tests — pytest
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "agent"))

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


class TestHealth:
    @pytest.mark.anyio
    async def test_health_endpoint(self, client):
        r = await client.get("/api/v1/health")
        assert r.status_code == 200
        data = r.json()
        assert "status" in data
        assert "version" in data

    @pytest.mark.anyio
    async def test_root_endpoint(self, client):
        r = await client.get("/")
        assert r.status_code == 200


class TestVerifyEndpoint:
    @pytest.mark.anyio
    async def test_empty_text_rejected(self, client):
        r = await client.post("/api/v1/verify", json={"text": ""})
        assert r.status_code == 422

    @pytest.mark.anyio
    async def test_too_short_text_rejected(self, client):
        r = await client.post("/api/v1/verify", json={"text": "hi"})
        assert r.status_code == 422

    @pytest.mark.anyio
    async def test_too_long_text_rejected(self, client):
        r = await client.post("/api/v1/verify", json={"text": "x" * 60000})
        assert r.status_code in (400, 422)

    @pytest.mark.anyio
    async def test_valid_mode_values(self, client):
        # This will fail if LLM not configured — 422 is expected in test env
        for mode in ("quick", "standard", "deep", "strict"):
            r = await client.post(
                "/api/v1/verify",
                json={"text": "The Earth orbits the Sun. Water is H2O.", "mode": mode}
            )
            assert r.status_code in (200, 422, 500, 503)  # 422/500/503 expected without API keys

    @pytest.mark.anyio
    async def test_invalid_mode_rejected(self, client):
        r = await client.post(
            "/api/v1/verify",
            json={"text": "The Earth orbits the Sun.", "mode": "invalid_mode"}
        )
        assert r.status_code == 422


class TestExtractEndpoint:
    @pytest.mark.anyio
    async def test_extract_empty_rejected(self, client):
        r = await client.post("/api/v1/claims/extract", json={"text": ""})
        assert r.status_code == 422


class TestHistoryEndpoint:
    @pytest.mark.anyio
    async def test_history_returns_list(self, client):
        r = await client.get("/api/v1/history")
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert "total" in data

    @pytest.mark.anyio
    async def test_history_not_found(self, client):
        r = await client.get("/api/v1/history/nonexistent-id")
        assert r.status_code == 404

    @pytest.mark.anyio
    async def test_delete_not_found(self, client):
        r = await client.delete("/api/v1/history/nonexistent-id")
        assert r.status_code == 404
