# AuthPilot AI — Policy Service (Member 3)

Intelligent, explainable policy rules engine, coverage estimator, policy-change impact radar, what-if scenario simulator, and human-in-the-loop reviewer workflow with immutable audit history.

Part of **AuthPilot AI** — Prior Authorisation Coordination Platform (SYNAPSE 2026 | PS-011 | HealthTech).

---

## 1. Compliance & Operational Principles

> [!IMPORTANT]
> **HealthTech Compliance Notice**
> - **Preliminary Assessment Only**: All evaluations, rule outputs, and estimations provided by this service are advisory packages prepared for authorized human review (`PRELIMINARY_ASSESSMENT_ONLY`).
> - **No Automated Insurer Decisions**: This service does **not** issue binding insurance approvals or denials. Final decisions remain the exclusive responsibility of authorized insurer personnel or medical directors.
> - **Estimates Not Guarantees**: All financial calculations are marked `ESTIMATE_ONLY` / `ALL_FIGURES_ARE_ESTIMATES_NOT_GUARANTEED_PAYOUTS`.
> - **Synthetic Demo Data**: All policies, claims, member identifiers, and hospital invoices in this repository are synthetic fixtures (`_syntheticDemo: true`).

---

## 2. Architecture & Modules

The `policy-service/` is built with **Node.js, TypeScript, Express, and Vitest**, following clean domain boundaries:

```text
policy-service/
├── src/
│   ├── app.ts                  # Express application setup, routes & middleware
│   ├── server.ts               # HTTP server entrypoint (PORT defaults to 3002)
│   ├── types/                  # Strict TypeScript contracts & domain models
│   │   ├── policy.ts           # Policy schema (sublimits, exclusions, waiting period)
│   │   ├── claim.ts            # Claim schema & Member 2 EvidenceRef types
│   │   ├── evaluation.ts       # Deterministic rule statuses & reports
│   │   ├── estimation.ts       # Financial coverage breakdown & calculation steps
│   │   ├── radar.ts            # Policy radar comparison differences & impacts
│   │   ├── simulator.ts        # What-if scenario parameters & delta summaries
│   │   └── reviewer.ts         # Reviewer state machine, requests & audit events
│   ├── rules/                  # Deterministic policy rules engine
│   │   ├── evaluators.ts       # 8 individual rule evaluators (R01 to R08)
│   │   └── engine.ts           # Orchestrator & overall severity aggregator
│   ├── estimator/              # Financial coverage calculator
│   │   └── coverageCalculator.ts # Cap -> Deductible -> Co-pay sequence
│   ├── radar/                  # Policy-change impact comparator
│   │   └── comparator.ts       # Factual differences vs financial impact direction
│   ├── simulator/              # Non-mutating what-if simulator
│   │   └── simulator.ts        # Hypothetical date, document, policy & bill scenarios
│   ├── reviewer/               # Human-in-the-loop reviewer workflow
│   │   ├── stateMachine.ts     # 5-state lifecycle transitions & validation
│   │   └── repository.ts       # Review case store & audit trail (pluggable for DB)
│   └── data/                   # Synthetic demo policies and claims
│       ├── syntheticPolicies.ts
│       └── syntheticClaims.ts
└── tests/                      # Comprehensive Vitest test suites (116 tests)
    ├── rulesEngine.test.ts
    ├── coverageCalculator.test.ts
    ├── policyRadar.test.ts
    ├── simulator.test.ts
    ├── reviewerWorkflow.test.ts
    └── apiEndpoints.test.ts
```

---

## 3. Reviewer Workflow State Machine

The reviewer workflow provides structured oversight for complex, borderline, or incomplete prior-auth submissions:

```text
       [ Submit Claim ]
              |
              v
     +-----------------+
     | PENDING_REVIEWER| <-----------------------+
     +-----------------+                         |
       |             |                           |
       | START_      | REQUEST_                  |
       | REVIEW      | INFORMATION               |
       v             v                           |
+------------+  +-------------------+            |
|  IN_REVIEW |  | NEEDS_INFORMATION |            |
+------------+  +-------------------+            |
  |    ^   |         |                           |
  |    |   +---------+ (RESUME_REVIEW)           |
  |    |                                         |
  |    +-----------------------------+           |
  | RECORD_RECOMMENDATION            |           |
  v                                  |           |
+-------------------------+          |           |
| RECOMMENDATION_RECORDED |          |           |
+-------------------------+          |           |
  |                     |            |           |
  | CLOSE_REVIEW        | REOPEN_    | REOPEN_   |
  v                     | REVIEW     | REVIEW    |
+------------+          |            |           |
|   CLOSED   | ---------+------------+-----------+
+------------+
```

