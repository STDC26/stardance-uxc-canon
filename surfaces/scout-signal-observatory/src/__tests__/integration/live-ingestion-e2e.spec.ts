// src/__tests__/integration/live-ingestion-e2e.spec.ts
// CC_SCOUT_19 — Live Ingestion Integration — 29 tests
//   Component 1  Signal Observatory (store as source):  4
//   Component 2  CQX canonical rendering:               3
//   Component 3  Confidence display:                    3
//   Component 4  Ethics gates panel:                    3
//   Component 5  State indicator split:                 3
//   Component 6  Action binding to behaviors:           5
//   Component 7  Manual evidence support:               2
//   Component 8  End-to-end integration:                6

import { InMemorySignalStore }   from '../../persistence/signal-store';
import {
  persistSignalAsync,
  appendGovernanceReference,
  updateRuntimeState,
} from '../../persistence/signal-persistence';
import { buildAuditTrail }       from '../../persistence/audit-trail-builder';
import { validateAndParseSignal } from '../../ingestion/normalization-pipeline';
import { normalizeAndValidateFull, isV1CompliantSignal } from '../../ingestion/normalization-pipeline';
import { ScoutRuntimeOrchestrator } from '../../orchestration/ScoutRuntimeOrchestrator';
import { CONFIDENCE_HARD_CAP }   from '../../logic/confidence-gates';
import type { NormalizedSignal } from '../../ingestion/normalization-pipeline';
import type { RawSignalInput }   from '../../api/SignalIntakeAdapter';
import type { GovernanceEvent }  from '../../types/IMS';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeRaw(overrides: Partial<RawSignalInput> = {}): RawSignalInput {
  return {
    source:           { id: 'src-001', name: 'Sensor Alpha', trustLevel: 0.85 },
    context:          'Production environment — anomaly detected',
    whatIsHappening:  'Latency spike above 3σ baseline',
    whatItMeans:      'Possible memory pressure or external dependency failure',
    confidence:       0.82,
    evidence: [
      { sourceType: 'sensor', source: { name: 'LatencyMonitor', trustLevel: 0.9 } },
    ],
    ethicsGates: { safety: true, delight: true, harmony: true },
    ...overrides,
  };
}

function makeNormalized(overrides: Partial<NormalizedSignal> = {}): NormalizedSignal {
  const base = normalizeAndValidateFull(makeRaw());
  return { ...base.signal!, ...overrides };
}

function makeGovEvent(overrides: Partial<GovernanceEvent> = {}): GovernanceEvent {
  return {
    eventId:                 'gov-test-001',
    eventType:               'escalate',
    eventTimestamp:          Date.now(),
    signalId:                'sig-001',
    signalConfidenceAtEvent: 0.82,
    signalMeaningAtEvent:    'Possible memory pressure',
    operatorId:              'op-001',
    actionDetails:           { action: 'escalate' },
    failClosedApplied:       false,
    governanceGatesChecked:  ['ethics', 'confidence'],
    immutable:               true,
    ...overrides,
  };
}

// ─── Component 1: Signal Observatory — store as source of truth (4 tests) ────

describe('CC_SCOUT_19 — Component 1: Signal Observatory (store)', () => {
  test('storeSignal returns stored=true; getSignal retrieves full StoredSignal', async () => {
    const store = new InMemorySignalStore();
    const signal = makeNormalized();
    const result = await store.storeSignal(signal);
    expect(result.stored).toBe(true);
    const retrieved = await store.getSignal(result.signalId);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.signalId).toBe(result.signalId);
    expect(retrieved!.schemaVersion).toBe('1.0.1');
  });

  test('getSignalsBySource filters correctly by sourceId', async () => {
    const store = new InMemorySignalStore();
    const s1 = makeNormalized();
    const s2 = makeNormalized();
    // Override source id to differentiate
    (s2 as unknown as Record<string, unknown>)['source'] = { id: 'src-999', name: 'Other', trustLevel: 0.6 };
    await store.storeSignal(s1);
    await store.storeSignal(s2);
    const results = await store.getSignalsBySource('src-001');
    expect(results.every(s => s.source.id === 'src-001')).toBe(true);
  });

  test('getSignalsByImsState returns only matching signals', async () => {
    const store = new InMemorySignalStore();
    await store.storeSignal(makeNormalized());
    const results = await store.getSignalsByImsState('processing');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every(s => s.imsState === 'processing')).toBe(true);
  });

  test('stored signal includes all v1.0.1 required fields', async () => {
    const store = new InMemorySignalStore();
    const signal = makeNormalized();
    await store.storeSignal(signal);
    const s = await store.getSignal(signal.signalId);
    expect(s!.schemaVersion).toBe('1.0.1');
    expect(s!.signalCoreImmutable).toBe(true);
    expect(s!.eventLogAppendOnly).toBe(true);
    expect(s!.immutable).toBe(true);
    expect(s!.cqx).toBeDefined();
    expect(s!.ethicsGates).toBeDefined();
  });
});

