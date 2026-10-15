"""
Rule-based field extraction and document classification engine for AuthPilot AI.
Extracts insurance and clinical entities with page-level evidence, excerpts, and confidence.
Identifies missing fields and invalid internal values without inventing synthetic data.
"""

import re
import logging
from typing import List, Dict, Any, Tuple, Optional
from app.schemas import FieldEvidence, DocumentExtractResponse
from app.extraction import DocumentExtractionResult, PageExtraction
from app.validators import parse_and_normalize_date, parse_currency_amount, validate_date_range

logger = logging.getLogger("document-service.field_parser")

# Known Insurers for deterministic recognition
KNOWN_INSURERS = [
    "Star Health", "Care Health", "HDFC ERGO", "ICICI Lombard", "Bajaj Allianz",
    "National Insurance", "New India Assurance", "Oriental Insurance", "United India Insurance",
    "Niva Bupa", "Max Bupa", "Apollo Munich", "Tata AIG", "Aditya Birla Health",
    "UnitedHealthcare", "Blue Cross Blue Shield", "Aetna", "Cigna", "Humana",
    "Kaiser Permanente", "Demo Health Insurance", "Medicare", "Medicaid"
]

# Mandatory / Expected fields per classified document type
EXPECTED_FIELDS_BY_DOCTYPE = {
    "insurance_card": [
        "insurerName", "policyNumber", "policyholderName", "policyStartDate", "policyEndDate"
    ],
    "health_insurance_policy": [
        "insurerName", "policyNumber", "policyholderName", "sumInsured", "policyStartDate", "policyEndDate"
    ],
    "hospital_admission_note": [
        "patientName", "hospitalName", "admissionDate", "diagnosis"
    ],
    "medical_bill": [
        "patientName", "hospitalName", "billAmount", "documentDate"
    ],
    "discharge_summary": [
        "patientName", "hospitalName", "admissionDate", "dischargeDate", "diagnosis"
    ],
    "test_report": [
        "patientName", "documentDate", "diagnosis"
    ],
    "unknown": []
}


def classify_document_type(full_text: str) -> str:
    """
    Classifies document type based on domain keywords and structural cues.
    Returns: insurance_card, health_insurance_policy, hospital_admission_note,
             medical_bill, discharge_summary, test_report, or unknown.
    """
    lower = full_text.lower()

    scores = {
        "insurance_card": 0,
        "health_insurance_policy": 0,
        "hospital_admission_note": 0,
        "medical_bill": 0,
        "discharge_summary": 0,
        "test_report": 0
    }

    # Cues for insurance card
    if any(k in lower for k in ["insurance card", "health card", "member id", "member identification", "rxbin", "copay", "group no", "group number"]):
        scores["insurance_card"] += 4
    if "card" in lower and "valid" in lower:
        scores["insurance_card"] += 2

    # Cues for health insurance policy
    if any(k in lower for k in ["policy schedule", "schedule of insurance", "terms and conditions", "certificate of insurance", "policy wording", "sum insured"]):
        scores["health_insurance_policy"] += 4
    if any(k in lower for k in ["policyholder", "premium details", "period of insurance"]):
        scores["health_insurance_policy"] += 2

    # Cues for hospital admission note
    if any(k in lower for k in ["admission note", "admitted on", "date of admission", "inpatient admission", "ipd admission", "chief complaint"]):
        scores["hospital_admission_note"] += 4
    if any(k in lower for k in ["vitals on admission", "history of present illness", "provisional diagnosis"]):
        scores["hospital_admission_note"] += 2

    # Cues for medical bill
    if any(k in lower for k in ["final bill", "tax invoice", "bill amount", "total bill", "interim bill", "amount payable", "hospital bill", "detailed bill"]):
        scores["medical_bill"] += 4
    if any(k in lower for k in ["room rent", "pharmacy charges", "grand total", "net payable"]):
        scores["medical_bill"] += 2

    # Cues for discharge summary
    if any(k in lower for k in ["discharge summary", "date of discharge", "condition at discharge", "hospital course", "discharge advice"]):
        scores["discharge_summary"] += 5
    if any(k in lower for k in ["treatment given", "discharge medication", "follow up instructions"]):
        scores["discharge_summary"] += 2

    # Cues for test report
    if any(k in lower for k in ["lab report", "diagnostic report", "pathology report", "radiology report", "investigation report"]):
        scores["test_report"] += 5
    if any(k in lower for k in ["specimen", "reference range", "observed value", "test name"]):
        scores["test_report"] += 2

    best_type, best_score = max(scores.items(), key=lambda x: x[1])
    if best_score >= 3:
        return best_type
    return "unknown"


