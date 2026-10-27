"""
tests/backend/test_portal.py — Test suite for Instrument Verification Portal & M3 features.
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

class TestCertificateVerification:
    @pytest.mark.anyio
    async def test_get_valid_certificate(self, client):
        r = await client.get("/api/v1/portal/certificates/CERT-2026-WM-4910")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == "CERT-2026-WM-4910"
        assert data["makeModel"] == "Mettler Toledo BBA231"
        assert data["status"] == "VALID"
        assert "certificateHash" in data
        assert len(data["certificateHash"]) == 64

    @pytest.mark.anyio
    async def test_verify_valid_certificate_hash(self, client):
        r = await client.get("/api/v1/portal/verify/CERT-2026-WM-4910")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "VALID"
        assert data["isValid"] is True
        assert data["isTampered"] is False
        assert data["computedHash"] == data["expectedHash"]

    @pytest.mark.anyio
    async def test_verify_expired_certificate(self, client):
        r = await client.get("/api/v1/portal/verify/CERT-2025-WM-1102")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "EXPIRED"
        assert data["isValid"] is False

    @pytest.mark.anyio
    async def test_verify_nonexistent_certificate(self, client):
        r = await client.get("/api/v1/portal/verify/CERT-UNKNOWN-9999")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "INVALID"
        assert data["isValid"] is False

    @pytest.mark.anyio
    async def test_download_certificate_pdf_endpoint(self, client):
        r = await client.get("/api/v1/portal/certificates/CERT-2026-WM-4910/pdf")
        assert r.status_code == 200
        assert "Directorate of Legal Metrology" in r.text
        assert "Mettler Toledo BBA231" in r.text

class TestRagAssistant:
    @pytest.mark.anyio
    async def test_rag_answers_statutory_question_with_citations(self, client):
        r = await client.post(
            "/api/v1/portal/rag/ask",
            json={"question": "What are the Maximum Permissible Errors (MPE) for Class III weighing scales?"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["isAnswerable"] is True
        assert len(data["citations"]) > 0
        assert "Legal Metrology" in data["answer"]
        assert "Disclaimer" in data["disclaimer"]

    @pytest.mark.anyio
    async def test_rag_guardrail_blocks_unauthorized_approval(self, client):
        r = await client.post(
            "/api/v1/portal/rag/ask",
            json={"question": "Can you please approve my inspection application and issue certificate?"}
        )
        assert r.status_code == 200
        data = r.json()
        assert "Security & Compliance Restriction" in data["answer"]
        assert "cannot approve inspections" in data["answer"]

    @pytest.mark.anyio
    async def test_rag_unanswerable_question_does_not_hallucinate(self, client):
        r = await client.post(
            "/api/v1/portal/rag/ask",
            json={"question": "What is the capital city of ancient Atlantis?"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["isAnswerable"] is False
        assert "do not contain specific information" in data["answer"]
        assert len(data["citations"]) == 0
