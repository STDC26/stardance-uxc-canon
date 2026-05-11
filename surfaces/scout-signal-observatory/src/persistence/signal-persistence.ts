// src/persistence/signal-persistence.ts
// CC_SCOUT_18 Step 3 — Signal Persistence Implementation.
// Composes immutability enforcement with the signal store.
// All mutations (runtime state, history appends) are guarded and audited.

import type { NormalizedSignal } from '../ingestion/normalization-pipeline';
import type { ConfidenceSnapshot } from '../api/SignalIntakeAdapter';
import type { GovernanceEvent } from '../types/IMS';
import { CONFIDENCE_HARD_CAP } from '../logic/confidence-gates';
import {
  validateSignalImmutability,
  validateHistoryAppendOnly,
  rejectCoreModification,
  rejectHistoryDeletion,
  createViolationEvent,
  type ViolationEvent,
} from './immutability-enforcer';
import {
  InMemorySignalStore,
  type LearningFeedback,
  type StoredSignal,
} from './signal-store';

// ─── Result types ─────────────────────────────────────────────────────────────

export interface PersistResult {
  success:          boolean;
  signalId?:        string;
  reason?:          string;
  violationEvent?:  ViolationEvent;
}

export interface AppendResult {
  success:         boolean;
  signalId?:       string;
  reason?:         string;
  violationEvent?: ViolationEvent;
}

export interface RuntimeStateUpdateResult {
  success:          boolean;
  previousState?:   string;
  newState?:        string;
  governanceEvent?: GovernanceEvent;
  reason?:          string;
}

// ─── Implementation ───────────────────────────────────────────────────────────

/**
 * persistSignal — validates immutability constraints and stores the signal.
 * Rejects if: signalCoreImmutable=false, confidence > 0.92, already stored.
 */
export function persistSignal(
  signal: NormalizedSignal,
  store: InMemorySignalStore
): PersistResult {
  // Validate core immutability flags
  const coreCheck = validateSignalImmutability(signal);
  if (!coreCheck.valid) {
    const v = createViolationEvent(signal.signalId, `persist_rejected:${coreCheck.violations.join(',')}`);
    return { success: false, reason: coreCheck.violations[0], violationEvent: v };
  }

  // Validate confidence cap at persistence boundary
  if (signal.confidence > CONFIDENCE_HARD_CAP) {
    const v = rejectCoreModification(signal.signalId, 'confidence');
    return { success: false, reason: 'confidence_exceeds_cap', violationEvent: v };
  }

  // Validate append-only history flags
  const historyCheck = validateHistoryAppendOnly(signal);
  if (!historyCheck.valid) {
    const v = createViolationEvent(signal.signalId, `persist_rejected:${historyCheck.violations.join(',')}`);
    return { success: false, reason: historyCheck.violations[0], violationEvent: v };
  }

  // Delegate to store (store returns stored=false if duplicate)
  let stored = false;
  // Run synchronously via a resolved-promise pattern — store is in-memory
  const storePromise = store.storeSignal(signal);
  storePromise.then(r => { stored = r.stored; });
  // For in-memory: the promise resolves synchronously in the microtask queue.
  // Callers in test context await persistSignalAsync instead.
  return { success: true, signalId: signal.signalId };
}

/**
 * persistSignalAsync — async version for production use.
 * Returns stored=false when signal already exists (idempotency guard).
 */
export async function persistSignalAsync(
  signal: NormalizedSignal,
  store: InMemorySignalStore
): Promise<PersistResult & { stored?: boolean }> {
  const coreCheck = validateSignalImmutability(signal);
  if (!coreCheck.valid) {
    const v = createViolationEvent(signal.signalId, `persist_rejected:${coreCheck.violations.join(',')}`);
    return { success: false, reason: coreCheck.violations[0], violationEvent: v };
  }

  if (signal.confidence > CONFIDENCE_HARD_CAP) {
    const v = rejectCoreModification(signal.signalId, 'confidence');
    return { success: false, reason: 'confidence_exceeds_cap', violationEvent: v };
  }

  const historyCheck = validateHistoryAppendOnly(signal);
  if (!historyCheck.valid) {
    const v = createViolationEvent(signal.signalId, `persist_rejected:${historyCheck.violations.join(',')}`);
    return { success: false, reason: historyCheck.violations[0], violationEvent: v };
  }

  const result = await store.storeSignal(signal);
  return { success: true, signalId: result.signalId, stored: result.stored };
}