### Transition Matrix & Preconditions
| Current State | Permitted Action | Next State | Required Payload |
|---|---|---|---|
| `PENDING_REVIEWER` | `START_REVIEW` | `IN_REVIEW` | `reviewerId` (optional/recommended), `notes` |
| `PENDING_REVIEWER` | `REQUEST_INFORMATION` | `NEEDS_INFORMATION` | `reason` (required string), `requiredDocuments` (non-empty string array) |
| `IN_REVIEW` | `REQUEST_INFORMATION` | `NEEDS_INFORMATION` | `reason` (required string), `requiredDocuments` (non-empty string array) |
| `IN_REVIEW` | `RECORD_RECOMMENDATION` | `RECOMMENDATION_RECORDED` | `reviewerId` (required), `recommendation` (`APPROVE_AS_PREPARED` \| `DENY_WITH_REASON` \| `FORWARD_TO_MEDICAL_DIRECTOR`), `reason` (required), `supportingEvidenceRefs` (non-empty array) |
| `NEEDS_INFORMATION` | `RESUME_REVIEW` | `IN_REVIEW` | `reviewerId` (optional), `notes` (optional) |
| `RECOMMENDATION_RECORDED` | `CLOSE_REVIEW` | `CLOSED` | `reviewerId` (optional), `reason` (optional) |
| `RECOMMENDATION_RECORDED` | `REOPEN_REVIEW` | `IN_REVIEW` | `reviewerId` (optional), `reason` (required) |
| `CLOSED` | `REOPEN_REVIEW` | `IN_REVIEW` | `reviewerId` (optional), `reason` (required) |

---

## 4. Architectural Contracts for Team Members

### For Member 1 (React Frontend)
- Base URL: `http://localhost:3002` (configurable via `VITE_POLICY_SERVICE_URL`).
- All response schemas are strongly typed and documented below.
- Alias route: `POST /api/policies/compare` routes identically to `POST /api/policy-radar`.
- All errors return standard JSON: `{ "error": "Descriptive message" }` with 4xx or 500 status codes.

### For Member 2 (Document Processing Service)
- Extracted facts and page coordinates link into `Claim.extractedFields` using `EvidenceRef`:
  ```typescript
  export interface EvidenceRef {
    documentId: string;
    sourcePage: number | null;
    fieldName: string;
    excerpt: string | null;
    confidence: number | null;
  }
  ```
- Evaluators check `suppliedDocuments` against `Policy.requiredDocuments`.

### For Member 4 (Database Integration)
- Reviewer cases and audit events are encapsulated behind the `IReviewRepository` interface (`src/reviewer/repository.ts`).
- Member 4 can substitute SQLite or PostgreSQL storage for `InMemoryReviewRepository` by implementing:
  - `createCase()`
  - `getCase()`
  - `listCases()`
  - `transitionCase()`
  - `getAuditHistory()`
- Without altering `app.ts` controller routes or state machine rules.

---

## 5. API Reference & Examples

### 5.1 Service Health
`GET /health`

**Response (`200 OK`)**:
```json
{
  "status": "ok",
  "service": "policy-service",
  "timestamp": "2026-10-15T16:45:00.000Z",
  "disclaimer": "PRELIMINARY_ASSESSMENT_ONLY — not a clinical or legal system"
}
```

---

### 5.2 List Policies
`GET /api/policies`

**Response (`200 OK`)**:
```json
{
  "policies": [
    {
      "policyId": "DEMO-POL-001",
      "version": "1.0",
      "policyName": "DemoShield Comprehensive Plan",
      "insurerName": "DemoShield Insurance Co. (Synthetic)",
      "effectiveDate": "2025-01-01",
      "expiryDate": "2025-12-31",
      "waitingPeriodDays": 30,
      "coverageLimit": 500000,
      "sublimits": [
        { "category": "ICU", "limitAmount": 150000 },
        { "category": "Maternity", "limitAmount": 75000 }
      ],
      "deductible": 5000,
      "coPaymentPercent": 10,
      "exclusions": ["Cosmetic Surgery", "Dental", "Eyeglasses"],
      "requiredDocuments": [
        "Hospital Discharge Summary",
        "Doctor Prescription",
        "Itemized Medical Bill"
      ],
      "createdAt": "2025-01-01T00:00:00.000Z",
      "_syntheticDemo": true
    }
  ],
  "count": 3
}
```

