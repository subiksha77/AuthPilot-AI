"""
Tests for text extraction, file upload validation, and parsing utilities.
"""

import io
import pytest
from app.validators import (
    validate_file_upload,
    DocumentValidationError,
    parse_and_normalize_date,
    parse_currency_amount,
    validate_date_range
)
from app.extraction import (
    extract_document_text,
    extract_text_from_pdf,
    check_tesseract_availability,
    PageExtraction,
    DocumentExtractionResult
)


def test_validate_file_upload_valid_pdf():
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    ext, mime = validate_file_upload("sample.pdf", "application/pdf", pdf_bytes)
    assert ext == ".pdf"
    assert mime == "application/pdf"


def test_validate_file_upload_valid_png():
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    ext, mime = validate_file_upload("card.png", "image/png", png_bytes)
    assert ext == ".png"
    assert mime == "image/png"


def test_validate_file_upload_valid_jpeg():
    jpg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF"
    ext, mime = validate_file_upload("bill.jpg", "image/jpeg", jpg_bytes)
    assert ext in {".jpg", ".jpeg"}
    assert mime == "image/jpeg"


def test_validate_file_upload_empty_file():
    with pytest.raises(DocumentValidationError) as exc:
        validate_file_upload("empty.pdf", "application/pdf", b"")
    assert exc.value.status_code == 400
    assert "empty" in exc.value.message.lower()


def test_validate_file_upload_oversized():
    oversized = b"%PDF-" + b"0" * 1024
    with pytest.raises(DocumentValidationError) as exc:
        validate_file_upload("big.pdf", "application/pdf", oversized, max_size_bytes=500)
    assert exc.value.status_code == 413
    assert "exceeds" in exc.value.message.lower()


def test_validate_file_upload_unsupported_extension():
    with pytest.raises(DocumentValidationError) as exc:
        validate_file_upload("virus.exe", "application/octet-stream", b"MZ\x90\x00")
    assert exc.value.status_code == 415


def test_validate_file_upload_disguised_file():
    # File named .pdf but containing plain text or bash script
    with pytest.raises(DocumentValidationError) as exc:
        validate_file_upload("fake.pdf", "application/pdf", b"#!/bin/bash\necho hello")
    assert exc.value.status_code == 400
    assert "signature does not match" in exc.value.message


def test_parse_and_normalize_date():
    assert parse_and_normalize_date("2026-03-15") == "2026-03-15"
    assert parse_and_normalize_date("15/03/2026") == "2026-03-15"
    assert parse_and_normalize_date("15-03-2026") == "2026-03-15"
    assert parse_and_normalize_date("March 15, 2026") == "2026-03-15"
    assert parse_and_normalize_date("15 Mar 2026") == "2026-03-15"
    assert parse_and_normalize_date("invalid-date") is None
    assert parse_and_normalize_date("") is None


def test_parse_currency_amount():
    assert parse_currency_amount("$12,500.50") == 12500.50
    assert parse_currency_amount("Rs. 45,000") == 45000.0
    assert parse_currency_amount("INR 1,20,500.00") == 120500.00
    assert parse_currency_amount("3500") == 3500.0
    assert parse_currency_amount("Not An Amount") is None


def test_validate_date_range():
    valid, msg = validate_date_range("2026-03-01", "2026-03-10")
    assert valid is True
    assert msg is None

    invalid, msg = validate_date_range("2026-03-15", "2026-03-10")
    assert invalid is False
    assert "Start date" in msg


def test_extract_text_from_pdf_in_memory():
    """Generates an in-memory test PDF using PyMuPDF and verifies text extraction."""
    import fitz

    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "Demo Health Insurance Policy Document\nPolicy No: POL-TEST-12345\nPatient Name: John Doe")
    pdf_bytes = doc.tobytes()
    doc.close()

    result = extract_document_text(pdf_bytes, "application/pdf")
    assert result.total_pages == 1
    assert len(result.pages) == 1
    assert "POL-TEST-12345" in result.pages[0].text
    assert "John Doe" in result.pages[0].text
    assert result.pages[0].method == "pymupdf"


def test_extract_text_from_corrupted_pdf():
    corrupted_bytes = b"%PDF-corrupted-content-without-valid-structure"
    result = extract_document_text(corrupted_bytes, "application/pdf")
    assert len(result.errors) > 0 or result.total_pages == 0
