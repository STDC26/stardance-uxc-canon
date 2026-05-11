// src/ingestion/cqx-generator.ts
// CC_SCOUT_17 Step 3 — Transform enriched signal fields into canonical CQX object.
// CQX order is locked: Context → Outcome → Meaning → Strength & Risk → Action.

import { CONFIDENCE_THRESHOLDS } from '../logic/confidence-gates';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CQXCanonical {
  context: string;
  outcome: string;
  meaning: string;
  strengthAndRisk: {
    confidence: number;
    riskAssessment: string;
  };
  action: string;
}

export interface CQXInput {
  context: string;
  whatIsHappening: string;
  whatItMeans: string;
  confidence: number;
  ethicsGates?: Partial<{ safety: unknown; delight: unknown; harmony: unknown }>;
}

// ─── Risk assessment generation ───────────────────────────────────────────────

function deriveRiskAssessment(confidence: number): string {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return 'HIGH — Immediate operator attention required';
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return 'MEDIUM — Monitor closely, consider investigation';
  }
  return 'LOW — Continue monitoring, collect more evidence';
}

function deriveActionOptions(confidence: number, ethicsAllPass: boolean): string {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH && ethicsAllPass) {
    return 'Escalate | Investigate | Suppress | Mark As Learning';
  }
  return 'Investigate | Trigger Research | Mark As Learning';
}

// ─── Implementation ───────────────────────────────────────────────────────────

/**
 * transformToCQX — produces canonical CQX object from enriched signal fields.
 * Preserves locked RC-02 order: Context → Outcome → Meaning → Strength & Risk → Action.
 */
export function transformToCQX(input: CQXInput): CQXCanonical {
  const ethicsAllPass =
    input.ethicsGates?.safety === true &&
    input.ethicsGates?.delight === true &&
    input.ethicsGates?.harmony === true;

  return {
    context:  input.context,
    outcome:  input.whatIsHappening,
    meaning:  input.whatItMeans,
    strengthAndRisk: {
      confidence:    input.confidence,
      riskAssessment: deriveRiskAssessment(input.confidence),
    },
    action: deriveActionOptions(input.confidence, ethicsAllPass),
  };
}
