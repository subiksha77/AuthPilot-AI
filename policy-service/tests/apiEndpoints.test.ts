/**
 * AuthPilot AI — API Endpoints Integration Tests
 *
 * Verifies all HTTP routes on the policy-service Express app:
 * Health, Policies, Claims, Evaluation, Estimation, Policy Radar, What-If Simulator,
 * and Reviewer Workflow endpoints (including error conditions and 4xx status codes).
 */

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { defaultReviewRepository } from "../src/reviewer/repository.js";

describe("Policy Service — API Endpoints", () => {
  beforeEach(() => {
    defaultReviewRepository.reset();
  });

  // ── Health ──────────────────────────────────────────────────────────────────
  describe("GET /health", () => {
    it("returns 200 with service information and disclaimer", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.service).toBe("policy-service");
      expect(res.body.disclaimer).toContain("PRELIMINARY_ASSESSMENT_ONLY");
    });
  });

  // ── Policies ────────────────────────────────────────────────────────────────
  describe("GET /api/policies", () => {
    it("returns all synthetic policies", async () => {
      const res = await request(app).get("/api/policies");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.policies)).toBe(true);
      expect(res.body.count).toBeGreaterThan(0);
    });

    it("GET /api/policies/:policyId returns 200 for known policy", async () => {
      const res = await request(app).get("/api/policies/DEMO-POL-001");
      expect(res.status).toBe(200);
      expect(res.body.policyId).toBe("DEMO-POL-001");
    });

    it("GET /api/policies/:policyId returns 404 for unknown policy", async () => {
      const res = await request(app).get("/api/policies/NON-EXISTENT");
      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
    });
  });

  // ── Claims ──────────────────────────────────────────────────────────────────
  describe("GET /api/claims", () => {
    it("returns all synthetic claims", async () => {
      const res = await request(app).get("/api/claims");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.claims)).toBe(true);
      expect(res.body.count).toBeGreaterThan(0);
    });

    it("GET /api/claims/:claimId returns 200 for known claim", async () => {
      const res = await request(app).get("/api/claims/DEMO-CLM-001");
      expect(res.status).toBe(200);
      expect(res.body.claimId).toBe("DEMO-CLM-001");
    });

    it("GET /api/claims/:claimId returns 404 for unknown claim", async () => {
      const res = await request(app).get("/api/claims/NON-EXISTENT");
      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
    });
  });

  // ── Evaluation & Estimation ─────────────────────────────────────────────────
  describe("POST /api/evaluate", () => {
    it("evaluates a valid claim and policy by ID", async () => {
      const res = await request(app)
        .post("/api/evaluate")
        .send({ claimId: "DEMO-CLM-001", policyId: "DEMO-POL-001" });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("overallStatus");
      expect(res.body.disclaimer).toBe("PRELIMINARY_ASSESSMENT_ONLY");
    });

    it("returns 400 when claimId/policyId is missing", async () => {
      const res = await request(app).post("/api/evaluate").send({});
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/estimate", () => {
    it("calculates coverage estimation for a valid claim and policy", async () => {
      const res = await request(app)
        .post("/api/estimate")
        .send({ claimId: "DEMO-CLM-001", policyId: "DEMO-POL-001" });
      expect(res.status).toBe(200);
      expect(res.body.breakdown.label).toBe("ESTIMATE_ONLY");
      expect(res.body.disclaimer).toBe("ALL_FIGURES_ARE_ESTIMATES_NOT_GUARANTEED_PAYOUTS");
    });
  });

  // ── Policy Radar ────────────────────────────────────────────────────────────
  describe("POST /api/policy-radar", () => {
    it("compares two synthetic policies by ID", async () => {
      const res = await request(app)
        .post("/api/policy-radar")
        .send({
          baselinePolicyId: "DEMO-POL-001",
          targetPolicyId: "DEMO-POL-002",
        });

      expect(res.status).toBe(200);
      expect(res.body.isComparable).toBe(true);
      expect(res.body.disclaimer).toBe("INFORMATIONAL_ONLY_NOT_A_GUARANTEE_OF_COVERAGE");
      expect(res.body.fieldDifferences.length).toBeGreaterThan(0);
    });

    it("works via alias route /api/policies/compare", async () => {
      const res = await request(app)
        .post("/api/policies/compare")
        .send({
          baselinePolicyId: "DEMO-POL-001",
          targetPolicyId: "DEMO-POL-003",
        });

      expect(res.status).toBe(200);
      expect(res.body.isComparable).toBe(true);
    });

    it("returns 404 if baseline policy ID is not found", async () => {
      const res = await request(app)
        .post("/api/policy-radar")
        .send({
          baselinePolicyId: "UNKNOWN-POL",
          targetPolicyId: "DEMO-POL-002",
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
    });

    it("returns 400 when neither IDs nor policy objects are provided", async () => {
      const res = await request(app).post("/api/policy-radar").send({});
      expect(res.status).toBe(400);
    });
  });

  // ── What-If Simulator ───────────────────────────────────────────────────────
  describe("POST /api/simulate", () => {
    it("runs simulation with date shift and document checklist addition", async () => {
      const res = await request(app)
        .post("/api/simulate")
        .send({
          claimId: "DEMO-CLM-005",
          policyId: "DEMO-POL-002",
          modifications: {
            hypotheticalServiceDate: "2025-08-01",
            addDocuments: ["Doctor Prescription"],
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.disclaimer).toBe("ESTIMATE_ONLY");
      expect(res.body.scenario.claim.serviceDate).toBe("2025-08-01");
      expect(res.body.differenceSummary.ruleStatusChanges.length).toBeGreaterThan(0);
    });

    it("returns 400 when modifications object is missing", async () => {
      const res = await request(app)
        .post("/api/simulate")
        .send({ claimId: "DEMO-CLM-001", policyId: "DEMO-POL-001" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("modifications");
    });

    it("returns 400 when simulation input fails validation (invalid date)", async () => {
      const res = await request(app)
        .post("/api/simulate")
        .send({
          claimId: "DEMO-CLM-001",
          policyId: "DEMO-POL-001",
          modifications: {
            hypotheticalServiceDate: "invalid-date-format",
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("hypotheticalServiceDate");
    });

    it("returns 404 if alternatePolicyId is specified but not found", async () => {
      const res = await request(app)
        .post("/api/simulate")
        .send({
          claimId: "DEMO-CLM-001",
          policyId: "DEMO-POL-001",
          modifications: {
            alternatePolicyId: "UNKNOWN-POLICY",
          },
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
    });
  });

  // ── Reviewer Workflow & Audit ───────────────────────────────────────────────
  describe("Reviewer Workflow Routes", () => {
    it("POST /api/review creates a new review case with 202 Accepted", async () => {
      const res = await request(app)
        .post("/api/review")
        .send({
          claimId: "DEMO-CLM-001",
          policyId: "DEMO-POL-001",
          reviewerNotes: "Urgent review for surgical coverage.",
          assignedReviewerId: "REV-100",
        });

      expect(res.status).toBe(202);
      expect(res.body.caseId).toBeDefined();
      expect(res.body.reviewStatus).toBe("PENDING_REVIEWER");
      expect(res.body.claimId).toBe("DEMO-CLM-001");
      expect(res.body.policyId).toBe("DEMO-POL-001");
      expect(res.body.auditHistory.length).toBeGreaterThanOrEqual(1);
    });

    it("GET /api/review lists seeded and created cases", async () => {
      const res = await request(app).get("/api/review");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.cases)).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
    });

    it("GET /api/review/:caseId returns case details", async () => {
      const res = await request(app).get("/api/review/REV-DEMO-001");
      expect(res.status).toBe(200);
      expect(res.body.caseId).toBe("REV-DEMO-001");
      expect(res.body.currentStatus).toBe("PENDING_REVIEWER");
    });

    it("POST /api/review/:caseId/transition advances state machine and records audit event", async () => {
      // 1. START_REVIEW
      const res1 = await request(app)
        .post("/api/review/REV-DEMO-001/transition")
        .send({
          action: "START_REVIEW",
          reviewerId: "DR-ALICE",
          notes: "Beginning review.",
        });

      expect(res1.status).toBe(200);
      expect(res1.body.currentStatus).toBe("IN_REVIEW");

      // 2. RECORD_RECOMMENDATION
      const res2 = await request(app)
        .post("/api/review/REV-DEMO-001/transition")
        .send({
          action: "RECORD_RECOMMENDATION",
          reviewerId: "DR-ALICE",
          recommendation: "APPROVE_AS_PREPARED",
          reason: "All clinical guidelines satisfied.",
          supportingEvidenceRefs: ["DOC-001:p1"],
        });

      expect(res2.status).toBe(200);
      expect(res2.body.currentStatus).toBe("RECOMMENDATION_RECORDED");
      expect(res2.body.recommendation.reviewerId).toBe("DR-ALICE");
    });

    it("POST /api/review/:caseId/transition rejects invalid transition with 400", async () => {
      // Direct jump from PENDING_REVIEWER to CLOSED is disallowed
      const res = await request(app)
        .post("/api/review/REV-DEMO-001/transition")
        .send({
          action: "CLOSE_REVIEW",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("not permitted");
    });

    it("GET /api/review/:caseId/audit returns audit history", async () => {
      const res = await request(app).get("/api/review/REV-DEMO-001/audit");
      expect(res.status).toBe(200);
      expect(res.body.caseId).toBe("REV-DEMO-001");
      expect(Array.isArray(res.body.auditHistory)).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
    });

    it("returns 404 for non-existent case on transition or audit", async () => {
      const res1 = await request(app)
        .post("/api/review/NON-EXISTENT/transition")
        .send({ action: "START_REVIEW" });
      expect(res1.status).toBe(404);

      const res2 = await request(app).get("/api/review/NON-EXISTENT/audit");
      expect(res2.status).toBe(404);
    });
  });

  // ── 404 Fallback ────────────────────────────────────────────────────────────
  describe("404 Route Handler", () => {
    it("returns 404 JSON for undefined routes", async () => {
      const res = await request(app).get("/api/unknown-endpoint");
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Route not found.");
    });
  });
});
