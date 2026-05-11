// src/governance/EventLoggingSchema.ts
// SCOUT Runtime Event Logging Schema — scout_runtime_event_logging_v1.0
// Authority: DTC (required before Prompt 5)
// Source: SCOUT_CC_EXECUTION_PACKET_v1.0_CORRECTED.md

import { GovernanceEvent } from '../types/IMS';

// ─── Event type constants ─────────────────────────────────────────────────────

export const EVENT_TYPES = {
  ESCALATION_INITIATED:    'escalation_initiated',
  INVESTIGATION_INITIATED: 'investigation_initiated',
  INVESTIGATION_COMPLETED: 'investigation_completed',
  SUPPRESSION_INITIATED:   'suppression_initiated',
  SUPPRESSION_REVOKED:     'suppression_revoked',
  SUPPRESSION_EXPIRED:     'suppression_expired',
  RESEARCH_INITIATED:      'research_initiated',
  RESEARCH_COMPLETED:      'research_completed',
  LEARNING_EVENT_RECORDED: 'learning_event_recorded',
  GOVERNANCE_VIOLATION:    'governance_violation',
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// ─── Event-specific field interfaces ─────────────────────────────────────────

export interface EscalationInitiatedEvent extends GovernanceEvent {
  eventType: 'escalation_initiated';
  actionDetails: {
    escalationState: 'escalated_pending_approval';
    canWithdraw: boolean;
    confidenceLocked: number;
    ethicsGatesAtEvent: { safety: boolean; delight: boolean; harmony: boolean };
  };
}

export interface InvestigationInitiatedEvent extends GovernanceEvent {
  eventType: 'investigation_initiated';
  actionDetails: {
    investigationId: string;
    baselineConfidence: number;
    evidenceSourceCount: number;
    confidenceNotMutated: true;
  };
}

export interface InvestigationCompletedEvent extends GovernanceEvent {
  eventType: 'investigation_completed';
  actionDetails: {
    investigationId: string;
    baselineConfidence: number;
    suggestedConfidence?: number;
    confidenceChangeAccepted: boolean;
    operatorAction: 'escalate' | 'suppress' | 'research' | 'learning' | 'accept';
  };
}

export interface SuppressionInitiatedEvent extends GovernanceEvent {
  eventType: 'suppression_initiated';
  actionDetails: {
    suppressionId: string;
    originalConfidence: number; // locked, never mutable
    suppressionRationale: string;
    suppressionDuration: '24_hours' | '7_days' | '30_days' | 'custom';
    suppressionExpiration: number; // epoch ms
    falsePositiveWeight: 0.3;
  };
}

export interface SuppressionRevokedEvent extends GovernanceEvent {
  eventType: 'suppression_revoked';
  actionDetails: {
    suppressionId: string;
    revokeReason: string;
  };
}

export interface SuppressionExpiredEvent extends GovernanceEvent {
  eventType: 'suppression_expired';
  actionDetails: {
    suppressionId: string;
    signalReappears: true;
  };
}

export interface ResearchInitiatedEvent extends GovernanceEvent {
  eventType: 'research_initiated';
  actionDetails: {
    researchId: string;
    baselineConfidence: number;
    researchScope: string;
  };
}

export interface ResearchCompletedEvent extends GovernanceEvent {
  eventType: 'research_completed';
  actionDetails: {
    researchId: string;
    baselineConfidence: number;
    suggestedConfidence: number;
    confidenceChangeAccepted: boolean;
    operatorAction: 'accept' | 'reject' | 'investigate' | 'suppress' | 'learning';
  };
}

export interface LearningEventRecordedEvent extends GovernanceEvent {
  eventType: 'learning_event_recorded';
  actionDetails: {
    edgeEventId: string;
    feedbackType: 'correctly_classified' | 'misclassified' | 'pattern_important' | 'pattern_not_important';
    feedbackRationale?: string;
    classificationUpdated: boolean;
    confidenceUpdated: false; // always false
    patternWeightAdjusted: boolean;
  };
}

export interface GovernanceViolationEvent extends GovernanceEvent {
  eventType: 'governance_violation';
  actionDetails: {
    violationType: string;
    violationDetails: Record<string, unknown>;
    actionTaken: 'block' | 'clamp' | 'alert';
  };
}

// ─── Immutable audit log store ────────────────────────────────────────────────
// Canonical store. Append-only. No delete or update permitted.

const _eventLog: GovernanceEvent[] = [];

// ─── Storage operations ───────────────────────────────────────────────────────

/**
 * persistGovernanceEvent — append to immutable audit log.
 * Forces immutable:true before storage. Returns eventId + persisted flag.
 */
export function persistGovernanceEvent(
  event: GovernanceEvent
): { eventId: string; persisted: boolean } {
  const frozen = Object.freeze({ ...event, immutable: true as const });
  _eventLog.push(frozen);
  return { eventId: frozen.eventId, persisted: true };
}

/**
 * getGovernanceEvent — retrieve single event by eventId.
 * Returns null when not found. Read-only, no side effects.
 */
export function getGovernanceEvent(eventId: string): Readonly<GovernanceEvent> | null {
  return _eventLog.find((e) => e.eventId === eventId) ?? null;
}

/**
 * getSignalAuditTrail — return all events for a signal in chronological order.
 * Read-only, no side effects.
 */
export function getSignalAuditTrail(signalId: string): ReadonlyArray<GovernanceEvent> {
  return _eventLog
    .filter((e) => e.signalId === signalId)
    .sort((a, b) => a.eventTimestamp - b.eventTimestamp);
}

/**
 * getOperatorActivity — return all events initiated by an operator.
 * Optionally filter by time range (epoch ms).
 * Read-only, no side effects.
 */
export function getOperatorActivity(
  operatorId: string,
  timeRange?: { start: number; end: number }
): ReadonlyArray<GovernanceEvent> {
  return _eventLog
    .filter((e) => {
      if (e.operatorId !== operatorId) return false;
      if (timeRange) {
        return e.eventTimestamp >= timeRange.start && e.eventTimestamp <= timeRange.end;
      }
      return true;
    })
    .sort((a, b) => a.eventTimestamp - b.eventTimestamp);
}

/**
 * deleteGovernanceEvent — ALWAYS FAILS.
 * Immutable audit log cannot be deleted. Creates a governance_violation event.
 */
export function deleteGovernanceEvent(
  eventId: string
): { success: false; reason: 'immutable_audit_log_cannot_delete' } {
  // Attempted deletion is itself a violation — record it
  const violation: GovernanceEvent = {
    eventId: generateViolationId(),
    eventType: 'governance_violation',
    eventTimestamp: Date.now(),
    signalId: '',
    signalConfidenceAtEvent: 0,
    signalMeaningAtEvent: '',
    operatorId: 'system',
    actionDetails: {
      violationType: 'attempted_audit_log_deletion',
      violationDetails: { attemptedEventId: eventId },
      actionTaken: 'block',
    },
    failClosedApplied: true,
    governanceGatesChecked: ['immutability_enforcement'],
    immutable: true,
  };
  _eventLog.push(Object.freeze(violation));
  return { success: false, reason: 'immutable_audit_log_cannot_delete' };
}

/**
 * updateGovernanceEvent — ALWAYS FAILS.
 * Immutable audit log cannot be modified. Creates a governance_violation event.
 */
export function updateGovernanceEvent(
  eventId: string,
  _changes: Record<string, unknown>
): { success: false; reason: 'immutable_audit_log_cannot_update' } {
  const violation: GovernanceEvent = {
    eventId: generateViolationId(),
    eventType: 'governance_violation',
    eventTimestamp: Date.now(),
    signalId: '',
    signalConfidenceAtEvent: 0,
    signalMeaningAtEvent: '',
    operatorId: 'system',
    actionDetails: {
      violationType: 'attempted_audit_log_update',
      violationDetails: { attemptedEventId: eventId },
      actionTaken: 'block',
    },
    failClosedApplied: true,
    governanceGatesChecked: ['immutability_enforcement'],
    immutable: true,
  };
  _eventLog.push(Object.freeze(violation));
  return { success: false, reason: 'immutable_audit_log_cannot_update' };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Expose the full log for test inspection (read-only). */
export function getFullEventLog(): ReadonlyArray<GovernanceEvent> {
  return _eventLog;
}

function generateViolationId(): string {
  return `vio-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
