// src/adapters/reporting/confidence-history-adapter.ts
// CC_SCOUT_22 — Confidence History Adapter.
// Enrich confidence history with cap provenance and generate plain-English narrative.

import type { ConfidenceSnapshot } from '../../api/SignalIntakeAdapter';
import { CONFIDENCE_HARD_CAP } from '../../logic/confidence-gates';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EnrichedSnapshot extends ConfidenceSnapshot {
  readonly category: 'ingestion' | 'cap' | 'research' | 'learning' | 'governance' | 'other';
  readonly delta:    number;   // change from previous
  readonly immutable: true;
}

export interface EnrichedConfidenceHistory {
  readonly snapshots:        EnrichedSnapshot[];
  readonly narrative:        string;
  readonly cappedAtIntake:   boolean;
  readonly capProvenance:    string | null;
  readonly immutable:        true;
}

// ─── Category resolver ────────────────────────────────────────────────────────

function resolveCategory(source: string): EnrichedSnapshot['category'] {
  if (source === 'ingestion' || source === 'intake') return 'ingestion';
  if (source === 'intake_cap' || source === 'cap')   return 'cap';
  if (source.includes('research'))                   return 'research';
  if (source.includes('learn'))                      return 'learning';
  if (source.includes('govern'))                     return 'governance';
  return 'other';
}

// ─── Narrative builder ────────────────────────────────────────────────────────

function buildNarrative(
  snapshots: EnrichedSnapshot[],
  cappedAtIntake: boolean,
  current: number
): string {
  const nonCap = snapshots.filter(s => s.category !== 'cap');
  if (nonCap.length === 0) {
    return `Current confidence: ${Math.round(current * 100)}%.`;
  }

  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const first = nonCap[0];
  let n = `Signal ingested at ${pct(first.confidence)}.`;

  if (nonCap.length > 1) {
    const last  = nonCap[nonCap.length - 1];
    const delta = last.confidence - first.confidence;
    if (Math.abs(delta) >= 0.01) {
      const dir = delta > 0 ? 'Increased' : 'Decreased';
      n += ` ${dir} ${pct(Math.abs(delta))} since ingestion.`;
    }
  }

  n += ` Current: ${pct(current)}.`;

  if (cappedAtIntake) {
    n += ` (Raw input was higher; capped at ${pct(CONFIDENCE_HARD_CAP)} by governance.)`;
  }

  return n;
}

// ─── Main adapter ─────────────────────────────────────────────────────────────

export function enrichConfidenceHistory(
  history:        ConfidenceSnapshot[],
  cappedAtIntake: boolean,
  currentConf:    number
): EnrichedConfidenceHistory {
  let previous = history[0]?.confidence ?? currentConf;

  const snapshots: EnrichedSnapshot[] = history.map((snap, i) => {
    const prev = i === 0 ? snap.confidence : history[i - 1].confidence;
    previous = prev;
    return {
      ...snap,
      category:  resolveCategory(snap.source),
      delta:     snap.confidence - previous,
      immutable: true as const,
    };
  });

  // Add synthetic cap provenance entry if capped but not in history
  const hasCapEntry = snapshots.some(s => s.category === 'cap');
  const enriched = cappedAtIntake && !hasCapEntry
    ? [...snapshots, {
        confidence: CONFIDENCE_HARD_CAP,
        timestamp:  snapshots[0]?.timestamp ?? new Date().toISOString(),
        source:     'intake_cap',
        reason:     'cap_applied',
        category:   'cap' as const,
        delta:      0,
        immutable:  true as const,
      }]
    : snapshots;

  const narrative   = buildNarrative(enriched, cappedAtIntake, currentConf);
  const capProvenance = cappedAtIntake
    ? `Raw confidence exceeded ${Math.round(CONFIDENCE_HARD_CAP * 100)}% hard cap at intake. Capped to ${Math.round(CONFIDENCE_HARD_CAP * 100)}%.`
    : null;

  return {
    snapshots:      enriched,
    narrative,
    cappedAtIntake,
    capProvenance,
    immutable:      true as const,
  };
}
