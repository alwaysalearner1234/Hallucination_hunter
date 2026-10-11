"""
Request-context middleware tests (Phase 2, Week 8).

Covers: client-supplied X-Request-ID is echoed back; otherwise a 16-char
id is minted. No DB or Redis involved.
"""
from starlette.requests import Request
from starlette.responses import JSONResponse


def _scope(headers=None):
    return {
        "type": "http",
        "method": "GET",
        "path": "/api/v1/health",
        "headers": [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()],
        "client": ("127.0.0.1", 5000),
        "query_string": b"",
    }


class TestRequestId:
    async def test_echoes_client_request_id(self):
        from app.main import request_context_middleware

        async def call_next(request):
            return JSONResponse({"ok": True})

        response = await request_context_middleware(
            Request(_scope({"X-Request-ID": "ext-123"})), call_next
        )
        assert response.status_code == 200
        assert response.headers["X-Request-ID"] == "ext-123"

    async def test_mints_id_when_missing(self):
        from app.main import request_context_middleware

        async def call_next(request):
            return JSONResponse({"ok": True})

        response = await request_context_middleware(Request(_scope()), call_next)
        minted = response.headers["X-Request-ID"]
        assert len(minted) == 16 and all(c in "0123456789abcdef" for c in minted)