---

### 5.3 Policy Radar (Comparison)
`POST /api/policy-radar` (or alias `POST /api/policies/compare`)

**Request**:
```json
{
  "baselinePolicyId": "DEMO-POL-001",
  "targetPolicyId": "DEMO-POL-002"
}
```

**Response (`200 OK`)**:
```json
{
  "comparisonId": "CMP-1760546700000-abc12",
  "comparedAt": "2026-10-15T16:45:00.000Z",
  "baselinePolicy": {
    "policyId": "DEMO-POL-001",
    "version": "1.0",
    "policyName": "DemoShield Comprehensive Plan",
    "insurerName": "DemoShield Insurance Co. (Synthetic)",
    "effectiveDate": "2025-01-01",
    "expiryDate": "2025-12-31",
    "isDateKnown": true
  },
  "targetPolicy": {
    "policyId": "DEMO-POL-002",
    "version": "1.0",
    "policyName": "DemoShield Basic Plan",
    "insurerName": "DemoShield Insurance Co. (Synthetic)",
    "effectiveDate": "2025-04-01",
    "expiryDate": "2026-03-31",
    "isDateKnown": true
  },
  "isComparable": true,
  "insufficientDataReasons": [],
  "fieldDifferences": [
    {
      "field": "deductible",
      "fieldLabel": "Deductible",
      "baselineValue": 5000,
      "targetValue": 10000,
      "changeType": "increased",
      "factualDifference": "Deductible increased by INR 5,000 (from INR 5,000 to INR 10,000).",
      "financialImpact": "unfavorable_to_member",
      "financialImpactExplanation": "Higher deductible increases member's out-of-pocket obligation before insurance coverage begins."
    },
    {
      "field": "coPaymentPercent",
      "fieldLabel": "Co-Payment Percentage",
      "baselineValue": 10,
      "targetValue": 20,
      "changeType": "increased",
      "factualDifference": "Co-payment increased by 10% (from 10% to 20%).",
      "financialImpact": "unfavorable_to_member",
      "financialImpactExplanation": "Member must pay a higher percentage of approved claim amounts."
    },
    {
      "field": "waitingPeriodDays",
      "fieldLabel": "Initial Waiting Period",
      "baselineValue": 30,
      "targetValue": 90,
      "changeType": "increased",
      "factualDifference": "Waiting period increased by 60 days (from 30 to 90 days).",
      "financialImpact": "unfavorable_to_member",
      "financialImpactExplanation": "Member must wait longer after policy inception before claims become eligible."
    },
    {
      "field": "coverageLimit",
      "fieldLabel": "Annual Coverage Limit",
      "baselineValue": 500000,
      "targetValue": 200000,
      "changeType": "decreased",
      "factualDifference": "Annual coverage limit decreased by INR 300,000 (from INR 500,000 to INR 200,000).",
      "financialImpact": "unfavorable_to_member",
      "financialImpactExplanation": "Lower aggregate insurance coverage available across the policy year."
    }
  ],
  "sublimitDifferences": [
    {
      "category": "ICU",
      "baselineLimit": 150000,
      "targetLimit": null,
      "changeType": "removed",
      "factualDifference": "Sublimit of INR 150,000 removed for \"ICU\".",
      "financialImpact": "favorable_to_member"
    },
    {
      "category": "Outpatient",
      "baselineLimit": null,
      "targetLimit": 20000,
      "changeType": "added",
      "factualDifference": "New sublimit of INR 20,000 added for \"Outpatient\".",
      "financialImpact": "unfavorable_to_member"
    }
  ],
  "exclusionDifferences": {
    "field": "exclusions",
    "fieldLabel": "Policy Exclusions",
    "added": ["Pre-existing Conditions"],
    "removed": ["Eyeglasses"],
    "retained": ["Dental", "Cosmetic Surgery"],
    "factualDifference": "Added 1 exclusion(s): [Pre-existing Conditions]; Removed 1 exclusion(s): [Eyeglasses]",
    "financialImpact": "unknown"
  },
  "requiredDocumentDifferences": {
    "field": "requiredDocuments",
    "fieldLabel": "Mandatory Claim Documents",
    "added": ["Policy ID Card"],
    "removed": ["Doctor Prescription"],
    "retained": ["Hospital Discharge Summary", "Itemized Medical Bill"],
    "factualDifference": "Added 1 required document(s): [Policy ID Card]; Removed 1 required document(s): [Doctor Prescription]",
    "financialImpact": "unknown"
  },
  "applicabilityNotice": "This policy radar comparison reflects structural differences between policy terms. These changes do NOT automatically apply to a claimant unless their verified admission or service date falls within the respective policy's active effective window (Baseline DEMO-POL-001 [v1.0]: 2025-01-01 to 2025-12-31; Target DEMO-POL-002 [v1.0]: 2025-04-01 to 2026-03-31). Policy revisions do not apply retroactively to already-admitted claims without authorized insurer endorsement.",
  "disclaimer": "INFORMATIONAL_ONLY_NOT_A_GUARANTEE_OF_COVERAGE"
}
```

