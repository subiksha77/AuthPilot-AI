/**
 * AuthPilot AI — Policy Service Express Application
 *
 * Routes:
 *   GET  /health                       — Health check
 *   GET  /api/policies                 — List all synthetic demo policies
 *   GET  /api/policies/:policyId       — Get policy by ID
 *   GET  /api/claims                   — List all synthetic demo claims
 *   GET  /api/claims/:claimId          — Get claim by ID
 *   POST /api/evaluate                 — Evaluate a claim against a policy
 *   POST /api/estimate                 — Estimate coverage for a claim
 *   POST /api/policy-radar             — Compare policy versions / products (Policy Radar)
 *   POST /api/policies/compare         — Alias for policy-radar
 *   POST /api/simulate                 — What-If scenario simulator
 *   GET  /api/review                   — List all review cases
 *   POST /api/review                   — Submit/create a review case
 *   GET  /api/review/:caseId           — Get details of a review case
 *   POST /api/review/:caseId/transition— Execute reviewer state transition
 *   GET  /api/review/:caseId/audit     — Get audit trail of a review case
 */

import express, { Request, Response, NextFunction } from "express";
import { evaluateClaim } from "./rules/engine.js";
import { estimateCoverage } from "./estimator/coverageCalculator.js";
import { comparePolicies } from "./radar/comparator.js";
import { simulateScenario, SimulationValidationError } from "./simulator/simulator.js";
import { defaultReviewRepository } from "./reviewer/repository.js";
import { WorkflowValidationError } from "./reviewer/stateMachine.js";
import {
  SYNTHETIC_POLICIES,
  getPolicyById,
} from "./data/syntheticPolicies.js";
import { SYNTHETIC_CLAIMS, getClaimById } from "./data/syntheticClaims.js";
import type { Claim } from "./types/claim.js";
import type { Policy } from "./types/policy.js";
import type { SimulationModifications } from "./types/simulator.js";
import type { TransitionRequest } from "./types/reviewer.js";

export const app = express();

app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// CORS (for frontend dev integration)
// ─────────────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});
app.options("*", (_req: Request, res: Response) => { res.sendStatus(204); });

// ─────────────────────────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "policy-service",
    timestamp: new Date().toISOString(),
    disclaimer: "PRELIMINARY_ASSESSMENT_ONLY — not a clinical or legal system",
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Policies
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/policies", (_req: Request, res: Response) => {
  res.json({ policies: SYNTHETIC_POLICIES, count: SYNTHETIC_POLICIES.length });
});

app.get("/api/policies/:policyId", (req: Request, res: Response) => {
  const policy = getPolicyById(req.params.policyId);
  if (!policy) {
    res.status(404).json({ error: `Policy "${req.params.policyId}" not found.` });
    return;
  }
  res.json(policy);
});

// ─────────────────────────────────────────────────────────────────────────────
// Claims
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/claims", (_req: Request, res: Response) => {
  res.json({ claims: SYNTHETIC_CLAIMS, count: SYNTHETIC_CLAIMS.length });
});

app.get("/api/claims/:claimId", (req: Request, res: Response) => {
  const claim = getClaimById(req.params.claimId);
  if (!claim) {
    res.status(404).json({ error: `Claim "${req.params.claimId}" not found.` });
    return;
  }
  res.json(claim);
});

