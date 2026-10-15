# AuthPilot AI — Document Processing Service

**SYNAPSE 2026 | Problem Statement PS-011 | HealthTech**

The Document Processing Service is a FastAPI microservice designed for **AuthPilot AI**. It ingests clinical records and insurance documentation, extracts structured fields with line/page-level evidence excerpts, normalizes key entities (such as dates and financial amounts), detects missing requirements and inconsistencies, and performs cross-document comparisons to assist human reviewers in prior-authorisation workflows.

---

## 1. Key Capabilities

- **Secure Document Upload & Validation:**
  - Validates MIME type, file extensions (`.pdf`, `.png`, `.jpg`, `.jpeg`), and binary magic bytes to reject disguised or corrupt payloads.
  - Enforces configurable upload size limits (default: 15 MB).

- **Multi-Page Text & Evidence Extraction:**
  - Fast PDF text extraction using PyMuPDF (`fitz`), preserving page numbers and context windows for explainable evidence.
  - Automatic OCR fallback via Tesseract OCR when scanned image content is detected.

- **Intelligent Field Parsing & Normalization:**
  - Identifies document categories: `insurance_card`, `health_insurance_policy`, `hospital_admission_note`, `medical_bill`, `discharge_summary`, `test_report`.
  - Normalizes textual dates (e.g., `March 15, 2026`, `15/03/2026`, `2026-03-15`) to ISO format (`YYYY-MM-DD`).
  - Normalizes international and Indian currency expressions (e.g., `Rs. 45,000`, `INR 1,20,500.00`, `$12,500.50`).
  - Enforces single-line regex boundaries to prevent multiline headers from contaminating member or patient names.

- **Missing Data & Inconsistency Detection:**
  - Flags missing mandatory fields required for prior authorisation according to document type.
  - Detects single-document timeline contradictions (e.g., admission date occurring after discharge date).
  - Flags uncertain, missing, or contradictory items for human review rather than making automated approval or denial decisions.

- **Cross-Document Comparison:**
  - Compares pairs or bundles of documents to identify conflicting policy numbers, patient names, or hospital identities.
  - Verifies whether hospitalization dates fall within the active policy coverage window.
  - Compares claimed bill amounts against policy sum insured limits.

---

## 2. Setup & Installation

### Requirements
- Python 3.10+
- Tesseract OCR (optional, for scanned PDF/image OCR fallback)

### Install Dependencies
From the repository root or from inside `document-service/`:

```bash
cd document-service
pip install -r requirements.txt
```

### Environment Configuration
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

---

## 3. Running the Service

### Option A: From inside `document-service/` (Recommended)
```bash
cd document-service
python -m uvicorn app.main:app --reload --port 8000
```

### Option B: From the Repository Root
```bash
python -m uvicorn app.main:app --app-dir document-service --reload --port 8000
```

### Interactive API Documentation
- **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 4. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health status, version, and OCR engine availability. |
| `POST` | `/api/documents/extract` | Upload clinical/insurance file; extracts fields, page references, and missing items. |
| `GET` | `/api/documents/{document_id}` | Retrieve previously processed document extraction results by ID. |
| `GET` | `/api/documents` | List all processed documents stored in current session memory. |
| `POST` | `/api/documents/compare` | Compare 2+ documents for cross-document conflicts and coverage validity. |

---

## 5. Running the Tests

Execute the full automated pytest suite:

```bash
cd document-service
python -m pytest -v
```
