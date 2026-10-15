"""
Validation utilities for documents and extracted fields.
Ensures secure upload validation, magic byte checking, and data sanity checks.
"""

import os
import re
from typing import Tuple, Optional, Dict, Any, List
from datetime import datetime


# Supported file types and their magic bytes
ALLOWED_MIME_TYPES = {
    "application/pdf": [b"%PDF-"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/jpg": [b"\xff\xd8\xff"]
}

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}

# Default max upload size: 15MB
DEFAULT_MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_FILE_SIZE_MB", "15")) * 1024 * 1024


class DocumentValidationError(Exception):
    """Raised when an uploaded document fails structural or safety validation."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def validate_file_upload(
    filename: Optional[str],
    content_type: Optional[str],
    file_bytes: bytes,
    max_size_bytes: int = DEFAULT_MAX_FILE_SIZE_BYTES
) -> Tuple[str, str]:
    """
    Validates uploaded file size, extension, and header magic bytes.
    Returns normalized (extension, detected_mime_type).
    Raises DocumentValidationError on validation failure.
    """
    if not file_bytes:
        raise DocumentValidationError("Uploaded file is empty (0 bytes).", status_code=400)

    if len(file_bytes) > max_size_bytes:
        max_mb = max_size_bytes / (1024 * 1024)
        raise DocumentValidationError(
            f"File size exceeds maximum allowed limit of {max_mb:.1f} MB.",
            status_code=413
        )

    # Check extension
    if not filename:
        raise DocumentValidationError("Missing filename in uploaded document.", status_code=400)

    ext = os.path.splitext(filename.lower())[1]
    if ext not in ALLOWED_EXTENSIONS:
        allowed_list = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise DocumentValidationError(
            f"Unsupported file extension '{ext}'. Allowed extensions are: {allowed_list}.",
            status_code=415
        )

    # Validate magic bytes / file signatures to prevent disguised executables
    header = file_bytes[:16]
    detected_type = None

    if header.startswith(b"%PDF-"):
        detected_type = "application/pdf"
    elif header.startswith(b"\x89PNG\r\n\x1a\n"):
        detected_type = "image/png"
    elif header.startswith(b"\xff\xd8\xff"):
        detected_type = "image/jpeg"

    if detected_type is None:
        raise DocumentValidationError(
            "File header signature does not match expected PDF, PNG, or JPG formats. "
            "File content may be corrupted or disguised.",
            status_code=400
        )

    # Confirm extension matches detected magic bytes
    if ext == ".pdf" and detected_type != "application/pdf":
        raise DocumentValidationError("File extension is .pdf but binary content is not a valid PDF.", status_code=400)
    if ext in {".png"} and detected_type != "image/png":
        raise DocumentValidationError("File extension is .png but binary content is not a valid PNG.", status_code=400)
    if ext in {".jpg", ".jpeg"} and detected_type != "image/jpeg":
        raise DocumentValidationError("File extension is .jpg/.jpeg but binary content is not a valid JPEG.", status_code=400)

    return ext, detected_type


def parse_and_normalize_date(date_str: Optional[str]) -> Optional[str]:
    """
    Attempts to parse date strings of various formats and normalize to ISO YYYY-MM-DD.
    Returns normalized string, or None if unparseable.
    """
    if not date_str:
        return None

    cleaned = date_str.strip()
    # Strip common label prefixes like "Date:", "DOA:", "Admitted on:", etc.
    cleaned = re.sub(
        r"^(?:Date|DOA|DOD|Valid\s*(?:From|To|Till|Thru)?|From|To|Till|Thru|Since|On|Admitted(?:\s*on)?|Discharged(?:\s*on)?)\s*[:\-]?\s*",
        "",
        cleaned,
        flags=re.IGNORECASE
    )
    cleaned = cleaned.strip(" \t\r\n:-#")

    # Known formats
    formats_to_try = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%d-%m-%Y",
        "%m-%d-%Y",
        "%d.%m.%Y",
        "%Y/%m/%d",
        "%d %B %Y",
        "%d %b %Y",
        "%B %d, %Y",
        "%b %d, %Y",
        "%B %d %Y",
        "%b %d %Y",
        "%d-%b-%Y",
        "%d-%B-%Y"
    ]

    for fmt in formats_to_try:
        try:
            dt = datetime.strptime(cleaned, fmt)
            # Basic sanity check on year
            if 1950 <= dt.year <= 2050:
                return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue

    # Regex for ISO-like YYYY-MM-DD
    iso_match = re.search(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b", cleaned)
    if iso_match:
        y, m, d = int(iso_match.group(1)), int(iso_match.group(2)), int(iso_match.group(3))
        if 1950 <= y <= 2050 and 1 <= m <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{m:02d}-{d:02d}"

    # Regex for DD/MM/YYYY or DD-MM-YYYY
    dmy_match = re.search(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b", cleaned)
    if dmy_match:
        d, m, y = int(dmy_match.group(1)), int(dmy_match.group(2)), int(dmy_match.group(3))
        if 1950 <= y <= 2050 and 1 <= m <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{m:02d}-{d:02d}"

    return None


def parse_currency_amount(amount_str: Optional[str]) -> Optional[float]:
    """
    Parses currency or bill amounts, handling commas, currency symbols, and whitespace.
    """
    if not amount_str:
        return None

    cleaned = amount_str.strip()
    # Remove currency abbreviations like Rs., INR, USD, EUR, GBP, $, etc.
    cleaned = re.sub(r"(?i)\b(?:rs|inr|usd|eur|gbp|cad|aud)\.?\s*", "", cleaned)
    cleaned = re.sub(r"[$€£₹]", "", cleaned).strip()

    # Match numeric portion: supports both standard 1,250.00 and Indian numbering 1,20,500.00
    match = re.search(r"(\d+(?:[,\s]\d+)*(?:\.\d+)?)", cleaned)
    if not match:
        return None

    num_str = match.group(1).replace(",", "").replace(" ", "")
    try:
        val = float(num_str)
        if 0 <= val <= 100_000_000:
            return val
    except (ValueError, TypeError):
        pass

    return None


def validate_date_range(start_date_str: Optional[str], end_date_str: Optional[str]) -> Tuple[bool, Optional[str]]:
    """
    Validates that start_date <= end_date.
    Returns (is_valid, warning_message).
    """
    if not start_date_str or not end_date_str:
        return True, None

    s_norm = parse_and_normalize_date(start_date_str)
    e_norm = parse_and_normalize_date(end_date_str)

    if s_norm and e_norm:
        if s_norm > e_norm:
            return False, f"Start date ({s_norm}) is after end date ({e_norm})."

    return True, None