---

### 5.4 What-If Simulator
`POST /api/simulate`

**Request**:
```json
{
  "claimId": "DEMO-CLM-005",
  "policyId": "DEMO-POL-002",
  "modifications": {
    "hypotheticalServiceDate": "2025-07-20",
    "addDocuments": ["Doctor Prescription"],
    "hypotheticalHospitalBillAmount": 25000,
    "hypotheticalCoveredExpenseAmount": 22000
  }
}
```

**Response (`200 OK`)**:
```json
{
  "simulationId": "SIM-1760546700000-xyz89",
  "simulatedAt": "2026-10-15T16:45:00.000Z",
  "scenariosApplied": [
    "Service/Admission date shifted to 2025-07-20.",
    "Added documents: [Doctor Prescription].",
    "Hypothetical hospital bill set to INR 25,000.",
    "Hypothetical covered expense set to INR 22,000."
  ],
  "baseline": { "...": "Full baseline claim, policy, evaluation and estimation" },
  "scenario": { "...": "Full scenario claim, policy, evaluation and estimation" },
  "differenceSummary": {
    "overallStatusChange": {
      "baseline": "FAIL",
      "scenario": "PASS",
      "changed": true,
      "transitionDescription": "Overall assessment status changed from FAIL to PASS."
    },
    "ruleStatusChanges": [
      {
        "ruleId": "R03_WAITING_PERIOD",
        "ruleDescription": "Evaluates initial waiting period compliance",
        "baselineStatus": "FAIL",
        "scenarioStatus": "PASS",
        "changed": true,
        "explanation": "Status changed from FAIL to PASS. Waiting period of 90 days satisfied (110 days elapsed since policy start date 2025-04-01)."
      }
    ],
    "financialDelta": {
      "baselineInsurerPortion": 8000,
      "scenarioInsurerPortion": 9600,
      "insurerPortionDelta": 1600,
      "baselinePatientPortion": 6000,
      "scenarioPatientPortion": 12400,
      "patientPortionDelta": 6400,
      "baselineEligibleAmount": 14000,
      "scenarioEligibleAmount": 20000,
      "eligibleAmountDelta": 6000,
      "financialSummaryExplanation": "Insurer portion increased by INR 1,600; Patient out-of-pocket increased by INR 6,400."
    },
    "documentChanges": {
      "baselineDocuments": ["Hospital Discharge Summary", "Itemized Medical Bill", "Policy ID Card"],
      "scenarioDocuments": ["Hospital Discharge Summary", "Itemized Medical Bill", "Policy ID Card", "Doctor Prescription"],
      "addedDocuments": ["Doctor Prescription"],
      "removedDocuments": [],
      "newlySatisfiedRequirements": [],
      "newlyUnsatisfiedRequirements": []
    }
  },
  "assumptions": [
    "Simulations are hypothetical analytical projections and assume verified validity of supplied inputs."
  ],
  "missingInformation": [],
  "notice": "What-If simulator results are strictly hypothetical and provide ESTIMATE_ONLY projections. They do NOT constitute pre-authorization, approval, or coverage guarantee. Clinical facts and dates must never be misrepresented to alter coverage outcomes.",
  "disclaimer": "ESTIMATE_ONLY"
}
```

