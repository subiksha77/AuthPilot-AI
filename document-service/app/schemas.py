"""
Pydantic schemas and data transfer objects for AuthPilot AI Document Processing Service.
"""

from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field


class FieldEvidence(BaseModel):
    """
    Evidence and metadata associated with an extracted field value.
    Fulfills standard response format and Section 3.E traceability requirements.
    """
    value: Optional[Union[str, float, int, bool]] = Field(
        default=None,
        description="The extracted raw or normalized value. Null if not reliably found."
    )
    sourcePage: Optional[int] = Field(
        default=None,
        description="The 1-based page number where the evidence was located."
    )
    confidence: Optional[Union[float, str]] = Field(
        default=None,
        description="Confidence indicator (e.g. 0.95 or descriptive indicator). Null if not calibrated."
    )
    sourceDocumentId: Optional[str] = Field(
        default=None,
        description="The unique ID of the document where this field was extracted from."
    )
    excerpt: Optional[str] = Field(
        default=None,
        description="A short supporting text excerpt providing evidence for manual review."
    )
    status: Optional[str] = Field(
        default="extracted",
        description="Status of field extraction: 'extracted', 'missing', 'unverified', or 'invalid'."
    )


class DocumentExtractResponse(BaseModel):
    """
    Standard response format returned by POST /api/documents/extract
    and GET /api/documents/{document_id}.
    """
    documentId: str = Field(..., description="Unique generated document identifier (e.g. DOC-xxxx).")
    documentType: str = Field(
        ...,
        description="Classified document type: insurance_card, health_insurance_policy, "
                    "hospital_admission_note, medical_bill, test_report, discharge_summary, or unknown."
    )
    status: str = Field(
        ...,
        description="Processing status: 'processed', 'partial', or 'failed'."
    )
    fields: Dict[str, FieldEvidence] = Field(
        default_factory=dict,
        description="Key-value dictionary of extracted fields with evidence."
    )
    missingFields: List[str] = Field(
        default_factory=list,
        description="List of expected fields for this document type that could not be found."
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Non-fatal warnings, such as OCR fallback usage, low resolution, or format anomalies."
    )
    pageCount: int = Field(default=1, description="Total number of pages processed.")
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Technical metadata (file name, size, extraction method, timestamps)."
    )


class ConflictingValue(BaseModel):
    """Details of a single conflicting field value in multi-document comparison."""
    documentId: str
    documentType: Optional[str] = None
    sourcePage: Optional[int] = None
    value: Any = None
    excerpt: Optional[str] = None


class InconsistencyItem(BaseModel):
    """Structured report of an identified discrepancy or invalid relationship."""
    field: str = Field(..., description="The field name or relationship in conflict.")
    issueType: str = Field(
        ...,
        description="Type of issue: 'conflict', 'date_range_invalid', 'coverage_expired', 'format_mismatch'."
    )
    description: str = Field(..., description="Human-readable explanation of the inconsistency.")
    severity: str = Field("medium", description="'high', 'medium', or 'low'.")
    conflictingValues: List[ConflictingValue] = Field(
        default_factory=list,
        description="The specific values and sources that contradict each other."
    )


class DocumentCompareRequest(BaseModel):
    """
    Request payload for POST /api/documents/compare.
    Can accept a list of previously extracted document IDs or full DocumentExtractResponse payloads.
    """
    documentIds: Optional[List[str]] = Field(
        default=None,
        description="List of document IDs stored in the service to compare."
    )
    documents: Optional[List[DocumentExtractResponse]] = Field(
        default=None,
        description="Full extraction response objects to compare directly."
    )


class DocumentCompareResponse(BaseModel):
    """Response payload for multi-document cross-verification."""
    comparisonStatus: str = Field(
        ...,
        description="'consistent', 'conflicts_found', or 'insufficient_documents'."
    )
    totalDocuments: int
    documentIds: List[str]
    inconsistencies: List[InconsistencyItem]
    crossDocumentMissingFields: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Map of documentId to its missing required fields."
    )
    unifiedSummary: Dict[str, Any] = Field(
        default_factory=dict,
        description="Synthesized best-available values across all analyzed documents."
    )
    warnings: List[str] = Field(default_factory=list)


class HealthResponse(BaseModel):
    """Response for GET /health."""
    status: str
    service: str
    version: str
    tesseractAvailable: bool
    timestamp: str
