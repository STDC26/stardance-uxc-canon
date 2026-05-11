// src/ingestion/confidence-handler.ts
// CC_SCOUT_17 Step 4 — Confidence cap enforcement and baseline locking.
// Rule: confidence MUST NOT exceed 0.92. baselineConfidence is locked at this point.

import { CONFIDENCE_HARD_CAP } from '../logic/confidence-gates';
import type { ConfidenceSnapshot } from '../api/SignalIntakeAdapter';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfidenceCapInput {
  confidence: number;
  confidenceHistory: ConfidenceSnapshot[];
  [key: string]: unknown;
}

export interface ConfidenceCapResult {
  confidence: number;
  baselineConfidence: number;
  confidenceHistory: ConfidenceSnapshot[];
  capApplied: boolean;
}

// ─── Implementation ───────────────────────────────────────────────────────────

/**
 * capConfidence — enforce 0.92 hard cap, lock baselineConfidence, append history entry.
 * Called once during normalization. baselineConfidence is immutable after this step.
 */
export function capConfidence(input: ConfidenceCapInput): ConfidenceCapResult {
  const raw = input.confidence;
  const capped = Math.min(raw, CONFIDENCE_HARD_CAP);
  const capApplied = raw > CONFIDENCE_HARD_CAP;
  const now = new Date().toISOString();

  const historyEntry: ConfidenceSnapshot = {
    confidence: capped,
    timestamp: now,
    source: 'ingestion',
    reason: capApplied ? 'capped_at_0.92' : 'baseline_locked_at_ingestion',
  };

  return {
    confidence: capped,
    baselineConfidence: capped,       // locked — never mutated after this step
    confidenceHistory: [...input.confidenceHistory, historyEntry],
    capApplied,
  };
}
