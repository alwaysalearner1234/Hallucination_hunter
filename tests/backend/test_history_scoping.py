"""
History-scoping tests (Phase 2, Week 7).

Covers: keyless callers see the legacy unscoped history; keyed callers get
queries filtered to their own api_key_id (list, get-one, delete-one); and
DELETE /data always requires a key and only wipes that key's rows.
DB-free: asserts on built SQL + a recording FakeSession.
"""
import uuid
import pytest
from fastapi import HTTPException

from app.api.v1.verify import (
    _history_base,
    _scoped_session_query,
    delete_my_data,
)
from app.models.models import ApiKey


class FakeScalars:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return list(self._rows)

    def first(self):
        return self._rows[0] if self._rows else None


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def scalars(self):
        return FakeScalars(self._rows)


class FakeSession:
    def __init__(self, rows=()):
        self.rows = list(rows)
        self.deleted = []
        self.committed = False

    async def execute(self, stmt):
        self.last_stmt = stmt
        return FakeResult(self.rows)

    async def delete(self, obj):
        self.deleted.append(obj)

    async def commit(self):
        self.committed = True


def _key():
    return ApiKey(id=uuid.uuid4(), key_hash="abc", revoked=False)


class TestScopingHelpers:
    def test_unscoped_without_key(self):
        assert len(_history_base(None)) == 1  # status filter only
        # No WHERE clause at all for legacy keyless callers.
        assert _scoped_session_query(None).whereclause is None

    def test_scoped_with_key(self):
        key = _key()
        assert len(_history_base(key)) == 2  # status + key filter
        clause = _scoped_session_query(key).whereclause
        assert clause is not None and "api_key_id" in str(clause)


class TestDeleteMyData:
    async def test_requires_key_even_with_auth_off(self):
        with pytest.raises(HTTPException) as ei:
            await delete_my_data(FakeSession(), None)
        assert ei.value.status_code == 401

    async def test_deletes_only_returned_scoped_rows(self):
        # The route deletes exactly the rows its key-scoped query returned:
        # another key's rows never reach it (see helper tests above).
        from app.models.models import VerificationSession
        key = _key()
        mine = [VerificationSession(id=uuid.uuid4()), VerificationSession(id=uuid.uuid4())]
        db = FakeSession(rows=mine)
        result = await delete_my_data(db, key)
        assert result == {"deleted": 2}
        assert db.deleted == mine and db.committed
        assert "api_key_id" in str(db.last_stmt.whereclause)
