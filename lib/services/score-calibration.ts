import type { ImpactScore } from "./impact-scoring";
import { numericScoreToCategory } from "./impact-scoring";

/**
 * Bounded adjustment of closed-loop multipliers so DB/cache anomalies cannot
 * swing scores wildly.
 */
const ADAPTIVE_MULTIPLIER_SAFE_MIN = 0.85;
const ADAPTIVE_MULTIPLIER_SAFE_MAX = 1.15;

/** Typical upper bound for raw relevance scores from keyword heuristics (~PDF+URL stacking). */
const RELEVANCE_NORMALIZATION_CAP = 55;

export type ImpactCalibrationStep =
  | "adaptive_feedback"
  | "classification_dampening"
  | "source_reliability";

export interface CalibratedImpactScore extends ImpactScore {
  /** Pure heuristic score before calibration (same factor breakdown as `factors`). */
  heuristicNumericScore: number;
  /** True when any non-identity calibration step changed the numeric score. */
  calibrationApplied: boolean;
  calibrationSteps: ImpactCalibrationStep[];
}

export interface RelevanceCalibrationOptions {
  /**
   * Optional org/regulator multiplier (future closed-loop relevance).
   * Must be finite; invalid values fall back to identity.
   */
  relevanceMultiplier?: number;
}

export interface CalibratedRelevanceScore {
  heuristicScore: number;
  /** Use for ordering; monotonic in heuristic when multiplier is 1. */
  sortScore: number;
  /** 0–1 display-friendly intensity. */
  normalizedScore: number;
  calibrationApplied: boolean;
}

function clampAdaptiveMultiplier(multiplier: number): number {
  if (!Number.isFinite(multiplier)) return 1;
  return Math.min(
    ADAPTIVE_MULTIPLIER_SAFE_MAX,
    Math.max(ADAPTIVE_MULTIPLIER_SAFE_MIN, multiplier),
  );
}

/**
 * Applies adaptive feedback and optional classification-confidence dampening on
 * top of heuristic impact scoring. On invalid inputs, returns heuristic unchanged
 * (safe fallback).
 */
export function applyImpactCalibration(params: {
  heuristicImpact: ImpactScore;
  adaptiveMultiplier: number;
  /** When true, adaptive blend had no usable signal (multiplier is 1). */
  adaptiveUsedFullFallback: boolean;
  classificationConfidence?: number;
  /**
   * 0–1 crawl/source reliability composite. When set, scales impact slightly
   * down for flaky sources (alert confidence coupling).
   */
  sourceReliabilityComposite?: number;
}): CalibratedImpactScore {
  const {
    heuristicImpact,
    adaptiveMultiplier,
    adaptiveUsedFullFallback,
    classificationConfidence,
    sourceReliabilityComposite,
  } = params;

  const h = heuristicImpact;
  const hNum = Number.isFinite(h.numericScore) ? h.numericScore : 0;
  const steps: ImpactCalibrationStep[] = [];

  let calibrated = hNum;
  const m = clampAdaptiveMultiplier(adaptiveMultiplier);
  if (!adaptiveUsedFullFallback && m !== 1) {
    calibrated *= m;
    steps.push("adaptive_feedback");
  }

  const clsConf = classificationConfidence;
  if (
    clsConf != null &&
    Number.isFinite(clsConf) &&
    clsConf < 0.65 &&
    clsConf >= 0
  ) {
    const anchor = 0.42;
    const w = Math.min(1, Math.max(0, clsConf / 0.65));
    calibrated = w * calibrated + (1 - w) * anchor;
    steps.push("classification_dampening");
  }

  const srcRel = sourceReliabilityComposite;
  if (srcRel != null && Number.isFinite(srcRel) && srcRel >= 0 && srcRel <= 1) {
    const factor = 0.88 + 0.12 * srcRel;
    calibrated *= factor;
    steps.push("source_reliability");
  }

  calibrated = Math.min(1, Math.max(0, calibrated));
  const category = numericScoreToCategory(calibrated);

  const extraReason: string[] = [];
  if (steps.includes("adaptive_feedback")) {
    extraReason.push(`Calibration: feedback/lifecycle factor ${m.toFixed(2)}.`);
  }
  if (steps.includes("classification_dampening") && clsConf != null) {
    extraReason.push(
      `Calibration: dampened for classification confidence ${clsConf.toFixed(2)}.`,
    );
  }
  if (steps.includes("source_reliability") && srcRel != null) {
    extraReason.push(
      `Calibration: source reliability ${srcRel.toFixed(2)} applied to impact.`,
    );
  }

  const reasoning = [h.reasoning, ...extraReason].filter(Boolean).join(" ");

  return {
    ...h,
    numericScore: Math.round(calibrated * 100) / 100,
    category,
    reasoning,
    heuristicNumericScore: Math.round(hNum * 100) / 100,
    calibrationApplied: steps.length > 0,
    calibrationSteps: steps,
  };
}

/**
 * Wraps heuristic relevance scoring with optional multipliers and normalization.
 * Invalid optional inputs are ignored (identity fallback).
 */
export function applyRelevanceCalibration(
  heuristicScore: number,
  options?: RelevanceCalibrationOptions,
): CalibratedRelevanceScore {
  const raw = Number.isFinite(heuristicScore) ? heuristicScore : 0;
  let sortScore = raw;
  let calibrationApplied = false;

  const mult = options?.relevanceMultiplier;
  if (mult != null && Number.isFinite(mult)) {
    const m = Math.min(1.25, Math.max(0.75, mult));
    sortScore = raw * m;
    calibrationApplied = true;
  }

  const normalizedScore = Math.min(
    1,
    Math.max(0, sortScore / RELEVANCE_NORMALIZATION_CAP),
  );

  return {
    heuristicScore: raw,
    sortScore,
    normalizedScore: Math.round(normalizedScore * 1000) / 1000,
    calibrationApplied,
  };
}