def _extract_excerpt(text: str, start_idx: int, end_idx: int, window: int = 40) -> str:
    """Extracts a readable single-line excerpt surrounding a matched string."""
    start = max(0, start_idx - window)
    end = min(len(text), end_idx + window)
    raw = text[start:end]
    cleaned = re.sub(r"[\r\n\t]+", " ", raw).strip()
    return cleaned


def _search_patterns(
    pages: List[PageExtraction],
    patterns: List[str],
    doc_id: str,
    normalizer=None,
    confidence_score: float = 0.95
) -> FieldEvidence:
    """
    Searches regex patterns sequentially across document pages.
    Returns FieldEvidence on first verified match.
    """
    for page in pages:
        p_text = page.text
        if not p_text:
            continue

        for pat in patterns:
            match = re.search(pat, p_text, flags=re.IGNORECASE | re.MULTILINE)
            if match:
                raw_val = match.group(1).strip()
                # Ensure single-line extraction so subsequent lines are never captured
                raw_val = raw_val.split("\n")[0].split("\r")[0].strip()
                # Clean punctuation at end
                raw_val = re.sub(r"^[^\w]+|[^\w]+$", "", raw_val)
                if not raw_val:
                    continue

                val = normalizer(raw_val) if normalizer else raw_val
                if val is not None:
                    excerpt = _extract_excerpt(p_text, match.start(), match.end())
                    return FieldEvidence(
                        value=val,
                        sourcePage=page.page_number,
                        confidence=confidence_score,
                        sourceDocumentId=doc_id,
                        excerpt=excerpt,
                        status="extracted"
                    )

    return FieldEvidence(
        value=None,
        sourcePage=None,
        confidence=None,
        sourceDocumentId=doc_id,
        excerpt=None,
        status="missing"
    )


def extract_insurer_name(pages: List[PageExtraction], doc_id: str) -> FieldEvidence:
    """Extracts insurer or payer organization name."""
    # First check known insurers
    for page in pages:
        for known in KNOWN_INSURERS:
            pattern = re.compile(rf"\b{re.escape(known)}\b", re.IGNORECASE)
            match = pattern.search(page.text)
            if match:
                excerpt = _extract_excerpt(page.text, match.start(), match.end())
                return FieldEvidence(
                    value=known,
                    sourcePage=page.page_number,
                    confidence=0.98,
                    sourceDocumentId=doc_id,
                    excerpt=excerpt,
                    status="extracted"
                )

    patterns = [
        r"(?:Insurer|Insurance\s*Company|Payer(?:\s*Name)?|TPA(?:\s*Name)?|Underwritten\s*by)\s*[:\-]?\s*([A-Za-z0-9 \t&.,'-]{3,50})"
    ]
    return _search_patterns(pages, patterns, doc_id, confidence_score=0.88)


def extract_policy_number(pages: List[PageExtraction], doc_id: str) -> FieldEvidence:
    """Extracts insurance policy or certificate number."""
    patterns = [
        r"(?:Policy\s*(?:No|Number|#|ID)|Certificate\s*No|Contract\s*(?:No|Number)|Card\s*(?:No|Number)|Member\s*ID)\s*[:\-]?\s*([A-Za-z0-9\-\/]{5,30})",
        r"\b(?:Policy|Pol)\s*#?\s*[:\-]?\s*([A-Za-z0-9\-\/]{5,25})\b"
    ]
    return _search_patterns(pages, patterns, doc_id, confidence_score=0.92)


