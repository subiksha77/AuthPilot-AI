"""
Text extraction module supporting PyMuPDF for PDFs and Tesseract OCR for scanned docs and images.
Preserves page numbers, tracks extraction methods, and gracefully degrades when OCR is unavailable.
"""

import io
import os
import shutil
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("document-service.extraction")

# Optional OCR setup
_TESSERACT_AVAILABLE = False
try:
    import pytesseract
    from PIL import Image

    # Configure custom binary path if provided in environment
    tess_cmd = os.getenv("TESSERACT_CMD")
    if tess_cmd and os.path.exists(tess_cmd):
        pytesseract.pytesseract.tesseract_cmd = tess_cmd
    elif shutil.which("tesseract"):
        pytesseract.pytesseract.tesseract_cmd = "tesseract"
    elif os.path.exists(r"C:\Program Files\Tesseract-OCR\tesseract.exe"):
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

    try:
        # Check if tesseract binary responds
        pytesseract.get_tesseract_version()
        _TESSERACT_AVAILABLE = True
        logger.info("Tesseract OCR is available and enabled.")
    except Exception as e:
        logger.info("pytesseract installed, but Tesseract binary is not operational: %s", str(e))
        _TESSERACT_AVAILABLE = False
except ImportError:
    logger.info("pytesseract or PIL is not installed; OCR fallback disabled.")
    _TESSERACT_AVAILABLE = False


def check_tesseract_availability() -> bool:
    """Returns True if Tesseract OCR is currently configured and operational."""
    return _TESSERACT_AVAILABLE


class PageExtraction:
    """Represents text extracted from a single document page."""
    def __init__(self, page_number: int, text: str, method: str, char_count: int):
        self.page_number = page_number
        self.text = text
        self.method = method  # "pymupdf", "ocr", or "empty"
        self.char_count = char_count

    def to_dict(self) -> Dict[str, Any]:
        return {
            "pageNumber": self.page_number,
            "text": self.text,
            "method": self.method,
            "charCount": self.char_count
        }


class DocumentExtractionResult:
    """Represents the complete text extraction output across all document pages."""
    def __init__(
        self,
        pages: List[PageExtraction],
        total_pages: int,
        ocr_used: bool = False,
        has_scanned_content: bool = False,
        warnings: Optional[List[str]] = None,
        errors: Optional[List[str]] = None
    ):
        self.pages = pages
        self.total_pages = total_pages
        self.ocr_used = ocr_used
        self.has_scanned_content = has_scanned_content
        self.warnings = warnings or []
        self.errors = errors or []


def extract_text_from_pdf(file_bytes: bytes) -> DocumentExtractionResult:
    """
    Extracts text page-by-page from PDF using PyMuPDF (fitz).
    Detects sparse/scanned pages and falls back to OCR if Tesseract is available.
    """
    import fitz  # PyMuPDF

    pages: List[PageExtraction] = []
    warnings: List[str] = []
    ocr_used = False
    has_scanned_content = False

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        logger.error("Failed to open PDF document: %s", type(e).__name__)
        return DocumentExtractionResult(
            pages=[],
            total_pages=0,
            errors=[f"Malformed or encrypted PDF document: {str(e)}"]
        )

    total_pages = doc.page_count
    if total_pages == 0:
        return DocumentExtractionResult(
            pages=[],
            total_pages=0,
            warnings=["PDF contains zero pages."]
        )

    for page_idx in range(total_pages):
        page_num = page_idx + 1
        page = doc.load_page(page_idx)
        raw_text = page.get_text("text").strip()

        # Check if the page has sparse or no extractable text (< 30 characters)
        if len(raw_text) < 30:
            has_scanned_content = True
            if _TESSERACT_AVAILABLE:
                try:
                    logger.info("Page %d has low text layer (%d chars). Attempting OCR fallback.", page_num, len(raw_text))
                    # Render page to pixmap at 150 DPI for OCR
                    pix = page.get_pixmap(dpi=150)
                    img = Image.open(io.BytesIO(pix.tobytes("png")))
                    ocr_text = pytesseract.image_to_string(img).strip()
                    if len(ocr_text) > len(raw_text):
                        raw_text = ocr_text
                        pages.append(PageExtraction(page_num, raw_text, "ocr", len(raw_text)))
                        ocr_used = True
                        continue
                except Exception as ocr_err:
                    logger.warning("OCR failed on page %d: %s", page_num, str(ocr_err))
                    warnings.append(f"OCR fallback encountered an error on page {page_num}.")
            else:
                warnings.append(
                    f"Page {page_num} contains little or no extractable text (scanned document). "
                    "Tesseract OCR is not installed or available on this host."
                )

        method = "pymupdf" if len(raw_text) > 0 else "empty"
        pages.append(PageExtraction(page_num, raw_text, method, len(raw_text)))

    doc.close()

    return DocumentExtractionResult(
        pages=pages,
        total_pages=total_pages,
        ocr_used=ocr_used,
        has_scanned_content=has_scanned_content,
        warnings=warnings
    )


def extract_text_from_image(file_bytes: bytes, mime_type: str) -> DocumentExtractionResult:
    """
    Extracts text from PNG or JPEG images using Tesseract OCR if available.
    """
    warnings: List[str] = []
    errors: List[str] = []

    if not _TESSERACT_AVAILABLE:
        warnings.append(
            "Uploaded an image file, but Tesseract OCR is not installed or operational on this host. "
            "Text cannot be extracted from images without OCR."
        )
        return DocumentExtractionResult(
            pages=[PageExtraction(1, "", "empty", 0)],
            total_pages=1,
            ocr_used=False,
            has_scanned_content=True,
            warnings=warnings
        )

    try:
        img = Image.open(io.BytesIO(file_bytes))
        ocr_text = pytesseract.image_to_string(img).strip()
        pages = [PageExtraction(1, ocr_text, "ocr", len(ocr_text))]
        return DocumentExtractionResult(
            pages=pages,
            total_pages=1,
            ocr_used=True,
            has_scanned_content=True,
            warnings=warnings
        )
    except Exception as e:
        logger.error("Failed to process image with OCR: %s", str(e))
        errors.append(f"Image processing error: {str(e)}")
        return DocumentExtractionResult(
            pages=[PageExtraction(1, "", "empty", 0)],
            total_pages=1,
            ocr_used=False,
            has_scanned_content=True,
            errors=errors
        )


def extract_document_text(file_bytes: bytes, detected_mime: str) -> DocumentExtractionResult:
    """
    Main entry point for extracting text based on MIME type.
    """
    if detected_mime == "application/pdf":
        return extract_text_from_pdf(file_bytes)
    elif detected_mime in {"image/png", "image/jpeg"}:
        return extract_text_from_image(file_bytes, detected_mime)
    else:
        return DocumentExtractionResult(
            pages=[],
            total_pages=0,
            errors=[f"Unsupported MIME type for text extraction: {detected_mime}"]
        )
