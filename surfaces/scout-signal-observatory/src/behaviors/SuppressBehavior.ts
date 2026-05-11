// src/behaviors/SuppressBehavior.ts
// CC_SCOUT_09: Suppress operator action
// Source: PHASE_5_6_IBC_SECTION_1_FOUNDATION.md (Behavior 3)
//         PHASE_5_6_OPERATOR_ACTION_RUNTIME_SCHEMA.json (suppress)
//         PHASE_5_6_GOVERNANCE_RUNTIME_RULES.md (Section 2: No Hidden Mutations)

import { Signal, GovernanceEvent } from '../types/IMS';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SuppressionRationale =
  | 'known_false_positive'
  | 'testing_signal'
  | 'expected_behavior'
  | 'other';

export type SuppressionDuration = '24_hours' | '7_days' | '30_days' | 'custom';

export const SUPPRESSION_DURATIONS_MS: Record<Exclude<SuppressionDuration, 'custom'>, number> = {
  '24_hours': 86_400_000,
  '7_days':  604_800_000,
  '30_days': 2_592_000_000,
};

export interface SuppressionMemoryEntry {
  suppressionId: string;
  signalId: string;
  signalPattern?: string;
  originalConfidence: number;   // IMMUTABLE — never mutated
  suppressionRationale: string;
  rationaleCategory: SuppressionRationale;
  falsePositiveWeight: number;   // 0.3 per spec
  suppressionStart: number;
  suppressionExpiration: number;
  operatorId: string;
  revocable: true;
  revoked: boolean;
  revokedAt?: number;
  revokedBy?: string;
  revokedReason?: string;
}

export interface SuppressionResult {
  allowed: boolean;
  reason: string;
  suppressionEntry?: SuppressionMemoryEntry;
  governanceEvent?: GovernanceEvent;
  operatorFeedback?: string;
  newState?: 'suppressed_with_memory';
}

// In-memory suppression store
const _suppressionMemory: SuppressionMemoryEntry[] = [];
const _suppressionAuditLog: GovernanceEvent[] = [];

export function getSuppressionMemory(): ReadonlyArray<SuppressionMemoryEntry> {
  return _suppressionMemory;
}

export function getSuppressionAuditLog(): ReadonlyArray<GovernanceEvent> {
  return _suppressionAuditLog;
}

// ─── Pre-condition validators ────────────────────────────────────────────────

export function validateIMSStateForSuppression(imsState: Signal['imsState']): boolean {
  return imsState === 'complete' || imsState === 'partial_complete';
}

export function validateRationaleForSuppression(rationale: string): boolean {
  return typeof rationale === 'string' && rationale.trim().length > 0;
}

export function validateNotAlreadySuppressed(signal: Signal): boolean {
  return !signal.suppressedUntil || signal.suppressedUntil < Date.now();
}

// ─── Runtime implementation ──────────────────────────────────────────────────

