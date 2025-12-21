import type { PlanType } from "@/lib/db/schema/organizations";
import type { DiffMetadata } from "./diff";
import type { RegulatoryCategory } from "./llm";

/**
 * Impact score category
 */
export type ImpactCategory = "low" | "medium" | "high";

/**
 * Impact scoring factors
 */
export interface ImpactScoringFactors {
  changeSeverity: "minor" | "major";
  regulatoryCategory: RegulatoryCategory;
  jurisdiction?: string;
  organizationPlan?: PlanType;
  hasFines?: boolean;
  hasDeadlines?: boolean;
  affectedSectionsCount?: number;
  similarityScore?: number; // 0-1, lower means more changes
}

/**
 * Impact scoring result
 */
export interface ImpactScore {
  numericScore: number; // 0-1 scale
  category: ImpactCategory;
  factors: {
    changeSeverity: number;
    categoryWeight: number;
    jurisdictionWeight: number;
    urgencyWeight: number;
    scopeWeight: number;
  };
  reasoning?: string;
}

/**
 * Category weights for impact scoring
 * Higher values mean the category is more critical
 */
const CATEGORY_WEIGHTS: Record<RegulatoryCategory, number> = {
  penalties: 1.0, // Highest impact - penalties and fines
  aml: 0.9, // Very high impact - AML regulations
  kyc: 0.85, // High impact - KYC requirements
  compliance: 0.8, // High impact - compliance obligations
  reporting: 0.75, // Medium-high impact - reporting requirements
  licensing: 0.7, // Medium-high impact - licensing changes
  regulations: 0.65, // Medium impact - general regulations
  fees: 0.6, // Medium impact - fee changes
  other: 0.5, // Lower impact - other content
};

/**
 * Jurisdiction weights (can be expanded based on organization's jurisdiction focus)
 */
const JURISDICTION_WEIGHTS: Record<string, number> = {
  // High-impact jurisdictions (add more as needed)
  "United States": 0.9,
  US: 0.9,
  UK: 0.85,
  "United Kingdom": 0.85,
  EU: 0.85,
  "European Union": 0.85,
  // Default weight for other jurisdictions
  default: 0.7,
};

/**
 * Plan-based multipliers (higher plans might be more sensitive to certain changes)
 */
const PLAN_MULTIPLIERS: Record<PlanType, number> = {
  enterprise: 1.1, // Enterprise customers might have higher stakes
  growth: 1.0, // Standard multiplier
  starter: 0.95, // Slightly lower sensitivity
  free: 0.9, // Lower sensitivity for free tier
};

/**
 * Calculate impact score based on various factors
 */
export function calculateImpactScore(
  factors: ImpactScoringFactors,
): ImpactScore {
  const {
    changeSeverity,
    regulatoryCategory,
    jurisdiction,
    organizationPlan = "free",
    hasFines = false,
    hasDeadlines = false,
    affectedSectionsCount = 0,
    similarityScore = 0.5,
  } = factors;

  // 1. Change severity component (0-0.4 range)
  const severityScore = changeSeverity === "major" ? 0.4 : 0.15;
  const changeSeverityFactor = severityScore;

  // 2. Category weight component (0-0.3 range)
  const categoryWeight = CATEGORY_WEIGHTS[regulatoryCategory] ?? 0.5;
  const categoryFactor = categoryWeight * 0.3;

  // 3. Jurisdiction weight component (0-0.15 range)
  let jurisdictionFactor = 0.075; // Default
  if (jurisdiction) {
    const jurisdictionWeight =
      JURISDICTION_WEIGHTS[jurisdiction] ??
      JURISDICTION_WEIGHTS[jurisdiction.toLowerCase()] ??
      JURISDICTION_WEIGHTS.default;
    jurisdictionFactor = jurisdictionWeight * 0.15;
  }

  // 4. Urgency indicators component (0-0.15 range)
  let urgencyFactor = 0.0;
  if (hasFines) {
    urgencyFactor += 0.08; // Fines indicate high urgency
  }
  if (hasDeadlines) {
    urgencyFactor += 0.07; // Deadlines indicate time sensitivity
  }

  // 5. Scope/scale component (0-0.1 range, based on similarity and affected sections)
  // Lower similarity = more changes = higher impact
  const changeMagnitude = 1 - (similarityScore ?? 0.5);
  const sectionsFactor = Math.min(affectedSectionsCount / 10, 1) * 0.05; // Normalize to max 0.05
  const scopeFactor = changeMagnitude * 0.05 + sectionsFactor;

  // Calculate base numeric score (0-1)
  const baseScore =
    changeSeverityFactor +
    categoryFactor +
    jurisdictionFactor +
    urgencyFactor +
    scopeFactor;

  // Apply plan multiplier
  const planMultiplier = PLAN_MULTIPLIERS[organizationPlan] ?? 1.0;
  let numericScore = Math.min(baseScore * planMultiplier, 1.0);

  // Ensure minimum score if there are urgency indicators
  if ((hasFines || hasDeadlines) && numericScore < 0.3) {
    numericScore = Math.max(numericScore, 0.3);
  }

  // Determine category
  let category: ImpactCategory;
  if (numericScore >= 0.7) {
    category = "high";
  } else if (numericScore >= 0.4) {
    category = "medium";
  } else {
    category = "low";
  }

  // Generate reasoning
  const reasoning = generateReasoning({
    numericScore,
    category,
    changeSeverity,
    regulatoryCategory,
    hasFines,
    hasDeadlines,
  });

  return {
    numericScore: Math.round(numericScore * 100) / 100, // Round to 2 decimal places
    category,
    factors: {
      changeSeverity: changeSeverityFactor,
      categoryWeight: categoryFactor,
      jurisdictionWeight: jurisdictionFactor,
      urgencyWeight: urgencyFactor,
      scopeWeight: scopeFactor,
    },
    reasoning,
  };
}

