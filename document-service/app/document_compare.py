"""
Cross-document comparison and inconsistency detection module for AuthPilot AI.
Identifies discrepancies in policy numbers, patient names, dates, claim IDs,
and coverage periods across multiple uploaded clinical and insurance documents.
"""

import re
import logging
from typing import List, Dict, Any, Optional
from app.schemas import (
    DocumentExtractResponse,
    DocumentCompareResponse,
    InconsistencyItem,
    ConflictingValue
)
from app.validators import parse_and_normalize_date

logger = logging.getLogger("document-service.document_compare")


def _normalize_name(name: Optional[str]) -> str:
    """Normalizes names by removing punctuation, titles, and whitespace for comparison."""
    if not name:
        return ""
    cleaned = re.sub(r"^(Mr|Mrs|Ms|Master|Baby|Dr|Shri|Smt)\.?\s+", "", name.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"[^\w\s]", "", cleaned).lower()
    return " ".join(cleaned.split())


def _names_are_conflicting(name1: str, name2: str) -> bool:
    """
    Checks if two normalized names substantially conflict.
    Allows partial matching (e.g. 'John Doe' and 'John A. Doe' or 'Doe John').
    """
    n1 = _normalize_name(name1)
    n2 = _normalize_name(name2)
    if not n1 or not n2:
        return False

    tokens1 = set(n1.split())
    tokens2 = set(n2.split())

    # If they share at least one significant token (e.g., surname or given name), likely same person
    common = tokens1.intersection(tokens2)
    if len(common) > 0:
        return False

    return True