def extract_member_name(pages: List[PageExtraction], doc_id: str) -> FieldEvidence:
    """Extracts member, policyholder, or insured name."""
    patterns = [
        r"(?:Member\s*Name|Policyholder(?:\s*Name)?|Insured(?:\s*Name|\s*Person)?|Name\s*of\s*(?:Insured|Member|Policyholder))\s*[:\-]?\s*([A-Za-z \t.'-]{2,45})",
        r"(?:Cardholder\s*Name|Primary\s*Insured)\s*[:\-]?\s*([A-Za-z \t.'-]{2,45})"
    ]
    return _search_patterns(pages, patterns, doc_id, confidence_score=0.90)


def extract_patient_name(pages: List[PageExtraction], doc_id: str) -> FieldEvidence:
    """Extracts patient name from hospital records, bills, or discharge summaries."""
    patterns = [
        r"(?:Patient\s*Name|Name\s*of\s*(?:Patient|the\s*Patient)|Patient)\s*[:\-]?\s*([A-Za-z \t.'-]{2,45})",
        r"(?:Pt\s*Name|Mr\.|Ms\.|Mrs\.|Dr\.)\s+([A-Za-z \t.'-]{2,35})"
    ]
    res = _search_patterns(pages, patterns, doc_id, confidence_score=0.91)
    if res.value:
        # Clean title prefix if any
        res.value = re.sub(r"^(Mr|Mrs|Ms|Master|Baby|Dr)\.?\s+", "", str(res.value), flags=re.IGNORECASE).strip()
    return res


def extract_hospital_name(pages: List[PageExtraction], doc_id: str) -> FieldEvidence:
    """Extracts hospital, clinic, or healthcare facility name."""
    patterns = [
        r"(?:Hospital\s*Name|Facility(?:\s*Name)?|Provider(?:\s*Name)?|Healthcare\s*Center|Clinic\s*Name)\s*[:\-]?\s*([A-Za-z0-9 \t&.,'-]{4,60})",
        r"\b([A-Za-z0-9 \t&.,'-]+(?:Hospital|Healthcare|Medical\s*Center|Clinic|Health\s*City|Infirmary))\b"
    ]
    return _search_patterns(pages, patterns, doc_id, confidence_score=0.89)


def extract_claim_or_case_id(pages: List[PageExtraction], doc_id: str) -> FieldEvidence:
    """Extracts claim, pre-auth, or case identifier."""
    patterns = [
        r"(?:Claim\s*(?:No|Number|ID|#)|Pre-?Auth\s*(?:No|ID|Number|#)|Case\s*(?:No|ID|Number|#)|Admission\s*No|IPD?\s*(?:No|Number|#))\s*[:\-]?\s*([A-Za-z0-9\-\/]{4,25})"
    ]
    return _search_patterns(pages, patterns, doc_id, confidence_score=0.92)


def extract_dates(pages: List[PageExtraction], doc_id: str) -> Dict[str, FieldEvidence]:
    """Extracts policy start/end, admission, discharge, and document dates."""
    date_patterns = {
        "policyStartDate": [
            r"(?:Policy\s*Start\s*Date|Valid\s*From|Effective\s*Date|Inception\s*Date|Cover\s*From|Period\s*From|Valid\s*Since)\s*[:\-]?\s*([A-Za-z0-9 \t,/-]{6,25})"
        ],
        "policyEndDate": [
            r"(?:Policy\s*(?:End|Expiry)\s*Date|Expiry\s*Date|Valid\s*(?:To|Thru|Through|Till)|Cover\s*To|Period\s*To)\s*[:\-]?\s*([A-Za-z0-9 \t,/-]{6,25})"
        ],
        "admissionDate": [
            r"(?:Admission\s*Date|Date\s*of\s*Admission|Admitted\s*(?:On|Date)|DOA|Date\s*Admitted)\s*[:\-]?\s*([A-Za-z0-9 \t,/-]{6,25})"
        ],
        "dischargeDate": [
            r"(?:Discharge\s*Date|Date\s*of\s*Discharge|Discharged\s*(?:On|Date)|DOD|Date\s*Discharged)\s*[:\-]?\s*([A-Za-z0-9 \t,/-]{6,25})"
        ],
        "documentDate": [
            r"(?:Bill\s*Date|Invoice\s*Date|Report\s*Date|Document\s*Date|Date\s*of\s*Issue|Date)\s*[:\-]?\s*([A-Za-z0-9 \t,/-]{6,25})"
        ]
    }

    results = {}
    for field_name, pats in date_patterns.items():
        results[field_name] = _search_patterns(
            pages, pats, doc_id, normalizer=parse_and_normalize_date, confidence_score=0.93
        )
    return results


