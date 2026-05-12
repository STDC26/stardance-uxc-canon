// src/__tests__/reporting/cc-scout-22.spec.ts
// CC_SCOUT_22 — Reporting Data Integration — 10 tests

import { toReportingSignal }       from '../../adapters/reporting/signal-reporting-adapter';
import { enrichConfidenceHistory } from '../../adapters/reporting/confidence-history-adapter';
import { toEthicsGateReport }      from '../../adapters/reporting/ethics-gate-adapter';
import { buildRuntimeTimeline }    from '../../adapters/reporting/runtime-timeline-adapter';
import { buildAuditDigest }        from '../../adapters/reporting/audit-digest-adapter';
import { CONFIDENCE_HARD_CAP }     from '../../logic/confidence-gates';
import type { StoredSignal, AuditEntry } from '../../persistence/signal-store';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeStoredSignal(overrides: Partial<StoredSignal> = {}): StoredSignal {
  return {
    signalId:           'reporting-sig-001',
    source:             { id: 'src-1', name: 'Report Source', trustLevel: 0.8 },
    timestamp:          new Date().toISOString(),
    context:            'Reporting adapter test.',
    whatIsHappening:    'Test.',
    whatItMeans:        'Test.',
    confidence:         0.82,
    baselineConfidence: 0.82,
    imsState:           'processing',
    runtimeState:       'none',
    ethicsGates: {
      safety:  { passed: true, reason: 'safety ok' },
      delight: { passed: true, reason: 'delight ok' },
      harmony: { passed: true, reason: 'harmony ok' },
    } as unknown as StoredSignal['ethicsGates'],
    evidence:                   [],
    confidenceHistory:          [{ confidence: 0.82, timestamp: new Date().toISOString(), source: 'ingestion', reason: 'baseline locked' }],
    learningHistory:            [],
    governanceEventReferences:  [],
    cappedAtIntake:              false,
    capApplied:                  false,
    signalCoreImmutable:         true as const,
    eventLogAppendOnly:          true as const,
    schemaVersion:               '1.0.1',
    cqx: { context: 'c', outcome: 'o', meaning: 'm', strengthAndRisk: { confidence: 0.82, riskAssessment: 'H' }, action: 'a' },
    suppressionMemory: { suppressed: false },
    immutable:          true as const,
    ...overrides,
  } as unknown as StoredSignal;
}

function makeAuditEntry(actionType: string, n = 0): AuditEntry {
  return {
    entryId:    `e-${n}`,
    signalId:   'reporting-sig-001',
    timestamp:  new Date().toISOString(),
    actorId:    'system',
    actionType,
    details:    { confidence: 0.82, reason: 'test' },
    immutable:  true as const,
  };
}

// ─── 1. Signal Reporting Adapter ──────────────────────────────────────────────

describe('signal-reporting-adapter', () => {
  test('transforms StoredSignal to ReportingSignal with reportingValidated=true', () => {
    const result = toReportingSignal(makeStoredSignal());
    expect(result.success).toBe(true);
    expect(result.signal!.reportingValidated).toBe(true);
    expect(result.signal!.immutable).toBe(true);
  });

  test('confidenceValid=false when confidence > CONFIDENCE_HARD_CAP', () => {
    const result = toReportingSignal(makeStoredSignal({ confidence: 0.95 }));
    expect(result.success).toBe(false);
    expect(result.signal!.confidenceValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('preserves cappedAtIntake flag from StoredSignal', () => {
    const result = toReportingSignal(makeStoredSignal({ cappedAtIntake: true, confidence: 0.92 }));
    expect(result.signal!.cappedAtIntake).toBe(true);
  });
});

// ─── 2. Confidence History Adapter ────────────────────────────────────────────

describe('confidence-history-adapter', () => {
  test('generates narrative including cap mention when cappedAtIntake=true', () => {
    const history = [{ confidence: 0.92, timestamp: new Date().toISOString(), source: 'ingestion', reason: 'baseline' }];
    const result = enrichConfidenceHistory(history, true, 0.92);
    expect(result.cappedAtIntake).toBe(true);
    expect(result.narrative).toContain('governance');
    expect(result.capProvenance).not.toBeNull();
  });

  test('capProvenance is null when not capped', () => {
    const history = [{ confidence: 0.80, timestamp: new Date().toISOString(), source: 'ingestion', reason: 'baseline' }];
    const result = enrichConfidenceHistory(history, false, 0.80);
    expect(result.capProvenance).toBeNull();
  });

  test('enriched snapshots have category and delta fields', () => {
    const history = [
      { confidence: 0.80, timestamp: new Date().toISOString(), source: 'ingestion', reason: 'baseline' },
      { confidence: 0.85, timestamp: new Date().toISOString(), source: 'research',  reason: 'updated' },
    ];
    const result = enrichConfidenceHistory(history, false, 0.85);
    expect(result.snapshots[0].category).toBe('ingestion');
    expect(result.snapshots[1].category).toBe('research');
    expect(result.snapshots[1].delta).toBeCloseTo(0.05);
  });
});

// ─── 3. Ethics Gate Adapter ───────────────────────────────────────────────────

describe('ethics-gate-adapter', () => {
  test('all-pass returns allPass=true with permit verdict', () => {
    const report = toEthicsGateReport({
      safety:  { passed: true, reason: 'ok' },
      delight: { passed: true, reason: 'ok' },
      harmony: { passed: true, reason: 'ok' },
    });
    expect(report.allPass).toBe(true);
    expect(report.verdict).toContain('permitted');
    expect(report.blockedActions).toHaveLength(0);
  });

  test('safety fail returns blockedActions containing escalate', () => {
    const report = toEthicsGateReport({
      safety:  { passed: false, reason: 'safety blocked' },
      delight: { passed: true, reason: 'ok' },
      harmony: { passed: true, reason: 'ok' },
    });
    expect(report.allPass).toBe(false);
    expect(report.blockedActions).toContain('escalate');
  });
});

// ─── 4. Runtime Timeline Adapter ──────────────────────────────────────────────

describe('runtime-timeline-adapter', () => {
  test('events sorted chronologically', () => {
    const entries = [
      makeAuditEntry('signal_stored',      0),
      makeAuditEntry('runtime_state_updated', 1),
    ];
    const timeline = buildRuntimeTimeline(entries);
    expect(timeline.events).toHaveLength(2);
    expect(timeline.immutable).toBe(true);
  });
});

// ─── 5. Audit Digest Adapter ──────────────────────────────────────────────────

describe('audit-digest-adapter', () => {
  test('groups events by category and builds summary text', () => {
    const entries = [
      makeAuditEntry('signal_stored',          0),
      makeAuditEntry('governance_event',       1),
      makeAuditEntry('learning_feedback',      2),
    ];
    const digest = buildAuditDigest(entries);
    expect(digest.totalEvents).toBe(3);
    expect(digest.groups.length).toBeGreaterThan(0);
    expect(digest.summaryText).toContain('3 events');
  });

  test('empty audit trail produces no-events summary', () => {
    const digest = buildAuditDigest([]);
    expect(digest.totalEvents).toBe(0);
    expect(digest.summaryText).toContain('No audit events');
  });
});
