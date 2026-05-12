// src/adapters/reporting/runtime-timeline-adapter.ts
// CC_SCOUT_22 — Runtime Timeline Adapter.
// Build simplified chronological timeline of signal state transitions from audit trail.

import type { AuditEntry } from '../../persistence/signal-store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  readonly timestamp:   string;
  readonly imsState:    string | null;
  readonly runtimeState: string | null;
  readonly eventType:   string;
  readonly description: string;
  readonly actorId:     string;
  readonly immutable:   true;
}

export interface RuntimeTimeline {
  readonly events:    TimelineEvent[];
  readonly immutable: true;
}

// ─── Friendly descriptions ────────────────────────────────────────────────────

function describeEvent(entry: AuditEntry): string {
  const d = entry.details as Record<string, unknown>;
  switch (entry.actionType) {
    case 'signal_stored':
    case 'signal_created':   return 'Signal ingested into store.';
    case 'confidence_snapshot': return `Confidence snapshot: ${Math.round((d.confidence as number ?? 0) * 100)}% — ${d.reason}`;
    case 'learning_feedback': return `Learning feedback: ${d.feedbackType}`;
    case 'governance_event':  return `Governance event: ${d.eventType}`;
    case 'runtime_state_updated': return `Runtime state → ${d.newRuntimeState}`;
    case 'confidence_cap_enforced': return `Confidence cap enforced at ${Math.round((d.confidence as number ?? 0) * 100)}%.`;
    default:                  return entry.actionType.replace(/_/g, ' ');
  }
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

export function buildRuntimeTimeline(auditTrail: AuditEntry[]): RuntimeTimeline {
  const sorted = [...auditTrail].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const events: TimelineEvent[] = sorted.map(entry => {
    const d = entry.details as Record<string, unknown>;
    return {
      timestamp:    entry.timestamp,
      imsState:     (d.imsState as string) ?? null,
      runtimeState: (d.newRuntimeState as string) ?? null,
      eventType:    entry.actionType,
      description:  describeEvent(entry),
      actorId:      entry.actorId,
      immutable:    true as const,
    };
  });

  return { events, immutable: true as const };
}