def compare_documents(documents: List[DocumentExtractResponse]) -> DocumentCompareResponse:
    """
    Compares extracted data across multiple documents to identify conflicts,
    timeline contradictions, coverage expirations, and missing package requirements.
    """
    if not documents:
        return DocumentCompareResponse(
            comparisonStatus="insufficient_documents",
            totalDocuments=0,
            documentIds=[],
            inconsistencies=[],
            crossDocumentMissingFields={},
            unifiedSummary={},
            warnings=["No documents were provided for comparison."]
        )

    doc_ids = [d.documentId for d in documents]
    inconsistencies: List[InconsistencyItem] = []
    warnings: List[str] = []
    missing_by_doc: Dict[str, List[str]] = {}

    for d in documents:
        missing_by_doc[d.documentId] = d.missingFields

    # 1. Compare Policy Numbers across documents
    policy_sources: List[ConflictingValue] = []
    for d in documents:
        pol = d.fields.get("policyNumber")
        if pol and pol.value:
            policy_sources.append(ConflictingValue(
                documentId=d.documentId,
                documentType=d.documentType,
                sourcePage=pol.sourcePage,
                value=str(pol.value).strip(),
                excerpt=pol.excerpt
            ))

    unique_policies = {p.value.upper() for p in policy_sources}
    if len(unique_policies) > 1:
        inconsistencies.append(InconsistencyItem(
            field="policyNumber",
            issueType="conflict",
            description=f"Conflicting policy numbers detected across {len(policy_sources)} documents: {', '.join(unique_policies)}.",
            severity="high",
            conflictingValues=policy_sources
        ))

    # 2. Compare Patient / Policyholder Names across documents
    name_sources: List[ConflictingValue] = []
    for d in documents:
        name_ev = d.fields.get("patientName") or d.fields.get("policyholderName")
        if name_ev and name_ev.value:
            name_sources.append(ConflictingValue(
                documentId=d.documentId,
                documentType=d.documentType,
                sourcePage=name_ev.sourcePage,
                value=str(name_ev.value).strip(),
                excerpt=name_ev.excerpt
            ))

    # Pairwise check on names
    conflicting_names = False
    for i in range(len(name_sources)):
        for j in range(i + 1, len(name_sources)):
            if _names_are_conflicting(name_sources[i].value, name_sources[j].value):
                conflicting_names = True
                break

    if conflicting_names:
        inconsistencies.append(InconsistencyItem(
            field="patientName",
            issueType="conflict",
            description="Patient or policyholder name differs across uploaded records.",
            severity="high",
            conflictingValues=name_sources
        ))

    # 3. Compare Claim / Case IDs
    claim_sources: List[ConflictingValue] = []
    for d in documents:
        claim_ev = d.fields.get("claimOrCaseId")
        if claim_ev and claim_ev.value:
            claim_sources.append(ConflictingValue(
                documentId=d.documentId,
                documentType=d.documentType,
                sourcePage=claim_ev.sourcePage,
                value=str(claim_ev.value).strip(),
                excerpt=claim_ev.excerpt
            ))

    unique_claims = {c.value.upper() for c in claim_sources}
    if len(unique_claims) > 1:
        inconsistencies.append(InconsistencyItem(
            field="claimOrCaseId",
            issueType="conflict",
            description=f"Conflicting claim/case numbers found across documents: {', '.join(unique_claims)}.",
            severity="medium",
            conflictingValues=claim_sources
        ))

    # 4. Timeline & Date Inconsistencies across documents
    # Collect all admission dates, discharge dates, policy start/end dates
    admissions: List[ConflictingValue] = []
    discharges: List[ConflictingValue] = []
    policy_starts: List[ConflictingValue] = []
    policy_ends: List[ConflictingValue] = []
    bill_dates: List[ConflictingValue] = []

    for d in documents:
        adm = d.fields.get("admissionDate")
        if adm and adm.value:
            admissions.append(ConflictingValue(
                documentId=d.documentId,
                documentType=d.documentType,
                sourcePage=adm.sourcePage,
                value=str(adm.value),
                excerpt=adm.excerpt
            ))

        dis = d.fields.get("dischargeDate")
        if dis and dis.value:
            discharges.append(ConflictingValue(
                documentId=d.documentId,
                documentType=d.documentType,
                sourcePage=dis.sourcePage,
                value=str(dis.value),
                excerpt=dis.excerpt
            ))

        p_start = d.fields.get("policyStartDate")
        if p_start and p_start.value:
            policy_starts.append(ConflictingValue(
                documentId=d.documentId,
                documentType=d.documentType,
                sourcePage=p_start.sourcePage,
                value=str(p_start.value),
                excerpt=p_start.excerpt
            ))

        p_end = d.fields.get("policyEndDate")
        if p_end and p_end.value:
            policy_ends.append(ConflictingValue(
                documentId=d.documentId,
                documentType=d.documentType,
                sourcePage=p_end.sourcePage,
                value=str(p_end.value),
                excerpt=p_end.excerpt
            ))

        doc_dt = d.fields.get("documentDate")
        if doc_dt and doc_dt.value:
            bill_dates.append(ConflictingValue(
                documentId=d.documentId,
                documentType=d.documentType,
                sourcePage=doc_dt.sourcePage,
                value=str(doc_dt.value),
                excerpt=doc_dt.excerpt
            ))

    # Check: Admission occurs after Discharge
    for a in admissions:
        for dis in discharges:
            if a.value and dis.value and str(a.value) > str(dis.value):
                inconsistencies.append(InconsistencyItem(
                    field="admissionDischargeDates",
                    issueType="date_range_invalid",
                    description=f"Admission date ({a.value}) occurs after discharge date ({dis.value}).",
                    severity="high",
                    conflictingValues=[a, dis]
                ))

    # Check: Treatment occurs outside Policy Coverage Window
    for a in admissions:
        for ps in policy_starts:
            if a.value and ps.value and str(a.value) < str(ps.value):
                inconsistencies.append(InconsistencyItem(
                    field="policyCoverageWindow",
                    issueType="coverage_expired",
                    description=f"Hospital admission date ({a.value}) is prior to the policy effective start date ({ps.value}).",
                    severity="high",
                    conflictingValues=[a, ps]
                ))

        for pe in policy_ends:
            if a.value and pe.value and str(a.value) > str(pe.value):
                inconsistencies.append(InconsistencyItem(
                    field="policyCoverageWindow",
                    issueType="coverage_expired",
                    description=f"Hospital admission date ({a.value}) occurs after policy expiration date ({pe.value}).",
                    severity="high",
                    conflictingValues=[a, pe]
                ))

    # 5. Financial comparison: Bill Amount vs Sum Insured
    bill_amounts: List[ConflictingValue] = []
    sums_insured: List[ConflictingValue] = []
    for d in documents:
        b_amt = d.fields.get("billAmount")
        if b_amt and b_amt.value is not None:
            bill_amounts.append(ConflictingValue(
                documentId=d.documentId,
                documentType=d.documentType,
                sourcePage=b_amt.sourcePage,
                value=b_amt.value,
                excerpt=b_amt.excerpt
            ))

        s_ins = d.fields.get("sumInsured")
        if s_ins and s_ins.value is not None:
            sums_insured.append(ConflictingValue(
                documentId=d.documentId,
                documentType=d.documentType,
                sourcePage=s_ins.sourcePage,
                value=s_ins.value,
                excerpt=s_ins.excerpt
            ))

    for b in bill_amounts:
        for s in sums_insured:
            try:
                b_val = float(b.value)
                s_val = float(s.value)
                if b_val > s_val:
                    inconsistencies.append(InconsistencyItem(
                        field="sumInsuredExceeded",
                        issueType="amount_exceeds_coverage",
                        description=f"Billed amount ({b_val:,.2f}) exceeds policy sum insured ({s_val:,.2f}).",
                        severity="medium",
                        conflictingValues=[b, s]
                    ))
            except (ValueError, TypeError):
                pass

    # 6. Build Unified Summary across documents
    unified_summary: Dict[str, Any] = {}
    summary_fields = [
        "insurerName", "policyNumber", "patientName", "policyholderName",
        "hospitalName", "admissionDate", "dischargeDate", "billAmount",
        "sumInsured", "policyType", "diagnosis", "procedure", "claimOrCaseId"
    ]

    for f in summary_fields:
        vals = []
        for d in documents:
            f_ev = d.fields.get(f)
            if f_ev and f_ev.value is not None:
                vals.append({
                    "value": f_ev.value,
                    "sourceDocumentId": d.documentId,
                    "sourcePage": f_ev.sourcePage,
                    "excerpt": f_ev.excerpt
                })
        if vals:
            unified_summary[f] = vals[0]  # First or primary verified occurrence

    # Overall status determination
    if len(inconsistencies) > 0:
        comparison_status = "conflicts_found"
    else:
        comparison_status = "consistent"

    return DocumentCompareResponse(
        comparisonStatus=comparison_status,
        totalDocuments=len(documents),
        documentIds=doc_ids,
        inconsistencies=inconsistencies,
        crossDocumentMissingFields=missing_by_doc,
        unifiedSummary=unified_summary,
        warnings=warnings
    )
