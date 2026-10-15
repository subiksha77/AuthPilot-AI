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
 *   POST /api/review                   — Submit claim for reviewer workflow
 */

import express, { Request, Response, NextFunction } from "express";
import { evaluateClaim } from "./rules/engine.js";
import { estimateCoverage } from "./estimator/coverageCalculator.js";
import {
  SYNTHETIC_POLICIES,
  getPolicyById,
} from "./data/syntheticPolicies.js";
import { SYNTHETIC_CLAIMS, getClaimById } from "./data/syntheticClaims.js";
import type { Claim } from "./types/claim.js";
import type { Policy } from "./types/policy.js";

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
// Reviewer Workflow — Submit for Human Review
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/review", (req: Request, res: Response) => {
  const { claimId, policyId, reviewerNotes } = req.body as {
    claimId?: string;
    policyId?: string;
    reviewerNotes?: string;
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

  // Produce preliminary evaluation and estimation for the reviewer's reference
  const evaluation = evaluateClaim(claim, policy);
  const estimation = estimateCoverage(claim, policy);

  const reviewPackage = {
    reviewStatus: "PENDING_REVIEWER",
    claimId,
    policyId,
    submittedAt: new Date().toISOString(),
    reviewerNotes: reviewerNotes ?? null,
    preliminaryEvaluation: evaluation,
    coverageEstimation: estimation,
    notice:
      "This is a PRELIMINARY assessment package for an authorized reviewer. " +
      "No automated approval or rejection has been issued. " +
      "The reviewer is responsible for the final decision.",
  };

  res.status(202).json(reviewPackage);
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