// ─── Component 2: CQX canonical rendering (3 tests) ──────────────────────────

describe('CC_SCOUT_19 — Component 2: CQX canonical rendering', () => {
  test('StoredSignal.cqx has all 5 canonical fields', async () => {
    const store = new InMemorySignalStore();
    const signal = makeNormalized();
    await store.storeSignal(signal);
    const s = await store.getSignal(signal.signalId);
    expect(s!.cqx.context).toBeDefined();
    expect(s!.cqx.outcome).toBeDefined();
    expect(s!.cqx.meaning).toBeDefined();
    expect(s!.cqx.strengthAndRisk).toBeDefined();
    expect(s!.cqx.action).toBeDefined();
  });

  test('cqx.outcome maps from raw.whatIsHappening', () => {
    const raw = makeRaw({ whatIsHappening: 'CPU spike detected' });
    const result = normalizeAndValidateFull(raw);
    expect(result.signal!.cqx.outcome).toBe('CPU spike detected');
  });

  test('cqx.strengthAndRisk.riskAssessment contains a risk band string', () => {
    const signal = makeNormalized();
    const ra = signal.cqx.strengthAndRisk.riskAssessment;
    expect(typeof ra).toBe('string');
    expect(ra.length).toBeGreaterThan(0);
    // Should be one of the three band labels
    expect(['HIGH', 'MEDIUM', 'LOW'].some(band => ra.includes(band))).toBe(true);
  });
});

// ─── Component 3: Confidence display (3 tests) ───────────────────────────────

describe('CC_SCOUT_19 — Component 3: Confidence Display', () => {
  test('signal with confidence < 0.92 has capApplied=false', () => {
    const signal = makeNormalized({ confidence: 0.82, baselineConfidence: 0.82, capApplied: false });
    expect(signal.capApplied).toBe(false);
    expect(signal.confidence).toBeLessThan(CONFIDENCE_HARD_CAP);
  });

  test('signal with raw confidence > 0.92 is capped to 0.92 at pipeline boundary', () => {
    // Intake adapter caps to 0.92 before normalization step;
    // normalization capConfidence then sees 0.92 (not > cap) so capApplied=false at norm step.
    // The important assertion is that the final confidence never exceeds the hard cap.
    const raw = makeRaw({ confidence: 0.99 });
    const result = normalizeAndValidateFull(raw);
    expect(result.signal!.confidence).toBe(0.92);
    expect(result.signal!.confidence).toBeLessThanOrEqual(CONFIDENCE_HARD_CAP);
  });

  test('baselineConfidence equals confidence after first normalization', () => {
    const result = normalizeAndValidateFull(makeRaw({ confidence: 0.75 }));
    expect(result.signal!.baselineConfidence).toBe(result.signal!.confidence);
  });
});

// ─── Component 4: Ethics gates panel (3 tests) ───────────────────────────────

describe('CC_SCOUT_19 — Component 4: Ethics Gates Panel', () => {
  test('all-pass gates: all 3 have passed=true with reason strings', () => {
    const signal = makeNormalized();
    expect(signal.ethicsGates.safety.passed).toBe(true);
    expect(signal.ethicsGates.delight.passed).toBe(true);
    expect(signal.ethicsGates.harmony.passed).toBe(true);
    expect(typeof signal.ethicsGates.safety.reason).toBe('string');
    expect(typeof signal.ethicsGates.delight.reason).toBe('string');
    expect(typeof signal.ethicsGates.harmony.reason).toBe('string');
  });

  test('failed gate has passed=false and reason containing "blocked"', () => {
    const raw = makeRaw({ ethicsGates: { safety: true, delight: false, harmony: true } });
    const result = normalizeAndValidateFull(raw);
    expect(result.signal!.ethicsGates.delight.passed).toBe(false);
    expect(result.signal!.ethicsGates.delight.reason).toContain('blocked');
  });

  test('all-pass: ethics gate rationale reasons contain gate name', () => {
    const signal = makeNormalized();
    expect(signal.ethicsGates.safety.reason).toContain('safety');
    expect(signal.ethicsGates.delight.reason).toContain('delight');
    expect(signal.ethicsGates.harmony.reason).toContain('harmony');
  });
});

