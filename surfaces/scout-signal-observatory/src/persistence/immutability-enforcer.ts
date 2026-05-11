// src/persistence/immutability-enforcer.ts
// CC_SCOUT_18 Step 2 — Immutability Enforcement Layer.
// Enforces signalCoreImmutable and eventLogAppendOnly constraints.
// Any violation produces a ViolationEvent and the operation is rejected.

import type { NormalizedSignal } from '../ingestion/normalization-pipeline';
import { CONFIDENCE_HARD_CAP } from '../logic/confidence-gates';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ViolationEvent {
  violationId:  string;
  signalId:     string;
  reason:       string;
  field?:       string;
  historyType?: string;
  timestamp:    string;
  immutable:    true;
}

export interface ImmutabilityCheckResult {
  valid:      boolean;
  violations: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const IMMUTABLE_CORE_FIELDS: ReadonlyArray<keyof NormalizedSignal> = [
  'schemaVersion',
  'signalId',
  'source',
  'timestamp',
  'cqx',
  'baselineConfidence',
  'imsState',
  'ethicsGates',
  'evidence',
  'signalCoreImmutable',
];

export const APPEND_ONLY_HISTORY_FIELDS: ReadonlyArray<string> = [
  'confidenceHistory',
  'learningHistory',
  'governanceEventReferences',
];

// ─── Implementation ───────────────────────────────────────────────────────────

/**
 * validateSignalImmutability — confirm the signal's core lock flags are set.
 * Called before any write to reject signals that lost their immutability markers.
 */
export function validateSignalImmutability(signal: NormalizedSignal): ImmutabilityCheckResult {
  const violations: string[] = [];

  if (signal.signalCoreImmutable !== true) {
    violations.push('signalCoreImmutable_not_set');
  }
  if (signal.immutable !== true) {
    violations.push('immutable_not_set');
  }
  if (typeof signal.signalId !== 'string' || signal.signalId.trim() === '') {
    violations.push('signalId_missing');
  }
  if (typeof signal.baselineConfidence !== 'number') {
    violations.push('baselineConfidence_missing');
  }
  if (
    typeof signal.confidence === 'number' &&
    signal.confidence > CONFIDENCE_HARD_CAP
  ) {
    violations.push(`confidence_exceeds_cap_${CONFIDENCE_HARD_CAP}`);
  }

  return { valid: violations.length === 0, violations };
}

/**
 * validateHistoryAppendOnly — confirm the signal's append-only flag is set.
 * Called before any history write to reject signals that lost the flag.
 */
export function validateHistoryAppendOnly(signal: NormalizedSignal): ImmutabilityCheckResult {
  const violations: string[] = [];

  if (signal.eventLogAppendOnly !== true) {
    violations.push('eventLogAppendOnly_not_set');
  }
  if (!Array.isArray(signal.confidenceHistory)) {
    violations.push('confidenceHistory_not_array');
  }
  if (!Array.isArray(signal.governanceEventReferences)) {
    violations.push('governanceEventReferences_not_array');
  }

  return { valid: violations.length === 0, violations };
}

/**
 * rejectCoreModification — produce a ViolationEvent when a write to a core
 * field is attempted. The caller must NOT proceed with the write.
 */
export function rejectCoreModification(signalId: string, field: string): ViolationEvent {
  return createViolationEvent(signalId, `core_field_modification_rejected:${field}`, { field });
}

/**
 * rejectHistoryDeletion — produce a ViolationEvent when a deletion from an
 * append-only history is attempted.
 */
export function rejectHistoryDeletion(signalId: string, historyType: string): ViolationEvent {
  return createViolationEvent(signalId, `history_deletion_rejected:${historyType}`, { historyType });
}

/**
 * createViolationEvent — log an immutability breach.
 * Always returns an immutable, timestamped record.
 */
export function createViolationEvent(
  signalId: string,
  reason: string,
  extras?: { field?: string; historyType?: string }
): ViolationEvent {
  return {
    violationId:  `viol-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    signalId,
    reason,
    field:        extras?.field,
    historyType:  extras?.historyType,
    timestamp:    new Date().toISOString(),
    immutable:    true as const,
  };
}