// ─────────────────────────────────────────────────────────────────────────────
// Evaluate
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/evaluate", (req: Request, res: Response) => {
  const { claimId, policyId, claim: rawClaim, policy: rawPolicy } = req.body as {
    claimId?: string;
    policyId?: string;
    claim?: Claim;
    policy?: Policy;
  };

  let claim: Claim | undefined;
  let policy: Policy | undefined;

  // Resolve by IDs first, then fall back to inline objects
  if (claimId) claim = getClaimById(claimId);
  if (!claim && rawClaim) claim = rawClaim;

  if (policyId) policy = getPolicyById(policyId);
  if (!policy && rawPolicy) policy = rawPolicy;

  if (!claim) {
    res.status(400).json({ error: "Provide claimId or a full claim object." });
    return;
  }
  if (!policy) {
    res.status(400).json({ error: "Provide policyId or a full policy object." });
    return;
  }

  try {
    const report = evaluateClaim(claim, policy);
    res.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error during evaluation.";
    res.status(500).json({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Estimate
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/estimate", (req: Request, res: Response) => {
  const { claimId, policyId, claim: rawClaim, policy: rawPolicy } = req.body as {
    claimId?: string;
    policyId?: string;
    claim?: Claim;
    policy?: Policy;
  };

  let claim: Claim | undefined;
  let policy: Policy | undefined;

  if (claimId) claim = getClaimById(claimId);
  if (!claim && rawClaim) claim = rawClaim;

  if (policyId) policy = getPolicyById(policyId);
  if (!policy && rawPolicy) policy = rawPolicy;

  if (!claim) {
    res.status(400).json({ error: "Provide claimId or a full claim object." });
    return;
  }
  if (!policy) {
    res.status(400).json({ error: "Provide policyId or a full policy object." });
    return;
  }

  try {
    const estimation = estimateCoverage(claim, policy);
    res.json(estimation);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error during estimation.";
    res.status(500).json({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Policy Radar — Compare Policy Versions / Products
// ─────────────────────────────────────────────────────────────────────────────
const handlePolicyComparison = (req: Request, res: Response) => {
  const {
    baselinePolicyId,
    targetPolicyId,
    baselinePolicy: rawBaseline,
    targetPolicy: rawTarget,
  } = req.body as {
    baselinePolicyId?: string;
    targetPolicyId?: string;
    baselinePolicy?: Partial<Policy>;
    targetPolicy?: Partial<Policy>;
  };

  let baseline = rawBaseline;
  let target = rawTarget;

  if (baselinePolicyId) {
    const found = getPolicyById(baselinePolicyId);
    if (!found) {
      res.status(404).json({ error: `Baseline policy "${baselinePolicyId}" not found.` });
      return;
    }
    baseline = found;
  }

  if (targetPolicyId) {
    const found = getPolicyById(targetPolicyId);
    if (!found) {
      res.status(404).json({ error: `Target policy "${targetPolicyId}" not found.` });
      return;
    }
    target = found;
  }

  if (!baseline && !target) {
    res.status(400).json({
      error: "Specify baseline and target policies via IDs (baselinePolicyId, targetPolicyId) or inline policy objects.",
    });
    return;
  }

  const result = comparePolicies(baseline, target);
  res.json(result);
};

app.post("/api/policy-radar", handlePolicyComparison);
app.post("/api/policies/compare", handlePolicyComparison);

// ─────────────────────────────────────────────────────────────────────────────
// What-If Simulator — Simulate Hypothetical Scenarios
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/simulate", (req: Request, res: Response) => {
  const {
    claimId,
    policyId,
    claim: rawClaim,
    policy: rawPolicy,
    modifications,
  } = req.body as {
    claimId?: string;
    policyId?: string;
    claim?: Claim;
    policy?: Policy;
    modifications?: SimulationModifications;
  };

  if (!modifications || typeof modifications !== "object") {
    res.status(400).json({ error: "modifications object is required for simulation." });
    return;
  }

  let claim: Claim | undefined;
  let policy: Policy | undefined;

  if (claimId) claim = getClaimById(claimId);
  if (!claim && rawClaim) claim = rawClaim;

  if (policyId) policy = getPolicyById(policyId);
  if (!policy && rawPolicy) policy = rawPolicy;

  if (!claim) {
    res.status(400).json({ error: "Provide claimId or a full claim object." });
    return;
  }
  if (!policy) {
    res.status(400).json({ error: "Provide policyId or a full policy object." });
    return;
  }

  let alternatePolicy: Policy | undefined;
  if (modifications.alternatePolicyId) {
    alternatePolicy = getPolicyById(modifications.alternatePolicyId);
    if (!alternatePolicy) {
      res.status(404).json({ error: `Alternate policy "${modifications.alternatePolicyId}" not found.` });
      return;
    }
  }

  try {
    const result = simulateScenario(claim, policy, modifications, alternatePolicy);
    res.json(result);
  } catch (err) {
    if (err instanceof SimulationValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : "Unexpected simulation error.";
    res.status(500).json({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Reviewer Workflow — Cases, State Machine & Audit History
// ─────────────────────────────────────────────────────────────────────────────

// List all review cases
app.get("/api/review", (_req: Request, res: Response) => {
  const cases = defaultReviewRepository.listCases();
  res.json({ cases, count: cases.length });
});

// Submit / Create new review case
app.post("/api/review", (req: Request, res: Response) => {
  const { claimId, policyId, reviewerNotes, assignedReviewerId } = req.body as {
    claimId?: string;
    policyId?: string;
    reviewerNotes?: string;
    assignedReviewerId?: string;
  };

  if (!claimId || !policyId) {
    res.status(400).json({ error: "claimId and policyId are required." });
    return;
  }

  const claim = getClaimById(claimId);
  const policy = getPolicyById(policyId);

  if (!claim) {
    res.status(404).json({ error: `Claim "${claimId}" not found.` });
    return;
  }
  if (!policy) {
    res.status(404).json({ error: `Policy "${policyId}" not found.` });
    return;
  }

  try {
    const reviewCase = defaultReviewRepository.createCase(
      claimId,
      policyId,
      reviewerNotes,
      assignedReviewerId
    );

    // Maintain backwards compatibility with Phase 1 response while adding caseId and audit trail
    const responsePayload = {
      caseId: reviewCase.caseId,
      reviewStatus: reviewCase.currentStatus,
      claimId: reviewCase.claimId,
      policyId: reviewCase.policyId,
      submittedAt: reviewCase.createdAt,
      reviewerNotes: reviewCase.reviewerNotes,
      assignedReviewerId: reviewCase.assignedReviewerId,
      preliminaryEvaluation: reviewCase.preliminaryEvaluation,
      coverageEstimation: reviewCase.coverageEstimation,
      informationRequests: reviewCase.informationRequests,
      auditHistory: reviewCase.auditHistory,
      notice: reviewCase.notice,
    };

    res.status(202).json(responsePayload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error creating review case.";
    res.status(500).json({ error: message });
  }
});

// Get review case by ID
app.get("/api/review/:caseId", (req: Request, res: Response) => {
  const reviewCase = defaultReviewRepository.getCase(req.params.caseId);
  if (!reviewCase) {
    res.status(404).json({ error: `Review case "${req.params.caseId}" not found.` });
    return;
  }
  res.json(reviewCase);
});

// Execute state transition on a review case
app.post("/api/review/:caseId/transition", (req: Request, res: Response) => {
  const transition = req.body as TransitionRequest;
  if (!transition || !transition.action) {
    res.status(400).json({ error: "Action is required for state transition." });
    return;
  }

  try {
    const updatedCase = defaultReviewRepository.transitionCase(req.params.caseId, transition);
    res.json(updatedCase);
  } catch (err) {
    if (err instanceof WorkflowValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof Error && err.message.includes("not found")) {
      res.status(404).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : "Unexpected workflow transition error.";
    res.status(500).json({ error: message });
  }
});

// Get audit history for a review case
app.get("/api/review/:caseId/audit", (req: Request, res: Response) => {
  try {
    const auditHistory = defaultReviewRepository.getAuditHistory(req.params.caseId);
    res.json({
      caseId: req.params.caseId,
      count: auditHistory.length,
      auditHistory,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      res.status(404).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : "Error retrieving audit history.";
    res.status(500).json({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 404 handler
// ─────────────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found." });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error handler
// ─────────────────────────────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[policy-service] Unhandled error:", err);
  res.status(500).json({ error: err.message ?? "Internal server error." });
});
