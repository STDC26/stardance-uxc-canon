// src/__tests__/integration/confidence-cap-provenance.spec.ts
// CC_SCOUT_BUILD1_CAP_PROVENANCE_PATCH — 8 tests
// Verifies end-to-end cap provenance: cappedAtIntake flag, cap note visibility,
// confidenceHistory cap entry, and audit trail cap enforcement event.

import { processIncomingSignal } from '../../api/SignalIntakeAdapter';
import { normalizationPipeline } from '../../ingestion/normalization-pipeline';
import { buildAuditTrail }       from '../../persistence/audit-trail-builder';
import { CONFIDENCE_HARD_CAP }   from '../../logic/confidence-gates';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRaw(confidence: number) {
  return {
    source: { id: 'src-cap-test', name: 'Cap Test Source', trustLevel: 0.9 },
    context:          'Cap provenance test context.',
    whatIsHappening:  'Confidence cap provenance test.',
    whatItMeans:      'Verifying cap flag propagation end-to-end.',
    confidence,
    evidence: [
      {
        sourceType: 'sensor',
        source: { name: 'Cap Sensor', trustLevel: 0.9 },
        data: { value: confidence },
      },
    ],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Cap Provenance — cappedAtIntake flag', () => {
  test('raw confidence 0.99 → cappedAtIntake=true on CanonicalSignal', () => {
    const result = processIncomingSignal(makeRaw(0.99));
    expect(result.success).toBe(true);
    expect(result.signal!.cappedAtIntake).toBe(true);
    expect(result.signal!.confidence).toBe(CONFIDENCE_HARD_CAP);
  });

  test('raw confidence 0.95 → cappedAtIntake=true on CanonicalSignal', () => {
    const result = processIncomingSignal(makeRaw(0.95));
    expect(result.success).toBe(true);
    expect(result.signal!.cappedAtIntake).toBe(true);
    expect(result.signal!.confidence).toBe(CONFIDENCE_HARD_CAP);
  });

  test('raw confidence 0.93 → cappedAtIntake=true on CanonicalSignal', () => {
    const result = processIncomingSignal(makeRaw(0.93));
    expect(result.success).toBe(true);
    expect(result.signal!.cappedAtIntake).toBe(true);
    expect(result.signal!.confidence).toBe(CONFIDENCE_HARD_CAP);
  });

  test('raw confidence exactly 0.92 → cappedAtIntake=false on CanonicalSignal', () => {
    const result = processIncomingSignal(makeRaw(0.92));
    expect(result.success).toBe(true);
    expect(result.signal!.cappedAtIntake).toBe(false);
    expect(result.signal!.confidence).toBe(0.92);
  });

  test('raw confidence 0.87 → cappedAtIntake=false on CanonicalSignal', () => {
    const result = processIncomingSignal(makeRaw(0.87));
    expect(result.success).toBe(true);
    expect(result.signal!.cappedAtIntake).toBe(false);
    expect(result.signal!.confidence).toBe(0.87);
  });
});

describe('Cap Provenance — confidenceHistory cap entry', () => {
  test('raw > 0.92 → confidenceHistory contains entry with source=intake_cap, reason=cap_applied', () => {
    const result = processIncomingSignal(makeRaw(0.99));
    expect(result.success).toBe(true);
    const history = result.signal!.confidenceHistory;
    const capEntry = history.find(h => h.source === 'intake_cap');
    expect(capEntry).toBeDefined();
    expect(capEntry!.reason).toBe('cap_applied');
    expect(capEntry!.confidence).toBe(CONFIDENCE_HARD_CAP);
  });
});

describe('Cap Provenance — audit trail', () => {
  test('raw > 0.92 → audit trail contains confidence_cap_enforced event', () => {
    const intakeResult = processIncomingSignal(makeRaw(0.99));
    expect(intakeResult.success).toBe(true);
    const pipeResult = normalizationPipeline(intakeResult.signal!);
    expect(pipeResult.success).toBe(true);
    const trail = buildAuditTrail(pipeResult.signal!);
    const capEvent = trail.find(e => e.actionType === 'confidence_cap_enforced');
    expect(capEvent).toBeDefined();
    expect(capEvent!.actorId).toBe('system');
    expect((capEvent!.details as Record<string, unknown>).cappedAtIntake).toBe(true);
  });

  test('raw ≤ 0.92 → audit trail does NOT contain confidence_cap_enforced event', () => {
    const intakeResult = processIncomingSignal(makeRaw(0.87));
    expect(intakeResult.success).toBe(true);
    const pipeResult = normalizationPipeline(intakeResult.signal!);
    expect(pipeResult.success).toBe(true);
    const trail = buildAuditTrail(pipeResult.signal!);
    const capEvent = trail.find(e => e.actionType === 'confidence_cap_enforced');
    expect(capEvent).toBeUndefined();
  });
});
