"""
Auth tests — per-install API keys (Phase 1, Week 2, Fri Oct 16).

Covers: missing key → 401, wrong key → 401, revoked → 403, valid → passes,
plus key issuance (hash stored, plaintext returned once).
DB-free: uses a FakeSession so these run anywhere, including CI without Postgres.
"""
import pytest
from fastapi import HTTPException

from app.core import security
from app.core.security import (
    _extract_key,
    generate_api_key,
    hash_api_key,
    require_api_key,
)
from app.models.models import ApiKey


class FakeResult:
    def __init__(self, obj):
        self._obj = obj

    def scalars(self):
        return self

    def first(self):
        return self._obj


class FakeSession:
    def __init__(self, record=None):
        self.record = record
        self.added = []
        self.flushed = False

    async def execute(self, stmt):
        return FakeResult(self.record)

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        self.flushed = True


class FakeRequest:
    def __init__(self, headers=None):
        self.headers = headers or {}


def _enable_keys(monkeypatch):
    monkeypatch.setattr(security.settings, "REQUIRE_API_KEY", True)


def _disable_keys(monkeypatch):
    monkeypatch.setattr(security.settings, "REQUIRE_API_KEY", False)


class TestKeyCrypto:
    def test_generate_format_and_uniqueness(self):
        k1, k2 = generate_api_key(), generate_api_key()
        assert k1.startswith("tl_") and k2.startswith("tl_")
        assert k1 != k2 and len(k1) > 20

    def test_hash_is_sha256_not_plaintext(self):
        key = generate_api_key()
        hashed = hash_api_key(key)
        assert hashed != key
        assert len(hashed) == 64  # sha256 hex
        assert hash_api_key(key) == hashed  # deterministic


class TestExtractKey:
    def test_x_api_key_header(self):
        assert _extract_key(FakeRequest({"X-API-Key": "tl_abc"})) == "tl_abc"

    def test_bearer_fallback(self):
        req = FakeRequest({"Authorization": "Bearer tl_xyz"})
        assert _extract_key(req) == "tl_xyz"

    def test_missing_returns_none(self):
        assert _extract_key(FakeRequest({})) is None


class TestIssueKey:
    async def test_issue_returns_plaintext_once_and_stores_hash(self):
        from app.api.v1.keys import issue_key
        from app.schemas.schemas import ApiKeyIssueRequest

        db = FakeSession()
        resp = await issue_key(ApiKeyIssueRequest(name="ext-install-1"), db)

        assert resp.key.startswith("tl_")
        assert db.flushed and len(db.added) == 1
        stored = db.added[0]
        assert isinstance(stored, ApiKey)
        assert stored.key_hash == hash_api_key(resp.key)
        assert "tl_" not in stored.key_hash  # never store plaintext


class TestRequireApiKey:
    async def test_disabled_passes_through_without_key(self, monkeypatch):
        _disable_keys(monkeypatch)
        assert await require_api_key(FakeRequest({}), FakeSession()) is None

    async def test_enabled_missing_key_401(self, monkeypatch):
        _enable_keys(monkeypatch)
        with pytest.raises(HTTPException) as ei:
            await require_api_key(FakeRequest({}), FakeSession())
        assert ei.value.status_code == 401

    async def test_enabled_wrong_key_401(self, monkeypatch):
        _enable_keys(monkeypatch)
        req = FakeRequest({"X-API-Key": "tl_wrong"})
        with pytest.raises(HTTPException) as ei:
            await require_api_key(req, FakeSession(record=None))
        assert ei.value.status_code == 401

    async def test_enabled_revoked_key_403(self, monkeypatch):
        _enable_keys(monkeypatch)
        record = ApiKey(key_hash=hash_api_key("tl_revoked"), revoked=True)
        req = FakeRequest({"X-API-Key": "tl_revoked"})
        with pytest.raises(HTTPException) as ei:
            await require_api_key(req, FakeSession(record=record))
        assert ei.value.status_code == 403

    async def test_enabled_valid_key_passes_and_touches_last_used(self, monkeypatch):
        _enable_keys(monkeypatch)
        key = generate_api_key()
        record = ApiKey(key_hash=hash_api_key(key), revoked=False)
        assert record.last_used_at is None
        req = FakeRequest({"X-API-Key": key})
        assert await require_api_key(req, FakeSession(record=record)) is record
        assert record.last_used_at is not None