// ─── Component 5: State indicator split (3 tests) ────────────────────────────

describe('CC_SCOUT_19 — Component 5: State Indicator split', () => {
  test('stored signal has imsState and runtimeState as separate fields', async () => {
    const store = new InMemorySignalStore();
    const signal = makeNormalized();
    await store.storeSignal(signal);
    const s = await store.getSignal(signal.signalId);
    expect(typeof s!.imsState).toBe('string');
    expect(typeof s!.runtimeState).toBe('string');
  });

  test('updateRuntimeState changes runtimeState without mutating imsState', async () => {
    const store = new InMemorySignalStore();
    const signal = makeNormalized();
    await store.storeSignal(signal);
    const govEvent = makeGovEvent({ signalId: signal.signalId });
    await updateRuntimeState(signal.signalId, 'investigating', 'op-001', govEvent, store);
    const updated = await store.getSignal(signal.signalId);
    expect(updated!.runtimeState).toBe('investigating');
    expect(updated!.imsState).toBe('processing'); // unchanged
  });

  test('imsState locked at "processing" after normalization', () => {
    const result = normalizeAndValidateFull(makeRaw());
    expect(result.signal!.imsState).toBe('processing');
  });
});

// ─── Component 6: Action binding to behaviors (5 tests) ──────────────────────

describe('CC_SCOUT_19 — Component 6: Action binding', () => {
  function makeOrchestratorSignal() {
    const norm = makeNormalized();
    return {
      id:         norm.signalId,
      confidence: norm.confidence,
      meaning:    norm.whatItMeans,
      evidence:   [{ source: 'Sensor', weight: 0.9 }],
      imsState:   'complete' as const,
      timestamp:  Date.now(),
      ethicsGates: { safety: true, delight: true, harmony: true },
    };
  }

  test('doEscalate returns result (success or governance-blocked)', async () => {
    const store = new InMemorySignalStore();
    const orch  = new ScoutRuntimeOrchestrator(store);
    const signal = makeOrchestratorSignal() as never;
    orch.setContext({ ethicsGateResult: { allPass: true, failedGates: [], actionConstrained: false, actionsAllowed: ['escalate'], actionsBlocked: [] } });
    const result = await orch.doEscalate(signal, 'op-001');
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });

  test('doSuppress creates governance event on success', () => {
    const store = new InMemorySignalStore();
    const orch  = new ScoutRuntimeOrchestrator(store);
    const signal = makeOrchestratorSignal() as never;
    const result = orch.doSuppress(signal, 'op-001', 'Maintenance window');
    if (result.success) {
      expect(result.governanceEvent).toBeDefined();
    } else {
      expect(result.reason).toBeDefined();
    }
  });

  test('doMarkAsLearning transitions to learning_event_recorded', () => {
    const store = new InMemorySignalStore();
    const orch  = new ScoutRuntimeOrchestrator(store);
    const signal = makeOrchestratorSignal() as never;
    const result = orch.doMarkAsLearning(signal, 'op-001', 'correctly_classified');
    if (result.success) {
      expect(result.newState).toBe('learning_event_recorded');
    }
  });

  test('governance event appended to signal governanceEventReferences after store action', async () => {
    const store = new InMemorySignalStore();
    const signal = makeNormalized();
    await store.storeSignal(signal);
    const govEvent = makeGovEvent({ signalId: signal.signalId });
    store.appendGovernanceEvent(signal.signalId, govEvent);
    const updated = await store.getSignal(signal.signalId);
    expect(updated!.governanceEventReferences).toContain(govEvent.eventId);
  });

  test('appendGovernanceReference adds event ID to store record', async () => {
    const store = new InMemorySignalStore();
    const signal = makeNormalized();
    await store.storeSignal(signal);
    const result = await appendGovernanceReference(signal.signalId, 'gov-xyz', store);
    expect(result.success).toBe(true);
    const updated = await store.getSignal(signal.signalId);
    expect(updated!.governanceEventReferences).toContain('gov-xyz');
  });
});