/**
 * Calculate impact score from diff metadata and context
 */
export function calculateImpactScoreFromDiff(params: {
  diffMetadata: DiffMetadata;
  regulatoryCategory: RegulatoryCategory;
  jurisdiction?: string;
  organizationPlan?: PlanType;
  entities?: {
    fines?: Array<{ amount: string; currency?: string }>;
    deadlines?: string[];
  };
}): ImpactScore {
  const {
    diffMetadata,
    regulatoryCategory,
    jurisdiction,
    organizationPlan,
    entities,
  } = params;

  // Determine change severity
  const changeSeverity: "minor" | "major" =
    determineChangeSeverity(diffMetadata);

  // Count affected sections
  const affectedSectionsCount = diffMetadata.affectedSections?.length ?? 0;

  // Check for urgency indicators
  const hasFines = (entities?.fines?.length ?? 0) > 0;
  const hasDeadlines = (entities?.deadlines?.length ?? 0) > 0;

  return calculateImpactScore({
    changeSeverity,
    regulatoryCategory,
    jurisdiction,
    organizationPlan,
    hasFines,
    hasDeadlines,
    affectedSectionsCount,
    similarityScore: diffMetadata.similarityScore,
  });
}

/**
 * Determine change severity from diff metadata
 */
function determineChangeSeverity(
  diffMetadata: DiffMetadata,
): "minor" | "major" {
  // Major changes indicators:
  // - Multiple structural changes
  // - Removals (especially of sections)
  // - Low similarity score
  // - Large content size changes
  // - Attachment changes

  const hasRemovals = diffMetadata.changeTypes?.includes("removed") ?? false;
  const hasStructuralChanges = diffMetadata.structuralChanges?.length ?? 0 > 5;
  const hasAttachmentChanges =
    diffMetadata.changeTypes?.some((t) => t.startsWith("attachment_")) ?? false;
  const lowSimilarity = (diffMetadata.similarityScore ?? 1.0) < 0.5;
  const largeSizeChange = Math.abs(diffMetadata.contentSizeChange ?? 0) > 10000; // More than 10KB change

  if (
    hasRemovals ||
    hasAttachmentChanges ||
    (lowSimilarity && hasStructuralChanges) ||
    largeSizeChange
  ) {
    return "major";
  }

  return "minor";
}

/**
 * Generate human-readable reasoning for the impact score
 */
function generateReasoning(params: {
  numericScore: number;
  category: ImpactCategory;
  changeSeverity: "minor" | "major";
  regulatoryCategory: RegulatoryCategory;
  hasFines: boolean;
  hasDeadlines: boolean;
}): string {
  const {
    numericScore,
    category,
    changeSeverity,
    regulatoryCategory,
    hasFines,
    hasDeadlines,
  } = params;

  const reasons: string[] = [];

  reasons.push(
    `This is a ${changeSeverity} change in ${regulatoryCategory} content.`,
  );

  if (hasFines) {
    reasons.push("The content mentions fines or penalties.");
  }

  if (hasDeadlines) {
    reasons.push("The content contains important deadlines.");
  }

  reasons.push(`Impact score: ${numericScore.toFixed(2)} (${category}).`);

  return reasons.join(" ");
}

/**
 * Convert numeric score to category
 */
export function numericScoreToCategory(numericScore: number): ImpactCategory {
  if (numericScore >= 0.7) {
    return "high";
  }
  if (numericScore >= 0.4) {
    return "medium";
  }
  return "low";
}

/**
 * Convert category to numeric score range
 */
export function categoryToNumericRange(
  category: ImpactCategory,
): [number, number] {
  switch (category) {
    case "high":
      return [0.7, 1.0];
    case "medium":
      return [0.4, 0.7];
    case "low":
      return [0.0, 0.4];
    default:
      return [0.0, 0.4];
  }
}
