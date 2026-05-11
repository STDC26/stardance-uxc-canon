// src/persistence/audit-trail-builder.ts
// CC_SCOUT_18 Step 4 — Audit Trail Builder.
// Constructs a complete, chronological, immutable audit trail from all sources:
// signal creation, confidence history, learning history, governance events.

import type { NormalizedSignal } from '../ingestion/normalization-pipeline';
import type { GovernanceEvent } from '../types/IMS';
import type { AuditEntry } from './signal-store';

// ─── Internal ID generator ────────────────────────────────────────────────────

function auditId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Entry builders ───────────────────────────────────────────────────────────

/**
 * buildCreationEntry — the first entry in every audit trail.
 * Captures the moment the signal was stored.
 */
export function buildCreationEntry(signal: NormalizedSignal): AuditEntry {
  return {
    entryId:    auditId('audit-create'),
    signalId:   signal.signalId,
    timestamp:  signal.timestamp,
    actorId:    'system',
    actionType: 'signal_created',
    details: {
      schemaVersion:     signal.schemaVersion,
      source:            signal.source.id,
      imsState:          signal.imsState,
      baselineConfidence: signal.baselineConfidence,
    },
    immutable: true as const,
  };
}

/**
 * buildConfidenceAuditEntries — one AuditEntry per ConfidenceSnapshot.
 * Preserves the full reason and source chain.
 */
export function buildConfidenceAuditEntries(signal: NormalizedSignal): AuditEntry[] {
  return signal.confidenceHistory.map(snapshot => ({
    entryId:    auditId('audit-conf'),
    signalId:   signal.signalId,
    timestamp:  snapshot.timestamp,
    actorId:    snapshot.source,
    actionType: 'confidence_snapshot',
    details: {
      confidence: snapshot.confidence,
      reason:     snapshot.reason,
    },
    immutable: true as const,
  }));
}

/**
 * buildLearningAuditEntries — one AuditEntry per learning feedback item.
 */
export function buildLearningAuditEntries(signal: NormalizedSignal): AuditEntry[] {
  const history = signal.learningHistory ?? [];
  return history.map(entry => ({
    entryId:    auditId('audit-learn'),
    signalId:   signal.signalId,
    timestamp:  entry.timestamp,
    actorId:    entry.operator,
    actionType: 'learning_feedback',
    details: {
      feedbackType: entry.feedbackType,
    },
    immutable: true as const,
  }));
}

/**
 * buildGovernanceAuditEntries — one AuditEntry per GovernanceEvent.
 */
export function buildGovernanceAuditEntries(
  signalId: string,
  events: GovernanceEvent[]
): AuditEntry[] {
  return events.map(event => ({
    entryId:    auditId('audit-gov'),
    signalId,
    timestamp:  new Date(event.eventTimestamp).toISOString(),
    actorId:    event.operatorId,
    actionType: event.eventType,
    details: {
      eventId:              event.eventId,
      signalConfidenceAtEvent: event.signalConfidenceAtEvent,
      failClosedApplied:    event.failClosedApplied,
      governanceGatesChecked: event.governanceGatesChecked,
      ...event.actionDetails,
    },
    immutable: true as const,
  }));
}

/**
 * mergeAndSortAuditTrail — combine entries from all sources and sort
 * chronologically ascending by timestamp.  Entries are immutable; sort
 * produces a new array.
 */
export function mergeAndSortAuditTrail(entries: AuditEntry[]): AuditEntry[] {
  return [...entries].sort((a, b) => {
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    return ta - tb;
  });
}

/**
 * buildAuditTrail — main entry point.
 * Combines creation event + confidence history + learning history + governance events
 * into a single sorted, immutable audit trail.
 */
export function buildAuditTrail(
  signal: NormalizedSignal,
  governanceEvents: GovernanceEvent[] = []
): AuditEntry[] {
  const entries: AuditEntry[] = [
    buildCreationEntry(signal),
    ...buildConfidenceAuditEntries(signal),
    ...buildLearningAuditEntries(signal),
    ...buildGovernanceAuditEntries(signal.signalId, governanceEvents),
  ];
  return mergeAndSortAuditTrail(entries);
}