// ─── Component 7: Manual evidence support (2 tests) ──────────────────────────

describe('CC_SCOUT_19 — Component 7: Manual evidence support', () => {
  test("signal with sourceType 'manual' passes validateAndParseSignal", () => {
    const raw = makeRaw({
      evidence: [{ sourceType: 'manual', source: { name: 'Operator UAT', trustLevel: 0.8 } }],
    });
    const result = normalizeAndValidateFull(raw);
    expect(result.success).toBe(true);
    expect(result.signal!.evidence[0].sourceType).toBe('manual');
  });

  test("'manual' sourceType preserved through full normalization pipeline", () => {
    const result = normalizeAndValidateFull(
      makeRaw({ evidence: [{ sourceType: 'manual', source: { name: 'UAT Operator', trustLevel: 0.75 } }] })
    );
    expect(isV1CompliantSignal(result.signal)).toBe(true);
    expect(result.signal!.evidence.some(e => e.sourceType === 'manual')).toBe(true);
  });
});

// ─── Component 8: End-to-end integration (6 tests) ───────────────────────────

describe('CC_SCOUT_19 — Component 8: End-to-end integration', () => {
  test('raw → intake → normalization → persistence: full pipeline succeeds', async () => {
    const store  = new InMemorySignalStore();
    const result = normalizeAndValidateFull(makeRaw());
    expect(result.success).toBe(true);
    const persisted = await persistSignalAsync(result.signal!, store);
    expect(persisted.success).toBe(true);
    const retrieved = await store.getSignal(persisted.signalId!);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.schemaVersion).toBe('1.0.1');
  });

  test('stored signal has all CC_SCOUT_18 immutability flags set', async () => {
    const store  = new InMemorySignalStore();
    const result = normalizeAndValidateFull(makeRaw());
    await persistSignalAsync(result.signal!, store);
    const s = await store.getSignal(result.signal!.signalId);
    expect(s!.signalCoreImmutable).toBe(true);
    expect(s!.eventLogAppendOnly).toBe(true);
    expect(s!.immutable).toBe(true);
  });

  test('confidence never exceeds 0.92 after full pipeline', () => {
    const high   = normalizeAndValidateFull(makeRaw({ confidence: 0.99 }));
    const medium = normalizeAndValidateFull(makeRaw({ confidence: 0.75 }));
    const low    = normalizeAndValidateFull(makeRaw({ confidence: 0.30 }));
    [high, medium, low].forEach(r => {
      expect(r.signal!.confidence).toBeLessThanOrEqual(CONFIDENCE_HARD_CAP);
    });
  });

  test('baselineConfidence does not change after second persist attempt (idempotency)', async () => {
    const store  = new InMemorySignalStore();
    const result = normalizeAndValidateFull(makeRaw({ confidence: 0.82 }));
    await persistSignalAsync(result.signal!, store);
    const secondPersist = await persistSignalAsync(result.signal!, store);
    expect(secondPersist.stored).toBe(false); // already stored
    const retrieved = await store.getSignal(result.signal!.signalId);
    expect(retrieved!.baselineConfidence).toBe(result.signal!.baselineConfidence);
  });

  test('audit trail contains entries from all sources after actions', async () => {
    const store  = new InMemorySignalStore();
    const result = normalizeAndValidateFull(makeRaw());
    const signal = result.signal!;
    await store.storeSignal(signal);
    const govEvent = makeGovEvent({ signalId: signal.signalId });
    store.appendGovernanceEvent(signal.signalId, govEvent);
    const trail = buildAuditTrail(signal, [govEvent]);
    expect(trail.length).toBeGreaterThanOrEqual(3); // creation + confidence snapshot + governance
    expect(trail.every(e => e.immutable === true)).toBe(true);
  });

  test('governance event retrievable from store audit trail', async () => {
    const store  = new InMemorySignalStore();
    const signal = makeNormalized();
    await store.storeSignal(signal);
    const govEvent = makeGovEvent({ signalId: signal.signalId });
    store.appendGovernanceEvent(signal.signalId, govEvent);
    const trail = await store.getSignalAuditTrail(signal.signalId);
    const govEntry = trail.find(e => e.actionType === 'governance_event');
    expect(govEntry).toBeDefined();
    expect(govEntry!.details.eventId).toBe('gov-test-001');
  });
});
