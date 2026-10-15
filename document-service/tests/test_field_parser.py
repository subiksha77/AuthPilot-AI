"""
Unit tests for field parsing, document classification, evidence extraction, and missing fields.
"""

from app.schemas import DocumentExtractResponse
from app.extraction import DocumentExtractionResult, PageExtraction
from app.field_parser import (
    classify_document_type,
    parse_document_fields,
    extract_insurer_name,
    extract_policy_number,
    extract_member_name,
    extract_patient_name,
    extract_bill_amount
)


def test_classify_document_type():
    card_text = "Health Insurance Card Member ID: MEM-9912 RxBIN: 012345 Demo Health Insurance"
    assert classify_document_type(card_text) == "insurance_card"

    adm_text = "Hospital Admission Note Date of Admission: 2026-03-01 Chief Complaint: Chest Pain"
    assert classify_document_type(adm_text) == "hospital_admission_note"

    bill_text = "Final Bill Tax Invoice Total Bill Amount: $4,500.00 Net Payable: $4,500.00"
    assert classify_document_type(bill_text) == "medical_bill"

    dis_text = "Hospital Discharge Summary Date of Discharge: 2026-03-05 Condition at Discharge: Stable"
    assert classify_document_type(dis_text) == "discharge_summary"

    test_text = "Clinical Diagnostic Report Pathology Specimen: Blood Observed Value: Normal"
    assert classify_document_type(test_text) == "test_report"


def test_parse_insurance_card():
    text = (
        "Demo Health Insurance\n"
        "Health Insurance Card\n"
        "Policy No: POL-DEMO-001\n"
        "Member Name: John Doe\n"
        "Policy Start Date: 2025-01-01\n"
        "Policy End Date: 2025-12-31\n"
        "Sum Insured: $500,000\n"
    )
    pages = [PageExtraction(page_number=1, text=text, method="pymupdf", char_count=len(text))]
    ext_result = DocumentExtractionResult(pages=pages, total_pages=1)

    doc_id = "DOC-TEST-CARD-01"
    res = parse_document_fields(doc_id, ext_result)

    assert res.documentId == doc_id
    assert res.documentType == "insurance_card"
    assert res.status == "processed"

    # Fields verification
    assert res.fields["insurerName"].value == "Demo Health Insurance"
    assert res.fields["insurerName"].sourcePage == 1
    assert res.fields["insurerName"].sourceDocumentId == doc_id
    assert res.fields["insurerName"].excerpt is not None

    assert res.fields["policyNumber"].value == "POL-DEMO-001"
    assert res.fields["policyholderName"].value == "John Doe"
    assert res.fields["policyStartDate"].value == "2025-01-01"
    assert res.fields["policyEndDate"].value == "2025-12-31"

    # All expected fields present, missingFields should be empty
    assert len(res.missingFields) == 0


def test_parse_insurance_card_missing_fields():
    # Insurance card missing policy start and end dates
    text = (
        "Demo Health Insurance Card\n"
        "Policy Number: POL-DEMO-002\n"
        "Member ID: MEM-12345\n"
        "Member Name: Jane Smith\n"
    )
    pages = [PageExtraction(page_number=1, text=text, method="pymupdf", char_count=len(text))]
    ext_result = DocumentExtractionResult(pages=pages, total_pages=1)

    res = parse_document_fields("DOC-TEST-CARD-02", ext_result)

    assert res.fields["policyStartDate"].value is None
    assert res.fields["policyStartDate"].status == "missing"
    assert "policyStartDate" in res.missingFields
    assert "policyEndDate" in res.missingFields


def test_parse_hospital_bill():
    text = (
        "Apollo Hospital\n"
        "Final Bill Tax Invoice\n"
        "Patient Name: Robert Smith\n"
        "Bill Date: 2026-03-10\n"
        "Admission Date: 2026-03-02\n"
        "Discharge Date: 2026-03-08\n"
        "Total Bill: $8,750.00\n"
    )
    pages = [PageExtraction(page_number=1, text=text, method="pymupdf", char_count=len(text))]
    ext_result = DocumentExtractionResult(pages=pages, total_pages=1)

    res = parse_document_fields("DOC-TEST-BILL-01", ext_result)

    assert res.documentType == "medical_bill"
    assert res.fields["billAmount"].value == 8750.0
    assert res.fields["patientName"].value == "Robert Smith"
    assert res.fields["admissionDate"].value == "2026-03-02"
    assert res.fields["dischargeDate"].value == "2026-03-08"


def test_internal_date_inconsistency_warning():
    # Admission date occurs after discharge date
    text = (
        "Discharge Summary\n"
        "Patient Name: Alice Brown\n"
        "Hospital Name: City General Hospital\n"
        "Admission Date: 2026-03-20\n"
        "Discharge Date: 2026-03-10\n"
        "Diagnosis: Acute Appendicitis\n"
    )
    pages = [PageExtraction(page_number=1, text=text, method="pymupdf", char_count=len(text))]
    ext_result = DocumentExtractionResult(pages=pages, total_pages=1)

    res = parse_document_fields("DOC-TEST-INCONSISTENT", ext_result)

    assert any("Internal date inconsistency" in w for w in res.warnings)


def test_name_extraction_newline_boundary_regression():
    """Ensure multiline header text following member or patient names is never captured."""
    card_text = (
        "Demo Health Insurance\n"
        "Health Insurance Card\n"
        "Policy No: POL-DEMO-999\n"
        "Member Name: Johnathan Doe\n"
        "Policy Start Date: 2026-01-01\n"
        "Policy End Date: 2026-12-31\n"
        "Sum Insured: $250,000\n"
    )
    pages = [PageExtraction(page_number=1, text=card_text, method="pymupdf", char_count=len(card_text))]
    ext_result = DocumentExtractionResult(pages=pages, total_pages=1)
    res = parse_document_fields("DOC-TEST-REGRESSION-1", ext_result)
    assert res.fields["policyholderName"].value == "Johnathan Doe"
    assert "\n" not in res.fields["policyholderName"].value

    bill_text = (
        "Apollo Hospital\n"
        "Final Bill Tax Invoice\n"
        "Patient Name: Sarah Connor\n"
        "Bill Date: 2026-04-10\n"
        "Total Bill: Rs. 45,000\n"
    )
    pages_bill = [PageExtraction(page_number=1, text=bill_text, method="pymupdf", char_count=len(bill_text))]
    res_bill = parse_document_fields("DOC-TEST-REGRESSION-2", DocumentExtractionResult(pages=pages_bill, total_pages=1))
    assert res_bill.fields["patientName"].value == "Sarah Connor"
    assert "\n" not in res_bill.fields["patientName"].value


def test_currency_and_textual_dates_regression():
    """Ensure Indian and international currency formats and textual dates parse accurately."""
    from app.validators import parse_currency_amount, parse_and_normalize_date

    assert parse_currency_amount("Rs. 45,000") == 45000.0
    assert parse_currency_amount("INR 1,20,500.00") == 120500.0
    assert parse_currency_amount("$12,500.50") == 12500.50
    assert parse_currency_amount("Rs. 0.00") == 0.0

    assert parse_and_normalize_date("March 15, 2026") == "2026-03-15"
    assert parse_and_normalize_date("15 Mar 2026") == "2026-03-15"
    assert parse_and_normalize_date("15 March 2026") == "2026-03-15"
    assert parse_and_normalize_date("Date of Admission: 2026-02-14") == "2026-02-14"

