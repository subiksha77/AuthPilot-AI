"""
Integration tests for FastAPI endpoints: /health, /api/documents/extract, /api/documents/compare, /api/documents/{id}.
"""

import io
import pytest
from fastapi.testclient import TestClient
from app.main import app, documents_store


@pytest.fixture
def client():
    # Clear in-memory store between test suites if needed
    documents_store.clear()
    return TestClient(app)


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "document-processing-service"
    assert "tesseractAvailable" in data
    assert "timestamp" in data


def test_upload_and_extract_pdf(client):
    import fitz

    # Create a synthetic PDF in memory
    doc = fitz.open()
    page = doc.new_page()
    content = (
        "Demo Health Insurance\n"
        "Health Insurance Card\n"
        "Policy No: POL-DEMO-001\n"
        "Member Name: John Doe\n"
        "Policy Start Date: 2026-01-01\n"
        "Policy End Date: 2026-12-31\n"
        "Sum Insured: $250,000\n"
    )
    page.insert_text((50, 50), content)
    pdf_bytes = doc.tobytes()
    doc.close()

    response = client.post(
        "/api/documents/extract",
        files={"file": ("insurance_card.pdf", pdf_bytes, "application/pdf")}
    )

    assert response.status_code == 201
    data = response.json()
    assert data["documentId"].startswith("DOC-DEMO-")
    assert data["documentType"] == "insurance_card"
    assert data["status"] == "processed"
    assert data["pageCount"] == 1

    # Check fields structure matches Section 5 standard format
    fields = data["fields"]
    assert "insurerName" in fields
    assert fields["insurerName"]["value"] == "Demo Health Insurance"
    assert fields["insurerName"]["sourcePage"] == 1
    assert fields["policyNumber"]["value"] == "POL-DEMO-001"
    assert fields["policyholderName"]["value"] == "John Doe"
    assert fields["policyStartDate"]["value"] == "2026-01-01"
    assert fields["policyEndDate"]["value"] == "2026-12-31"

    # Missing fields should be empty because all required fields are present
    assert data["missingFields"] == []

    # Verify retrieval via GET /api/documents/{id}
    doc_id = data["documentId"]
    get_res = client.get(f"/api/documents/{doc_id}")
    assert get_res.status_code == 200
    assert get_res.json()["documentId"] == doc_id


def test_get_nonexistent_document(client):
    response = client.get("/api/documents/DOC-NONEXISTENT")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_upload_invalid_file_extension(client):
    response = client.post(
        "/api/documents/extract",
        files={"file": ("malicious.exe", b"MZ\x90\x00executable", "application/octet-stream")}
    )
    assert response.status_code == 415
    assert "unsupported file extension" in response.json()["message"].lower()


def test_upload_disguised_file(client):
    response = client.post(
        "/api/documents/extract",
        files={"file": ("fake.pdf", b"not a real pdf content", "application/pdf")}
    )
    assert response.status_code == 400
    assert "signature does not match" in response.json()["message"].lower()


def test_compare_endpoint(client):
    import fitz

    # Upload Doc 1: Policy
    doc1 = fitz.open()
    p1 = doc1.new_page()
    p1.insert_text((50, 50), "Demo Health Insurance Policy\nPolicy No: POL-777\nPolicyholder Name: Alice Cooper\nPolicy Start Date: 2026-01-01\nPolicy End Date: 2026-12-31\nSum Insured: $100,000")
    pdf1 = doc1.tobytes()
    doc1.close()

    res1 = client.post(
        "/api/documents/extract",
        files={"file": ("policy.pdf", pdf1, "application/pdf")}
    )
    assert res1.status_code == 201
    doc_id_1 = res1.json()["documentId"]

    # Upload Doc 2: Hospital Bill with conflicting policy number
    doc2 = fitz.open()
    p2 = doc2.new_page()
    p2.insert_text((50, 50), "City General Hospital\nFinal Bill\nPatient Name: Alice Cooper\nPolicy No: POL-999\nAdmission Date: 2026-02-01\nDischarge Date: 2026-02-05\nTotal Bill: $5,000.00")
    pdf2 = doc2.tobytes()
    doc2.close()

    res2 = client.post(
        "/api/documents/extract",
        files={"file": ("bill.pdf", pdf2, "application/pdf")}
    )
    assert res2.status_code == 201
    doc_id_2 = res2.json()["documentId"]

    # Compare via documentIds
    compare_res = client.post(
        "/api/documents/compare",
        json={"documentIds": [doc_id_1, doc_id_2]}
    )
    assert compare_res.status_code == 200
    cmp_data = compare_res.json()
    assert cmp_data["comparisonStatus"] == "conflicts_found"
    assert any(inc["field"] == "policyNumber" for inc in cmp_data["inconsistencies"])