def extract_sum_insured(pages: List[PageExtraction], doc_id: str) -> FieldEvidence:
    """Extracts policy sum insured or maximum coverage limit."""
    patterns = [
        r"(?:Sum\s*Insured|Coverage\s*Amount|Basic\s*Sum\s*Insured|Policy\s*Limit|Total\s*Coverage)\s*[:\-]?\s*(?:INR|Rs\.?|\$)?\s*([0-9,]+(?:\.[0-9]{2})?)",
        r"\b(?:Sum\s*Insured|Cover)\s*[:\-]?\s*(?:INR|Rs\.?|\$)?\s*([0-9,]+(?:\.[0-9]{2})?)\b"
    ]
    return _search_patterns(pages, patterns, doc_id, normalizer=parse_currency_amount, confidence_score=0.91)


def extract_bill_amount(pages: List[PageExtraction], doc_id: str) -> FieldEvidence:
    """Extracts total hospital bill or invoice amount."""
    patterns = [
        r"(?:Total\s*(?:Bill|Amount|Charges|Payable)|Grand\s*Total|Net\s*(?:Amount|Payable)|Invoice\s*Total|Total\s*Due|Amount\s*Payable)\s*[:\-]?\s*(?:INR|Rs\.?|\$)?\s*([0-9,]+(?:\.[0-9]{2})?)",
        r"(?:Net\s*Bill\s*Amount|Gross\s*Amount)\s*[:\-]?\s*(?:INR|Rs\.?|\$)?\s*([0-9,]+(?:\.[0-9]{2})?)"
    ]
    return _search_patterns(pages, patterns, doc_id, normalizer=parse_currency_amount, confidence_score=0.92)


def extract_policy_type(pages: List[PageExtraction], doc_id: str) -> FieldEvidence:
    """Extracts policy product name or coverage type."""
    patterns = [
        r"(?:Policy\s*Type|Plan\s*Type|Product\s*Name|Coverage\s*Type|Plan\s*Name|Type\s*of\s*Policy)\s*[:\-]?\s*([A-Za-z0-9 \t\-]{3,40})"
    ]
    return _search_patterns(pages, patterns, doc_id, confidence_score=0.88)


def extract_clinical_info(pages: List[PageExtraction], doc_id: str) -> Tuple[FieldEvidence, FieldEvidence]:
    """Extracts diagnosis and surgical/medical procedure descriptions."""
    diag_patterns = [
        r"(?:Primary\s*Diagnosis|Provisional\s*Diagnosis|Final\s*Diagnosis|Diagnosis|Clinical\s*Impression|Impression)\s*[:\-]?\s*([^\n\r;]{3,120})",
        r"(?:Reason\s*for\s*Admission|Chief\s*Complaint)\s*[:\-]?\s*([^\n\r;]{3,120})"
    ]
    proc_patterns = [
        r"(?:Surgical\s*Procedure|Procedure(?:\s*Done|\s*Performed)?|Surgery|Treatment\s*(?:Given|Advised)|Intervention)\s*[:\-]?\s*([^\n\r;]{3,120})"
    ]

    diagnosis_ev = _search_patterns(pages, diag_patterns, doc_id, confidence_score=0.87)
    procedure_ev = _search_patterns(pages, proc_patterns, doc_id, confidence_score=0.86)

    return diagnosis_ev, procedure_ev


