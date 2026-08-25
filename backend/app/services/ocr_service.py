"""
OCR Service — extracts text from images using Tesseract via pytesseract.
"""
import io
import base64
from typing import Tuple, Optional
import structlog

logger = structlog.get_logger()


class OCRService:
    """Extracts text from images. Falls back gracefully if Tesseract unavailable."""

    def extract_text(self, image_bytes: bytes) -> Tuple[str, float]:
        """
        Extract text from image bytes.

        Returns:
            (extracted_text, confidence_0_to_1)
        """
        try:
            import pytesseract
            from PIL import Image

            image = Image.open(io.BytesIO(image_bytes))
            # Get detailed output for confidence
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)

            # Calculate confidence
            confidences = [int(c) for c in data["conf"] if str(c) != "-1"]
            avg_confidence = sum(confidences) / len(confidences) / 100 if confidences else 0.0

            text = pytesseract.image_to_string(image).strip()
            logger.info("ocr_complete", text_length=len(text), confidence=avg_confidence)
            return text, avg_confidence

        except ImportError:
            logger.warning("pytesseract_not_installed")
            raise RuntimeError(
                "OCR is not available. Install Tesseract and pytesseract to enable screenshot verification."
            )
        except Exception as e:
            logger.error("ocr_error", error=str(e))
            raise RuntimeError(f"OCR failed: {str(e)}")

    def preprocess_image(self, image_bytes: bytes) -> bytes:
        """Enhance image for better OCR accuracy."""
        try:
            from PIL import Image, ImageFilter, ImageEnhance
            img = Image.open(io.BytesIO(image_bytes))

            # Convert to grayscale
            img = img.convert("L")
            # Increase contrast
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(2.0)
            # Sharpen
            img = img.filter(ImageFilter.SHARPEN)

            buf = io.BytesIO()
            img.save(buf, format="PNG")
            return buf.getvalue()
        except Exception:
            return image_bytes


ocr_service = OCRService()