export function suppress(
  signal: Signal,
  operatorId: string,
  rationaleText: string,
  rationaleCategory: SuppressionRationale = 'other',
  duration: SuppressionDuration = '24_hours',
  customDurationMs?: number
): SuppressionResult {
  // Fail-closed pre-condition checks
  const failedChecks: string[] = [];

  if (!validateIMSStateForSuppression(signal.imsState)) {
    failedChecks.push('ims_state_invalid');
  }
  if (!validateRationaleForSuppression(rationaleText)) {
    failedChecks.push('rationale_missing');
  }
  if (!validateNotAlreadySuppressed(signal)) {
    failedChecks.push('signal_already_suppressed');
  }

  if (failedChecks.length > 0) {
    return {
      allowed: false,
      reason: `suppress_blocked_by: ${failedChecks.join(', ')}`,
      operatorFeedback: `Suppression blocked: ${failedChecks.join(', ')}`,
    };
  }

  // Step 1: Rationale already provided (validated above)

  // Step 2: Create suppression memory entry (immutable — original confidence never mutated)
  const suppressionId = generateId('sup');
  const durationMs =
    duration === 'custom'
      ? (customDurationMs ?? SUPPRESSION_DURATIONS_MS['24_hours'])
      : SUPPRESSION_DURATIONS_MS[duration];

  const suppressionEntry: SuppressionMemoryEntry = {
    suppressionId,
    signalId: signal.id,
    signalPattern: signal.pattern,
    originalConfidence: signal.confidence, // IMMUTABLE — spec: never mutated
    suppressionRationale: rationaleText,
    rationaleCategory,
    falsePositiveWeight: 0.3,              // spec-mandated weight
    suppressionStart: Date.now(),
    suppressionExpiration: Date.now() + durationMs,
    operatorId,
    revocable: true,
    revoked: false,
  };

  // Step 3: Update false positive weighting — stored separately, original confidence unchanged

  // Step 4: Activate signal dampening — tracked via suppressionEntry (UI reads this)

  // Step 5: Expiration logic configured via suppressionExpiration field

  // Step 6: Persist suppression (immutable audit log)
  const governanceEvent: GovernanceEvent = {
    eventId: generateId('gov'),
    eventType: 'suppression_initiated',
    eventTimestamp: Date.now(),
    signalId: signal.id,
    signalConfidenceAtEvent: signal.confidence,
    signalMeaningAtEvent: signal.meaning,
    operatorId,
    actionDetails: {
      suppressionId,
      rationale: rationaleText,
      rationaleCategory,
      falsePositiveWeight: 0.3,
      duration,
      expiresAt: suppressionEntry.suppressionExpiration,
      originalConfidencePreserved: signal.confidence,
    },
    rationale: rationaleText,
    failClosedApplied: true,
    governanceGatesChecked: [
      'operator_rationale_captured',
      'original_confidence_never_mutated',
      'suppression_visible_not_hidden',
      'operator_can_revoke_suppression',
    ],
    immutable: true,
  };

  _suppressionMemory.push(suppressionEntry);
  _suppressionAuditLog.push(governanceEvent);

  // Step 7: Emit state change
  const expiresIn = formatDuration(durationMs);
  return {
    allowed: true,
    reason: 'suppress_allowed',
    suppressionEntry,
    governanceEvent,
    operatorFeedback: `Signal suppressed. Will re-appear after ${expiresIn}.`,
    newState: 'suppressed_with_memory',
  };
}

// Revoke suppression — operator can revoke anytime
export function revokeSuppress(
  suppressionId: string,
  operatorId: string,
  reason: string
): { success: boolean; reason: string } {
  const entry = _suppressionMemory.find((e) => e.suppressionId === suppressionId);
  if (!entry) {
    return { success: false, reason: 'suppression_not_found' };
  }
  if (entry.revoked) {
    return { success: false, reason: 'already_revoked' };
  }

  entry.revoked = true;
  entry.revokedAt = Date.now();
  entry.revokedBy = operatorId;
  entry.revokedReason = reason;

  // Governance event for revocation
  _suppressionAuditLog.push({
    eventId: generateId('gov'),
    eventType: 'suppression_revoked',
    eventTimestamp: Date.now(),
    signalId: entry.signalId,
    signalConfidenceAtEvent: entry.originalConfidence,
    signalMeaningAtEvent: '',
    operatorId,
    actionDetails: { suppressionId, revocationReason: reason },
    rationale: reason,
    failClosedApplied: false,
    governanceGatesChecked: [],
    immutable: true,
  });

  return { success: true, reason: 'suppression_revoked' };
}

// Check if a signal is currently suppressed
export function isCurrentlySuppressed(signalId: string): boolean {
  const now = Date.now();
  return _suppressionMemory.some(
    (e) =>
      e.signalId === signalId &&
      !e.revoked &&
      e.suppressionExpiration > now
  );
}

// Get active suppression for a signal
export function getActiveSuppressionEntry(
  signalId: string
): SuppressionMemoryEntry | undefined {
  const now = Date.now();
  return _suppressionMemory.find(
    (e) =>
      e.signalId === signalId &&
      !e.revoked &&
      e.suppressionExpiration > now
  );
}

// Get false positive weight for a pattern
export function getFalsePositiveWeight(pattern: string): number {
  const matches = _suppressionMemory.filter(
    (e) => e.signalPattern === pattern && !e.revoked
  );
  if (matches.length === 0) return 0;
  // Weight accumulates based on suppression count, capped at 0.9
  return Math.min(matches.length * 0.3, 0.9);
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const hours = ms / 3_600_000;
  if (hours < 24) return `${Math.round(hours)} hours`;
  const days = Math.round(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''}`;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
