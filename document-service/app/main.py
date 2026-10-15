"""
FastAPI application for AuthPilot AI Document Processing Service.
Exposes endpoints for document upload & extraction, cross-document comparison,
individual document retrieval, and health checks.
"""

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from dotenv import load_dotenv

# Load environment configuration
load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.schemas import (
    DocumentExtractResponse,
    DocumentCompareRequest,
    DocumentCompareResponse,
    HealthResponse
)
from app.validators import validate_file_upload, DocumentValidationError
from app.extraction import extract_document_text, check_tesseract_availability
from app.field_parser import parse_document_fields
from app.document_compare import compare_documents

# Setup logging
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("document-service")

# Initialize FastAPI app
app = FastAPI(
    title="AuthPilot AI - Document Processing Service",
    description="Microservice for extracting clinical and insurance data, validating fields, and detecting inconsistencies.",
    version="1.0.0"
)

# In-memory document storage for the standalone prototype
documents_store: Dict[str, DocumentExtractResponse] = {}

# CORS configuration
raw_cors = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://localhost:8080,http://127.0.0.1:3000,http://127.0.0.1:5173"
)
allowed_origins = [origin.strip() for origin in raw_cors.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(DocumentValidationError)
async def handle_validation_error(request, exc: DocumentValidationError):
    """Handles structured document validation errors safely."""
    logger.warning("Upload validation failed: %s", exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "DocumentValidationError",
            "message": exc.message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )


@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Returns service health, version, and OCR status."""
    return HealthResponse(
        status="healthy",
        service="document-processing-service",
        version="1.0.0",
        tesseractAvailable=check_tesseract_availability(),
        timestamp=datetime.now(timezone.utc).isoformat()
    )


@app.post(
    "/api/documents/extract",
    response_model=DocumentExtractResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Documents"]
)
async def extract_document(
    file: UploadFile = File(..., description="Document file (PDF, PNG, JPG)")
):
    """
    Accepts a clinical or insurance document upload (PDF, PNG, JPG).
    Validates file headers, extracts text per page, classifies document type,
    parses structured fields with evidence, and flags missing or malformed fields.
    """
    logger.info("Received file upload: %s (Content-Type: %s)", file.filename, file.content_type)

    # 1. Read binary content
    try:
        file_bytes = await file.read()
    except Exception as e:
        logger.error("Failed to read uploaded stream: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read uploaded file stream."
        )

    # 2. Validate file type, magic bytes, and file size
    ext, detected_mime = validate_file_upload(
        filename=file.filename,
        content_type=file.content_type,
        file_bytes=file_bytes
    )

    # 3. Generate unique document ID
    short_uuid = uuid.uuid4().hex[:8].upper()
    doc_id = f"DOC-DEMO-{short_uuid}"

    # 4. Perform text extraction (PyMuPDF with OCR fallback)
    extraction_result = extract_document_text(file_bytes, detected_mime)

    if extraction_result.errors:
        logger.error("Extraction error for doc %s: %s", doc_id, extraction_result.errors)
        return DocumentExtractResponse(
            documentId=doc_id,
            documentType="unknown",
            status="failed",
            fields={},
            missingFields=[],
            warnings=extraction_result.warnings + extraction_result.errors,
            pageCount=0,
            metadata={
                "filename": file.filename,
                "fileSizeBytes": len(file_bytes),
                "mimeType": detected_mime,
                "ocrUsed": extraction_result.ocr_used
            }
        )

    # 5. Parse fields and classify document
    extracted_response = parse_document_fields(doc_id, extraction_result)

    # Add technical metadata
    if extracted_response.metadata is None:
        extracted_response.metadata = {}
    extracted_response.metadata.update({
        "filename": file.filename,
        "fileSizeBytes": len(file_bytes),
        "mimeType": detected_mime,
        "processedAt": datetime.now(timezone.utc).isoformat()
    })

    # 6. Save in in-memory store for retrieval and comparison
    documents_store[doc_id] = extracted_response

    logger.info(
        "Successfully processed document %s: type=%s, pages=%d, missing=%d",
        doc_id, extracted_response.documentType, extracted_response.pageCount, len(extracted_response.missingFields)
    )

    return extracted_response


@app.post(
    "/api/documents/compare",
    response_model=DocumentCompareResponse,
    tags=["Documents"]
)
async def compare_extracted_documents(payload: DocumentCompareRequest):
    """
    Accepts previously extracted document IDs or full DocumentExtractResponse payloads.
    Cross-checks policy numbers, patient names, claim IDs, and timeline consistency
    to surface conflicts and identify missing pieces in the prior-authorization package.
    """
    docs_to_compare: List[DocumentExtractResponse] = []

    # If documents payload is provided directly
    if payload.documents:
        docs_to_compare.extend(payload.documents)

    # If document IDs are provided, look up from in-memory store
    if payload.documentIds:
        for d_id in payload.documentIds:
            if d_id in documents_store:
                # Avoid duplicate entries if provided in both
                if not any(d.documentId == d_id for d in docs_to_compare):
                    docs_to_compare.append(documents_store[d_id])
            else:
                logger.warning("Document ID %s requested for comparison was not found in store.", d_id)

    if len(docs_to_compare) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one valid document must be provided or referenced for comparison."
        )

    result = compare_documents(docs_to_compare)
    return result


@app.get(
    "/api/documents/{document_id}",
    response_model=DocumentExtractResponse,
    tags=["Documents"]
)
async def get_document_result(document_id: str):
    """
    Returns the processing status and extracted result for an existing document.
    """
    if document_id not in documents_store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' was not found."
        )
    return documents_store[document_id]


@app.get(
    "/api/documents",
    response_model=List[DocumentExtractResponse],
    tags=["Documents"]
)
async def list_documents():
    """
    Returns all processed documents currently held in the in-memory store.
    Useful for local frontend verification by Member 1.
    """
    return list(documents_store.values())
