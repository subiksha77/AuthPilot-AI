/**
 * AuthPilot AI — Policy Change Impact Radar (Comparator Module)
 *
 * Compares two policy definitions or versions and reports:
 * - Factual field differences (deductible, copay, waiting period, limit, sublimits, exclusions, documents, premium)
 * - Direction of financial impact (favorable/unfavorable/neutral) separated from factual changes
 * - Explicit labeling: increased, decreased, added, removed, changed, unchanged
 * - Insufficient data / uncertainty handling
 * - Strict non-guarantee and version-applicability notices
 */

import type { Policy, Sublimit } from "../types/policy.js";
import type {
  PolicyComparisonResult,
  PolicyVersionSummary,
  FieldDifference,
  SublimitDifference,
  ListDifference,
  FinancialImpactDirection,
  FieldChangeType,
} from "../types/radar.js";

function summarizePolicy(policy?: Partial<Policy>): PolicyVersionSummary {
  const isDateKnown = Boolean(policy?.effectiveDate && policy?.expiryDate);
  return {
    policyId: policy?.policyId ?? "UNKNOWN_POLICY_ID",
    version: policy?.version ?? "UNKNOWN_VERSION",
    policyName: policy?.policyName ?? "Unnamed Policy",
    insurerName: policy?.insurerName ?? "Unknown Insurer",
    effectiveDate: policy?.effectiveDate ?? null,
    expiryDate: policy?.expiryDate ?? null,
    isDateKnown,
  };
}