---

### 5.5 Reviewer Workflow

#### Create Review Case
`POST /api/review`

**Request**:
```json
{
  "claimId": "DEMO-CLM-002",
  "policyId": "DEMO-POL-001",
  "reviewerNotes": "ICU stay requires medical necessity review."
}
```
**Response (`202 Accepted`)**:
```json
{
  "caseId": "REV-1760546700000-ABCD",
  "reviewStatus": "PENDING_REVIEWER",
  "claimId": "DEMO-CLM-002",
  "policyId": "DEMO-POL-001",
  "submittedAt": "2026-10-15T16:45:00.000Z",
  "reviewerNotes": "ICU stay requires medical necessity review.",
  "assignedReviewerId": null,
  "preliminaryEvaluation": { "...": "Rules evaluation report" },
  "coverageEstimation": { "...": "Financial coverage breakdown" },
  "informationRequests": [],
  "auditHistory": [
    {
      "eventId": "EVT-1760546700000-INIT",
      "caseId": "REV-1760546700000-ABCD",
      "priorState": "PENDING_REVIEWER",
      "newState": "PENDING_REVIEWER",
      "action": "START_REVIEW",
      "timestamp": "2026-10-15T16:45:00.000Z",
      "reviewerId": null,
      "reason": "Case submitted for reviewer assessment."
    }
  ],
  "notice": "PRELIMINARY assessment package for authorized human reviewer. No automated approval or denial has been issued."
}
```

#### List Review Cases
`GET /api/review`

#### Get Review Case by ID
`GET /api/review/:caseId`

#### Execute Reviewer State Transition
`POST /api/review/:caseId/transition`

**Example 1: Request Information**
```json
{
  "action": "REQUEST_INFORMATION",
  "reviewerId": "REV-DR-KUMAR",
  "reason": "Missing daily ICU clinical monitoring chart to substantiate high intensity charge.",
  "requiredDocuments": ["ICU Daily Progress Chart", "Specialist Consultation Notes"]
}
```

**Example 2: Record Recommendation**
```json
{
  "action": "RECORD_RECOMMENDATION",
  "reviewerId": "REV-DR-KUMAR",
  "reviewerRole": "Senior Medical Officer",
  "recommendation": "APPROVE_AS_PREPARED",
  "reason": "ICU admission medically indicated following acute myocardial infarction. Sublimit of INR 150,000 appropriately applied.",
  "supportingEvidenceRefs": ["DOC-ICU-001:p3", "R05_SUBLIMIT"],
  "recommendedInsurerPortion": 130500,
  "recommendedPatientPortion": 49500
}
```

#### Get Case Audit Trail
`GET /api/review/:caseId/audit`

**Response (`200 OK`)**:
```json
{
  "caseId": "REV-DEMO-001",
  "count": 2,
  "auditHistory": [
    {
      "eventId": "EVT-SEED-001",
      "caseId": "REV-DEMO-001",
      "priorState": "PENDING_REVIEWER",
      "newState": "PENDING_REVIEWER",
      "action": "START_REVIEW",
      "timestamp": "2025-03-11T09:00:00.000Z",
      "reviewerId": "SYSTEM_ROUTER",
      "reason": "Initial routing to human reviewer due to sublimit flag.",
      "details": { "initial": true }
    },
    {
      "eventId": "EVT-1760546700000-ghij1",
      "caseId": "REV-DEMO-001",
      "priorState": "PENDING_REVIEWER",
      "newState": "IN_REVIEW",
      "action": "START_REVIEW",
      "timestamp": "2026-10-15T16:46:00.000Z",
      "reviewerId": "REV-DR-KUMAR",
      "reason": null,
      "details": { "notes": "Commencing review." }
    }
  ]
}
```

---

## 6. Running Tests & Development

```bash
# Run all unit and integration tests (116 tests)
npm test

# Run tests in watch mode
npm run test:watch

# Typecheck and build TypeScript to dist/
npm run build

# Start production server (runs dist/server.js on PORT or 3002)
npm start

# Start development server with hot-reload via tsx
npm run dev
```