def parse_document_fields(
    doc_id: str,
    extraction_result: DocumentExtractionResult
) -> DocumentExtractResponse:
    """
    Orchestrates classification, field extraction, missing field detection,
    and sanity validation across all document pages.
    """
    pages = extraction_result.pages
    full_text = " ".join([p.text for p in pages])
    warnings = list(extraction_result.warnings)

    if not full_text.strip():
        # Empty text or extraction failure
        return DocumentExtractResponse(
            documentId=doc_id,
            documentType="unknown",
            status="failed" if extraction_result.errors else "partial",
            fields={},
            missingFields=[],
            warnings=warnings + ["No extractable text found in document."],
            pageCount=extraction_result.total_pages or 1,
            metadata={"ocrUsed": extraction_result.ocr_used}
        )

    # 1. Classify Document Type
    doc_type = classify_document_type(full_text)

    # 2. Extract Individual Fields
    fields: Dict[str, FieldEvidence] = {}

    # Insurance fields
    fields["insurerName"] = extract_insurer_name(pages, doc_id)
    fields["policyNumber"] = extract_policy_number(pages, doc_id)
    member_name_ev = extract_member_name(pages, doc_id)
    patient_name_ev = extract_patient_name(pages, doc_id)

    # Reconcile policyholder / patient name based on doc type
    if doc_type in {"insurance_card", "health_insurance_policy"}:
        fields["policyholderName"] = member_name_ev if member_name_ev.value else patient_name_ev
    else:
        fields["patientName"] = patient_name_ev if patient_name_ev.value else member_name_ev

    # Dates
    date_fields = extract_dates(pages, doc_id)
    fields.update(date_fields)

    # Financial and Plan Details
    fields["sumInsured"] = extract_sum_insured(pages, doc_id)
    fields["policyType"] = extract_policy_type(pages, doc_id)
    fields["billAmount"] = extract_bill_amount(pages, doc_id)
    fields["claimOrCaseId"] = extract_claim_or_case_id(pages, doc_id)
    fields["hospitalName"] = extract_hospital_name(pages, doc_id)

    # Clinical details
    diag_ev, proc_ev = extract_clinical_info(pages, doc_id)
    fields["diagnosis"] = diag_ev
    fields["procedure"] = proc_ev

    # 3. Sanity and Inconsistency Checks within this single document
    # Date sanity checks
    adm_dt = fields.get("admissionDate")
    dis_dt = fields.get("dischargeDate")
    if adm_dt and dis_dt and adm_dt.value and dis_dt.value:
        is_valid, msg = validate_date_range(str(adm_dt.value), str(dis_dt.value))
        if not is_valid and msg:
            warnings.append(f"Internal date inconsistency: {msg}")

    pol_s = fields.get("policyStartDate")
    pol_e = fields.get("policyEndDate")
    if pol_s and pol_e and pol_s.value and pol_e.value:
        is_valid, msg = validate_date_range(str(pol_s.value), str(pol_e.value))
        if not is_valid and msg:
            warnings.append(f"Internal policy date inconsistency: {msg}")

    # Amount sanity checks
    bill_amt = fields.get("billAmount")
    if bill_amt and bill_amt.value is not None:
        try:
            if float(bill_amt.value) <= 0:
                warnings.append("Extracted bill amount is zero or negative.")
        except (ValueError, TypeError):
            pass

    # 4. Identify Missing Fields for this document type
    expected = EXPECTED_FIELDS_BY_DOCTYPE.get(doc_type, [])
    missing_fields: List[str] = []
    for exp_field in expected:
        field_ev = fields.get(exp_field)
        if not field_ev or field_ev.value is None:
            missing_fields.append(exp_field)

    # Determine overall document status
    if len(missing_fields) == len(expected) and len(expected) > 0:
        status = "partial"
    elif extraction_result.has_scanned_content and not extraction_result.ocr_used:
        status = "partial"
    else:
        status = "processed"

    return DocumentExtractResponse(
        documentId=doc_id,
        documentType=doc_type,
        status=status,
        fields=fields,
        missingFields=missing_fields,
        warnings=warnings,
        pageCount=extraction_result.total_pages,
        metadata={
            "ocrUsed": extraction_result.ocr_used,
            "hasScannedContent": extraction_result.has_scanned_content
        }
    )
