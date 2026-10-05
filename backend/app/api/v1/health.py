"""
Health check and OCR/Upload routes.
"""
from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import text
import structlog

from app.core.config import settings
from app.schemas.schemas import HealthResponse

router = APIRouter()
logger = structlog.get_logger()


@router.get("/health", response_model=HealthResponse)
async def health():
    """Service health check — verifies all dependencies."""
    db_status = "unknown"
    redis_status = "unknown"
    llm_status = "unknown"
    search_status = "unknown"

    # DB check
    try:
        from app.core.database import engine
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)[:50]}"

    # Redis check
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.REDIS_URL)
        await r.ping()
        redis_status = "ok"
    except Exception as e:
        redis_status = f"error: {str(e)[:50]}"

    # LLM check
    if settings.LLM_PROVIDER == "gemini" and settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here":
        llm_status = "configured"
    elif settings.LLM_PROVIDER == "openai" and settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "your_openai_api_key_here":
        llm_status = "configured"
    else:
        llm_status = "not_configured"

    # Search check
    if settings.TAVILY_API_KEY and settings.TAVILY_API_KEY != "your_tavily_api_key_here":
        search_status = "configured"
    else:
        search_status = "not_configured"

    return HealthResponse(
        status="ok",
        version="1.0.0",
        database=db_status,
        redis=redis_status,
        llm=llm_status,
        search=search_status,
    )


@router.post("/ocr")
async def ocr_image(file: UploadFile = File(...)):
    """Extract text from an uploaded image via OCR."""
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    content = await file.read()

    if len(content) > max_bytes:
        raise HTTPException(413, f"File too large. Max {settings.MAX_FILE_SIZE_MB}MB.")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(415, "Only image files are supported for OCR.")

    try:
        from app.services.ocr_service import ocr_service
        processed = ocr_service.preprocess_image(content)
        text, confidence = ocr_service.extract_text(processed)

        if not text:
            return JSONResponse(
                status_code=422,
                content={"error": "No text could be extracted from the image.", "ocr_confidence": 0.0}
            )

        return {
            "text": text,
            "ocr_confidence": confidence,
            "character_count": len(text),
            "low_confidence": confidence < 0.6,
            "warning": "OCR confidence is low. Please review the extracted text." if confidence < 0.6 else None,
        }
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Extract text from PDF, TXT, or DOCX."""
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    content = await file.read()

    if len(content) > max_bytes:
        raise HTTPException(413, f"File too large. Max {settings.MAX_FILE_SIZE_MB}MB.")

    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    try:
        if ext == "txt":
            text = content.decode("utf-8", errors="replace")

        elif ext == "pdf":
            import PyPDF2
            import io
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            pages = []
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                pages.append({"page": i + 1, "text": page_text})
            text = "\n\n".join(p["text"] for p in pages)

        elif ext == "docx":
            import docx
            import io
            doc = docx.Document(io.BytesIO(content))
            text = "\n".join(p.text for p in doc.paragraphs)

        else:
            raise HTTPException(415, f"Unsupported file type: .{ext}. Supported: PDF, TXT, DOCX")

        if not text.strip():
            raise HTTPException(422, "No text could be extracted from the document.")

        return {
            "text": text[:settings.MAX_INPUT_LENGTH],
            "character_count": len(text),
            "truncated": len(text) > settings.MAX_INPUT_LENGTH,
            "file_type": ext,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to process document: {str(e)}")