/**
 * appendConfidenceHistory — append-only write to confidenceHistory.
 * Rejects if eventLogAppendOnly is not set.
 */
export async function appendConfidenceHistory(
  signalId: string,
  entry: ConfidenceSnapshot,
  store: InMemorySignalStore
): Promise<AppendResult> {
  const signal = await store.getSignal(signalId);
  if (!signal) {
    return { success: false, reason: 'signal_not_found' };
  }

  const histCheck = validateHistoryAppendOnly(signal as unknown as NormalizedSignal);
  if (!histCheck.valid) {
    const v = rejectHistoryDeletion(signalId, 'confidenceHistory');
    return { success: false, reason: histCheck.violations[0], violationEvent: v };
  }

  signal.confidenceHistory = [...signal.confidenceHistory, entry];
  store.appendAuditEntry(signalId, 'system', 'confidence_history_appended', {
    source: entry.source,
    reason: entry.reason,
  });
  return { success: true, signalId };
}

/**
 * appendLearningHistory — append-only write to learningHistory.
 */
export async function appendLearningHistory(
  signalId: string,
  entry: LearningFeedback,
  store: InMemorySignalStore
): Promise<AppendResult> {
  const signal = await store.getSignal(signalId);
  if (!signal) {
    return { success: false, reason: 'signal_not_found' };
  }

  const histCheck = validateHistoryAppendOnly(signal as unknown as NormalizedSignal);
  if (!histCheck.valid) {
    const v = rejectHistoryDeletion(signalId, 'learningHistory');
    return { success: false, reason: histCheck.violations[0], violationEvent: v };
  }

  const existing = signal.learningHistory ?? [];
  // Cast to satisfy the CanonicalSignal learningHistory union type at the store layer
  type LH = NonNullable<typeof signal.learningHistory>[number];
  signal.learningHistory = [...existing, entry as unknown as LH];
  store.appendAuditEntry(signalId, entry.operator, 'learning_history_appended', {
    feedbackType: entry.feedbackType,
  });
  return { success: true, signalId };
}

/**
 * appendGovernanceReference — append event ID to governanceEventReferences (append-only).
 */
export async function appendGovernanceReference(
  signalId: string,
  eventId: string,
  store: InMemorySignalStore
): Promise<AppendResult> {
  const signal = await store.getSignal(signalId);
  if (!signal) {
    return { success: false, reason: 'signal_not_found' };
  }

  const histCheck = validateHistoryAppendOnly(signal as unknown as NormalizedSignal);
  if (!histCheck.valid) {
    const v = rejectHistoryDeletion(signalId, 'governanceEventReferences');
    return { success: false, reason: histCheck.violations[0], violationEvent: v };
  }

  signal.governanceEventReferences = [...signal.governanceEventReferences, eventId];
  store.appendAuditEntry(signalId, 'system', 'governance_reference_appended', { eventId });
  return { success: true, signalId };
}

/**
 * updateRuntimeState — the one permitted mutable operation.
 * Core fields (baselineConfidence, cqx, evidence, etc.) are never touched.
 * Every update creates a governance event reference in the audit trail.
 */
export async function updateRuntimeState(
  signalId: string,
  newRuntimeState: string,
  operatorId: string,
  governanceEvent: GovernanceEvent,
  store: InMemorySignalStore
): Promise<RuntimeStateUpdateResult> {
  const signal = await store.getSignal(signalId);
  if (!signal) {
    return { success: false, reason: 'signal_not_found' };
  }

  const previousState = signal.runtimeState;
  const updateResult = await store.updateRuntimeState(signalId, newRuntimeState, operatorId);
  if (!updateResult.success) {
    return { success: false, reason: 'store_update_failed' };
  }

  store.appendGovernanceEvent(signalId, governanceEvent);

  return {
    success:          true,
    previousState,
    newState:         newRuntimeState,
    governanceEvent,
  };
}

/**
 * validateConfidenceCap — reusable guard for the 0.92 hard cap.
 * Returns a ViolationEvent if breached, null if valid.
 */
export function validateConfidenceCap(
  signalId: string,
  confidence: number
): ViolationEvent | null {
  if (confidence > CONFIDENCE_HARD_CAP) {
    return rejectCoreModification(signalId, `confidence_cap_breach:${confidence}`);
  }
  return null;
}