export function comparePolicies(
  baseline: Partial<Policy> | undefined,
  target: Partial<Policy> | undefined
): PolicyComparisonResult {
  const comparisonId = `CMP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const comparedAt = new Date().toISOString();

  const baselineSummary = summarizePolicy(baseline);
  const targetSummary = summarizePolicy(target);

  const insufficientDataReasons: string[] = [];

  if (!baseline) {
    insufficientDataReasons.push("Baseline policy was not provided.");
  }
  if (!target) {
    insufficientDataReasons.push("Target policy was not provided.");
  }

  if (baseline && !baseline.policyId) {
    insufficientDataReasons.push("Baseline policy is missing a policyId.");
  }
  if (target && !target.policyId) {
    insufficientDataReasons.push("Target policy is missing a policyId.");
  }

  if (baseline && !baseline.effectiveDate) {
    insufficientDataReasons.push("Baseline policy is missing an effectiveDate; timeline applicability cannot be verified.");
  }
  if (target && !target.effectiveDate) {
    insufficientDataReasons.push("Target policy is missing an effectiveDate; timeline applicability cannot be verified.");
  }

  const isComparable = insufficientDataReasons.length === 0;

  const fieldDifferences: FieldDifference[] = [];
  const sublimitDifferences: SublimitDifference[] = [];
  let exclusionDifferences: ListDifference = {
    field: "exclusions",
    fieldLabel: "Policy Exclusions",
    added: [],
    removed: [],
    retained: [],
    factualDifference: "No comparison possible due to missing data.",
    financialImpact: "unknown",
  };
  let requiredDocumentDifferences: ListDifference = {
    field: "requiredDocuments",
    fieldLabel: "Mandatory Claim Documents",
    added: [],
    removed: [],
    retained: [],
    factualDifference: "No comparison possible due to missing data.",
    financialImpact: "unknown",
  };

  if (isComparable && baseline && target) {
    // 1. Deductible (INR) — higher = unfavorable for member
    if (baseline.deductible !== undefined && target.deductible !== undefined) {
      const diff = target.deductible - baseline.deductible;
      let changeType: FieldChangeType = "unchanged";
      let impact: FinancialImpactDirection = "neutral";
      let factual = `Deductible is unchanged at INR ${baseline.deductible.toLocaleString()}.`;
      let explanation = "No change to member out-of-pocket deductible.";

      if (diff > 0) {
        changeType = "increased";
        impact = "unfavorable_to_member";
        factual = `Deductible increased by INR ${diff.toLocaleString()} (from INR ${baseline.deductible.toLocaleString()} to INR ${target.deductible.toLocaleString()}).`;
        explanation = "Higher deductible increases member's out-of-pocket obligation before insurance coverage begins.";
      } else if (diff < 0) {
        changeType = "decreased";
        impact = "favorable_to_member";
        factual = `Deductible decreased by INR ${Math.abs(diff).toLocaleString()} (from INR ${baseline.deductible.toLocaleString()} to INR ${target.deductible.toLocaleString()}).`;
        explanation = "Lower deductible reduces member's upfront out-of-pocket expense.";
      }

      fieldDifferences.push({
        field: "deductible",
        fieldLabel: "Deductible",
        baselineValue: baseline.deductible,
        targetValue: target.deductible,
        changeType,
        factualDifference: factual,
        financialImpact: impact,
        financialImpactExplanation: explanation,
      });
    } else {
      insufficientDataReasons.push("Deductible is missing from one or both policies.");
    }

    // 2. Co-Payment Percent (%) — higher = unfavorable for member
    if (baseline.coPaymentPercent !== undefined && target.coPaymentPercent !== undefined) {
      const diff = target.coPaymentPercent - baseline.coPaymentPercent;
      let changeType: FieldChangeType = "unchanged";
      let impact: FinancialImpactDirection = "neutral";
      let factual = `Co-payment is unchanged at ${baseline.coPaymentPercent}%.`;
      let explanation = "No change to member cost-sharing percentage.";

      if (diff > 0) {
        changeType = "increased";
        impact = "unfavorable_to_member";
        factual = `Co-payment increased by ${diff}% (from ${baseline.coPaymentPercent}% to ${target.coPaymentPercent}%).`;
        explanation = "Member must pay a higher percentage of approved claim amounts.";
      } else if (diff < 0) {
        changeType = "decreased";
        impact = "favorable_to_member";
        factual = `Co-payment decreased by ${Math.abs(diff)}% (from ${baseline.coPaymentPercent}% to ${target.coPaymentPercent}%).`;
        explanation = "Member pays a smaller share of approved claim amounts.";
      }

      fieldDifferences.push({
        field: "coPaymentPercent",
        fieldLabel: "Co-Payment Percentage",
        baselineValue: baseline.coPaymentPercent,
        targetValue: target.coPaymentPercent,
        changeType,
        factualDifference: factual,
        financialImpact: impact,
        financialImpactExplanation: explanation,
      });
    } else {
      insufficientDataReasons.push("Co-payment percentage is missing from one or both policies.");
    }

    // 3. Waiting Period (Days) — higher = unfavorable for member
    if (baseline.waitingPeriodDays !== undefined && target.waitingPeriodDays !== undefined) {
      const diff = target.waitingPeriodDays - baseline.waitingPeriodDays;
      let changeType: FieldChangeType = "unchanged";
      let impact: FinancialImpactDirection = "neutral";
      let factual = `Waiting period is unchanged at ${baseline.waitingPeriodDays} days.`;
      let explanation = "Eligibility waiting timeline remains identical.";

      if (diff > 0) {
        changeType = "increased";
        impact = "unfavorable_to_member";
        factual = `Waiting period increased by ${diff} days (from ${baseline.waitingPeriodDays} to ${target.waitingPeriodDays} days).`;
        explanation = "Member must wait longer after policy inception before claims become eligible.";
      } else if (diff < 0) {
        changeType = "decreased";
        impact = "favorable_to_member";
        factual = `Waiting period decreased by ${Math.abs(diff)} days (from ${baseline.waitingPeriodDays} to ${target.waitingPeriodDays} days).`;
        explanation = "Coverage eligibility activates sooner after policy inception.";
      }

      fieldDifferences.push({
        field: "waitingPeriodDays",
        fieldLabel: "Initial Waiting Period",
        baselineValue: baseline.waitingPeriodDays,
        targetValue: target.waitingPeriodDays,
        changeType,
        factualDifference: factual,
        financialImpact: impact,
        financialImpactExplanation: explanation,
      });
    } else {
      insufficientDataReasons.push("Waiting period is missing from one or both policies.");
    }

    // 4. Annual Coverage Limit (INR) — higher = favorable for member
    if (baseline.coverageLimit !== undefined && target.coverageLimit !== undefined) {
      const diff = target.coverageLimit - baseline.coverageLimit;
      let changeType: FieldChangeType = "unchanged";
      let impact: FinancialImpactDirection = "neutral";
      let factual = `Annual coverage limit is unchanged at INR ${baseline.coverageLimit.toLocaleString()}.`;
      let explanation = "Total annual coverage cap remains identical.";

      if (diff > 0) {
        changeType = "increased";
        impact = "favorable_to_member";
        factual = `Annual coverage limit increased by INR ${diff.toLocaleString()} (from INR ${baseline.coverageLimit.toLocaleString()} to INR ${target.coverageLimit.toLocaleString()}).`;
        explanation = "Higher aggregate insurance coverage available for eligible claims.";
      } else if (diff < 0) {
        changeType = "decreased";
        impact = "unfavorable_to_member";
        factual = `Annual coverage limit decreased by INR ${Math.abs(diff).toLocaleString()} (from INR ${baseline.coverageLimit.toLocaleString()} to INR ${target.coverageLimit.toLocaleString()}).`;
        explanation = "Lower aggregate insurance coverage available across the policy year.";
      }

      fieldDifferences.push({
        field: "coverageLimit",
        fieldLabel: "Annual Coverage Limit",
        baselineValue: baseline.coverageLimit,
        targetValue: target.coverageLimit,
        changeType,
        factualDifference: factual,
        financialImpact: impact,
        financialImpactExplanation: explanation,
      });
    } else {
      insufficientDataReasons.push("Coverage limit is missing from one or both policies.");
    }

    // 5. Premium (INR, optional field) — higher = unfavorable for member
    if (baseline.premium !== undefined && target.premium !== undefined) {
      const diff = target.premium - baseline.premium;
      let changeType: FieldChangeType = "unchanged";
      let impact: FinancialImpactDirection = "neutral";
      let factual = `Premium is unchanged at INR ${baseline.premium.toLocaleString()}.`;
      let explanation = "Cost to maintain policy remains the same.";

      if (diff > 0) {
        changeType = "increased";
        impact = "unfavorable_to_member";
        factual = `Premium increased by INR ${diff.toLocaleString()} (from INR ${baseline.premium.toLocaleString()} to INR ${target.premium.toLocaleString()}).`;
        explanation = "Higher recurring payment required to maintain coverage.";
      } else if (diff < 0) {
        changeType = "decreased";
        impact = "favorable_to_member";
        factual = `Premium decreased by INR ${Math.abs(diff).toLocaleString()} (from INR ${baseline.premium.toLocaleString()} to INR ${target.premium.toLocaleString()}).`;
        explanation = "Lower recurring payment required to maintain coverage.";
      }

      fieldDifferences.push({
        field: "premium",
        fieldLabel: "Policy Premium",
        baselineValue: baseline.premium,
        targetValue: target.premium,
        changeType,
        factualDifference: factual,
        financialImpact: impact,
        financialImpactExplanation: explanation,
      });
    } else {
      fieldDifferences.push({
        field: "premium",
        fieldLabel: "Policy Premium",
        baselineValue: baseline.premium ?? null,
        targetValue: target.premium ?? null,
        changeType: "not_specified",
        factualDifference: "Premium is not explicitly specified in one or both policy records.",
        financialImpact: "unknown",
        financialImpactExplanation: "Premium data unavailable; financial impact cannot be determined without rate schedule.",
      });
    }

    // 6. Sublimits
    const baselineSublimits = baseline.sublimits ?? [];
    const targetSublimits = target.sublimits ?? [];

    const baselineMap = new Map<string, number>(
      baselineSublimits.map((s) => [s.category.toLowerCase(), s.limitAmount])
    );
    const targetMap = new Map<string, number>(
      targetSublimits.map((s) => [s.category.toLowerCase(), s.limitAmount])
    );

    const allCategories = Array.from(
      new Set([...baselineMap.keys(), ...targetMap.keys()])
    );

    for (const cat of allCategories) {
      const bLimit = baselineMap.get(cat) ?? null;
      const tLimit = targetMap.get(cat) ?? null;

      // Find original casing if possible
      const origItem =
        targetSublimits.find((s) => s.category.toLowerCase() === cat) ??
        baselineSublimits.find((s) => s.category.toLowerCase() === cat);
      const displayCategory = origItem?.category ?? cat;

      if (bLimit !== null && tLimit === null) {
        // Sublimit was removed -> category now uncapped up to policy limit -> favorable
        sublimitDifferences.push({
          category: displayCategory,
          baselineLimit: bLimit,
          targetLimit: null,
          changeType: "removed",
          factualDifference: `Sublimit of INR ${bLimit.toLocaleString()} removed for "${displayCategory}".`,
          financialImpact: "favorable_to_member",
        });
      } else if (bLimit === null && tLimit !== null) {
        // Sublimit was added -> category newly capped -> unfavorable
        sublimitDifferences.push({
          category: displayCategory,
          baselineLimit: null,
          targetLimit: tLimit,
          changeType: "added",
          factualDifference: `New sublimit of INR ${tLimit.toLocaleString()} added for "${displayCategory}".`,
          financialImpact: "unfavorable_to_member",
        });
      } else if (bLimit !== null && tLimit !== null) {
        const diff = tLimit - bLimit;
        if (diff > 0) {
          sublimitDifferences.push({
            category: displayCategory,
            baselineLimit: bLimit,
            targetLimit: tLimit,
            changeType: "increased",
            factualDifference: `Sublimit for "${displayCategory}" increased by INR ${diff.toLocaleString()} (from INR ${bLimit.toLocaleString()} to INR ${tLimit.toLocaleString()}).`,
            financialImpact: "favorable_to_member",
          });
        } else if (diff < 0) {
          sublimitDifferences.push({
            category: displayCategory,
            baselineLimit: bLimit,
            targetLimit: tLimit,
            changeType: "decreased",
            factualDifference: `Sublimit for "${displayCategory}" decreased by INR ${Math.abs(diff).toLocaleString()} (from INR ${bLimit.toLocaleString()} to INR ${tLimit.toLocaleString()}).`,
            financialImpact: "unfavorable_to_member",
          });
        } else {
          sublimitDifferences.push({
            category: displayCategory,
            baselineLimit: bLimit,
            targetLimit: tLimit,
            changeType: "unchanged",
            factualDifference: `Sublimit for "${displayCategory}" unchanged at INR ${bLimit.toLocaleString()}.`,
            financialImpact: "neutral",
          });
        }
      }
    }

    // 7. Exclusions
    const bExcl = (baseline.exclusions ?? []).map((e) => e.trim());
    const tExcl = (target.exclusions ?? []).map((e) => e.trim());

    const bExclLower = bExcl.map((e) => e.toLowerCase());
    const tExclLower = tExcl.map((e) => e.toLowerCase());

    const addedExcl = tExcl.filter((e) => !bExclLower.includes(e.toLowerCase()));
    const removedExcl = bExcl.filter((e) => !tExclLower.includes(e.toLowerCase()));
    const retainedExcl = tExcl.filter((e) => bExclLower.includes(e.toLowerCase()));

    let exclImpact: FinancialImpactDirection = "neutral";
    if (addedExcl.length > 0 && removedExcl.length === 0) {
      exclImpact = "unfavorable_to_member";
    } else if (removedExcl.length > 0 && addedExcl.length === 0) {
      exclImpact = "favorable_to_member";
    } else if (addedExcl.length > 0 && removedExcl.length > 0) {
      exclImpact = "unknown"; // Some added and some removed
    }

    const exclSummaryParts: string[] = [];
    if (addedExcl.length > 0) exclSummaryParts.push(`Added ${addedExcl.length} exclusion(s): [${addedExcl.join(", ")}]`);
    if (removedExcl.length > 0) exclSummaryParts.push(`Removed ${removedExcl.length} exclusion(s): [${removedExcl.join(", ")}]`);
    if (exclSummaryParts.length === 0) exclSummaryParts.push("Exclusion list is identical.");

    exclusionDifferences = {
      field: "exclusions",
      fieldLabel: "Policy Exclusions",
      added: addedExcl,
      removed: removedExcl,
      retained: retainedExcl,
      factualDifference: exclSummaryParts.join("; "),
      financialImpact: exclImpact,
    };

    // 8. Required Documents
    const bDocs = (baseline.requiredDocuments ?? []).map((d) => d.trim());
    const tDocs = (target.requiredDocuments ?? []).map((d) => d.trim());

    const bDocsLower = bDocs.map((d) => d.toLowerCase());
    const tDocsLower = tDocs.map((d) => d.toLowerCase());

    const addedDocs = tDocs.filter((d) => !bDocsLower.includes(d.toLowerCase()));
    const removedDocs = bDocs.filter((d) => !tDocsLower.includes(d.toLowerCase()));
    const retainedDocs = tDocs.filter((d) => bDocsLower.includes(d.toLowerCase()));

    let docsImpact: FinancialImpactDirection = "neutral";
    if (addedDocs.length > 0 && removedDocs.length === 0) {
      docsImpact = "unfavorable_to_member"; // Higher compliance burden
    } else if (removedDocs.length > 0 && addedDocs.length === 0) {
      docsImpact = "favorable_to_member"; // Lower compliance burden
    } else if (addedDocs.length > 0 && removedDocs.length > 0) {
      docsImpact = "unknown";
    }

    const docSummaryParts: string[] = [];
    if (addedDocs.length > 0) docSummaryParts.push(`Added ${addedDocs.length} required document(s): [${addedDocs.join(", ")}]`);
    if (removedDocs.length > 0) docSummaryParts.push(`Removed ${removedDocs.length} required document(s): [${removedDocs.join(", ")}]`);
    if (docSummaryParts.length === 0) docSummaryParts.push("Required document checklist is identical.");

    requiredDocumentDifferences = {
      field: "requiredDocuments",
      fieldLabel: "Mandatory Claim Documents",
      added: addedDocs,
      removed: removedDocs,
      retained: retainedDocs,
      factualDifference: docSummaryParts.join("; "),
      financialImpact: docsImpact,
    };
  }

  const baselineDates = baselineSummary.isDateKnown
    ? `${baselineSummary.effectiveDate} to ${baselineSummary.expiryDate}`
    : "effective dates unknown";
  const targetDates = targetSummary.isDateKnown
    ? `${targetSummary.effectiveDate} to ${targetSummary.expiryDate}`
    : "effective dates unknown";

  const applicabilityNotice =
    `This policy radar comparison reflects structural differences between policy terms. ` +
    `These changes do NOT automatically apply to a claimant unless their verified admission ` +
    `or service date falls within the respective policy's active effective window ` +
    `(Baseline ${baselineSummary.policyId} [v${baselineSummary.version}]: ${baselineDates}; Target ${targetSummary.policyId} [v${targetSummary.version}]: ${targetDates}). ` +
    `Policy revisions do not apply retroactively to already-admitted claims without authorized insurer endorsement.`;

  return {
    comparisonId,
    comparedAt,
    baselinePolicy: baselineSummary,
    targetPolicy: targetSummary,
    isComparable,
    insufficientDataReasons,
    fieldDifferences,
    sublimitDifferences,
    exclusionDifferences,
    requiredDocumentDifferences,
    applicabilityNotice,
    disclaimer: "INFORMATIONAL_ONLY_NOT_A_GUARANTEE_OF_COVERAGE",
  };
}
