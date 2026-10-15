"""
Unit tests for cross-document comparison and discrepancy detection.
"""

from app.schemas import DocumentExtractResponse, FieldEvidence
from app.document_compare import compare_documents


def _make_dummy_doc(doc_id: str, doc_type: str, fields_dict: dict) -> DocumentExtractResponse:
    fields = {}
    for k, v in fields_dict.items():
        fields[k] = FieldEvidence(
            value=v,
            sourcePage=1,
            confidence=0.95,
            sourceDocumentId=doc_id,
            excerpt=f"Matched {k}: {v}",
            status="extracted" if v is not None else "missing"
        )
    return DocumentExtractResponse(
        documentId=doc_id,
        documentType=doc_type,
        status="processed",
        fields=fields,
        missingFields=[],
        warnings=[],
        pageCount=1
    )


def test_compare_consistent_documents():
    doc1 = _make_dummy_doc("DOC-POL-01", "health_insurance_policy", {
        "insurerName": "Demo Health Insurance",
        "policyNumber": "POL-1001",
        "policyholderName": "John Doe",
        "policyStartDate": "2026-01-01",
        "policyEndDate": "2026-12-31",
        "sumInsured": 500000.0
    })

    doc2 = _make_dummy_doc("DOC-BILL-01", "medical_bill", {
        "patientName": "John Doe",
        "policyNumber": "POL-1001",
        "hospitalName": "City Hospital",
        "admissionDate": "2026-03-01",
        "dischargeDate": "2026-03-05",
        "billAmount": 12000.0
    })

    res = compare_documents([doc1, doc2])

    assert res.comparisonStatus == "consistent"
    assert len(res.inconsistencies) == 0
    assert res.totalDocuments == 2
    assert res.unifiedSummary["policyNumber"]["value"] == "POL-1001"
    assert res.unifiedSummary["patientName"]["value"] == "John Doe"
    assert res.unifiedSummary["billAmount"]["value"] == 12000.0


def test_compare_conflicting_policy_numbers():
    doc1 = _make_dummy_doc("DOC-1", "insurance_card", {
        "policyNumber": "POL-ALPHA"
    })
    doc2 = _make_dummy_doc("DOC-2", "medical_bill", {
        "policyNumber": "POL-BETA"
    })

    res = compare_documents([doc1, doc2])

    assert res.comparisonStatus == "conflicts_found"
    assert any(inc.field == "policyNumber" and inc.issueType == "conflict" for inc in res.inconsistencies)


def test_compare_conflicting_patient_names():
    doc1 = _make_dummy_doc("DOC-1", "insurance_card", {
        "policyholderName": "Alice Walker"
    })
    doc2 = _make_dummy_doc("DOC-2", "hospital_admission_note", {
        "patientName": "David Miller"
    })

    res = compare_documents([doc1, doc2])

    assert res.comparisonStatus == "conflicts_found"
    assert any(inc.field == "patientName" and inc.issueType == "conflict" for inc in res.inconsistencies)


def test_compare_coverage_expired():
    # Policy expired on 2025-12-31, but patient was admitted in March 2026
    doc1 = _make_dummy_doc("DOC-1", "health_insurance_policy", {
        "policyStartDate": "2025-01-01",
        "policyEndDate": "2025-12-31"
    })
    doc2 = _make_dummy_doc("DOC-2", "hospital_admission_note", {
        "admissionDate": "2026-03-01"
    })

    res = compare_documents([doc1, doc2])

    assert res.comparisonStatus == "conflicts_found"
    assert any(inc.issueType == "coverage_expired" for inc in res.inconsistencies)


def test_compare_cross_doc_invalid_date_range():
    # Admission date occurs after discharge date across documents
    doc1 = _make_dummy_doc("DOC-ADM", "hospital_admission_note", {
        "admissionDate": "2026-03-15"
    })
    doc2 = _make_dummy_doc("DOC-DIS", "discharge_summary", {
        "dischargeDate": "2026-03-10"
    })

    res = compare_documents([doc1, doc2])

    assert res.comparisonStatus == "conflicts_found"
    assert any(inc.issueType == "date_range_invalid" for inc in res.inconsistencies)


def test_compare_bill_exceeds_sum_insured():
    doc1 = _make_dummy_doc("DOC-POL", "health_insurance_policy", {
        "sumInsured": 10000.0
    })
    doc2 = _make_dummy_doc("DOC-BILL", "medical_bill", {
        "billAmount": 18500.0
    })

    res = compare_documents([doc1, doc2])

    assert res.comparisonStatus == "conflicts_found"
    assert any(inc.issueType == "amount_exceeds_coverage" for inc in res.inconsistencies)
