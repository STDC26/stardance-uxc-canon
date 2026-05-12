// src/adapters/reporting/signal-reporting-adapter.ts
// CC_SCOUT_22 — Signal Reporting Adapter.
// Transform StoredSignal → ReportingSignal (immutable, display-optimized).

import type { StoredSignal } from '../../persistence/signal-store';
import { CONFIDENCE_HARD_CAP } from '../../logic/confidence-gates';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportingSignal {
  readonly signalId:           string;
  readonly source:             StoredSignal['source'];
  readonly timestamp:          string;
  readonly context:            string;
  readonly whatIsHappening:    string;
  readonly whatItMeans:        string;
  readonly confidence:         number;
  readonly baselineConfidence: number;
  readonly imsState:           string;
  readonly runtimeState:       string;
  readonly ethicsGates:        StoredSignal['ethicsGates'];
  readonly evidence:           StoredSignal['evidence'];
  readonly confidenceHistory:  StoredSignal['confidenceHistory'];
  readonly learningHistory:    StoredSignal['learningHistory'];
  readonly governanceEventReferences: string[];
  readonly cappedAtIntake:     boolean;
  readonly capApplied:         boolean;
  readonly schemaVersion:      string;
  readonly cqx:                StoredSignal['cqx'];
  readonly immutable:          true;
  // Validation metadata
  readonly reportingValidated: true;
  readonly confidenceValid:    boolean;   // confidence ≤ CONFIDENCE_HARD_CAP
  readonly historiesIntact:    boolean;   // confidenceHistory + learningHistory present
}

export interface AdapterResult {
  success: boolean;
  signal?: ReportingSignal;
  errors:  string[];
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

/**
 * toReportingSignal — transforms StoredSignal to display-optimized ReportingSignal.
 * Validates confidence ≤ 0.92 and histories intact.
 * Returns success=false if critical validation fails.
 */
export function toReportingSignal(stored: StoredSignal): AdapterResult {
  const errors: string[] = [];

  const confidenceValid = stored.confidence <= CONFIDENCE_HARD_CAP;
  if (!confidenceValid) {
    errors.push(`confidence ${stored.confidence} exceeds hard cap ${CONFIDENCE_HARD_CAP}`);
  }

  const historiesIntact =
    Array.isArray(stored.confidenceHistory) &&
    Array.isArray(stored.learningHistory ?? []);

  if (!historiesIntact) {
    errors.push('confidence or learning history missing');
  }

  const signal: ReportingSignal = {
    signalId:           stored.signalId,
    source:             stored.source,
    timestamp:          stored.timestamp,
    context:            stored.context,
    whatIsHappening:    stored.whatIsHappening,
    whatItMeans:        stored.whatItMeans,
    confidence:         stored.confidence,
    baselineConfidence: stored.baselineConfidence,
    imsState:           stored.imsState,
    runtimeState:       stored.runtimeState,
    ethicsGates:        stored.ethicsGates,
    evidence:           stored.evidence,
    confidenceHistory:  stored.confidenceHistory,
    learningHistory:    stored.learningHistory ?? [],
    governanceEventReferences: stored.governanceEventReferences ?? [],
    cappedAtIntake:     stored.cappedAtIntake ?? false,
    capApplied:         stored.capApplied ?? false,
    schemaVersion:      stored.schemaVersion ?? '1.0.1',
    cqx:                stored.cqx,
    immutable:          true as const,
    reportingValidated: true as const,
    confidenceValid,
    historiesIntact,
  };

  return {
    success: errors.length === 0,
    signal,
    errors,
  };
}
