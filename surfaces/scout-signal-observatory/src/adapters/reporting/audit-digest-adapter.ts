// src/adapters/reporting/audit-digest-adapter.ts
// CC_SCOUT_22 — Audit Digest Adapter.
// Groups audit trail by category. Summary by default; full trail on demand.

import type { AuditEntry } from '../../persistence/signal-store';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditCategory = 'ingestion' | 'governance' | 'action' | 'learning' | 'other';

export interface AuditCategoryGroup {
  readonly category: AuditCategory;
  readonly count:    number;
  readonly recent:   AuditEntry[];   // last 5
  readonly immutable: true;
}

export interface AuditDigest {
  readonly totalEvents: number;
  readonly groups:      AuditCategoryGroup[];
  readonly summaryText: string;
  readonly fullTrail:   AuditEntry[];
  readonly immutable:   true;
}

// ─── Category resolution ──────────────────────────────────────────────────────

function resolveCategory(actionType: string): AuditCategory {
  if (actionType === 'signal_stored' || actionType === 'signal_created') return 'ingestion';
  if (actionType.includes('governance') || actionType.includes('cap_enforced')) return 'governance';
  if (actionType.includes('learning'))  return 'learning';
  if (
    actionType.includes('runtime') ||
    actionType.includes('escalat') ||
    actionType.includes('suppress') ||
    actionType.includes('investigat') ||
    actionType.includes('research')
  ) return 'action';
  return 'other';
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

export function buildAuditDigest(auditTrail: AuditEntry[]): AuditDigest {
  const byCategory: Record<AuditCategory, AuditEntry[]> = {
    ingestion:  [],
    governance: [],
    action:     [],
    learning:   [],
    other:      [],
  };

  for (const entry of auditTrail) {
    byCategory[resolveCategory(entry.actionType)].push(entry);
  }

  const groups: AuditCategoryGroup[] = (Object.keys(byCategory) as AuditCategory[])
    .filter(cat => byCategory[cat].length > 0)
    .map(cat => ({
      category:  cat,
      count:     byCategory[cat].length,
      recent:    byCategory[cat].slice(-5),
      immutable: true as const,
    }));

  const summaryParts = groups.map(g => `${g.count} ${g.category}`);
  const summaryText = auditTrail.length === 0
    ? 'No audit events.'
    : `${auditTrail.length} events: ${summaryParts.join(', ')}.`;

  return {
    totalEvents: auditTrail.length,
    groups,
    summaryText,
    fullTrail:   [...auditTrail],
    immutable:   true as const,
  };
}
