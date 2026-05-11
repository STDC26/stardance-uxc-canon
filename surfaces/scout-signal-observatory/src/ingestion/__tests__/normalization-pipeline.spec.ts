// src/ingestion/__tests__/normalization-pipeline.spec.ts
// CC_SCOUT_17 tests — 26 required (18 step tests + 6 pipeline + 2 end-to-end)

import {
  validateAndParseSignal,
  enrichSignal,
  initializeRuntimeHistory,
  normalizationPipeline,
  normalizeAndValidateFull,
  isV1CompliantSignal,
  type NormalizedSignal,
} from '../normalization-pipeline';
import { capConfidence } from '../confidence-handler';
import { transformToCQX } from '../cqx-generator';
import { transformToCanonical, type CanonicalSignal, type RawSignalInput } from '../../api/SignalIntakeAdapter';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeRaw = (overrides: Partial<RawSignalInput> = {}): RawSignalInput => ({
  source: { id: 'src-001', name: 'Sensor Alpha', trustLevel: 0.85 },
  context: 'Production environment — anomaly detected in service mesh',
  whatIsHappening: 'Latency spike above 3σ baseline',
  whatItMeans: 'Possible memory pressure or external dependency failure',
  confidence: 0.82,
  evidence: [
    { sourceType: 'sensor', source: { name: 'LatencyMonitor', trustLevel: 0.9 } },
  ],
  ethicsGates: { safety: true, delight: true, harmony: true },
  ...overrides,
});

const makeCanonical = (overrides: Partial<RawSignalInput> = {}): CanonicalSignal =>
  transformToCanonical(makeRaw(overrides));

// ─── Step 1: validateAndParseSignal (6 tests) ─────────────────────────────────

describe('NormalizationPipeline — Step 1: validateAndParseSignal', () => {
  test('valid canonical signal parses successfully', () => {
    const result = validateAndParseSignal(makeCanonical());
    expect(result.valid).toBe(true);
    expect(result.signal).toBeDefined();
    expect(result.errors).toHaveLength(0);
  });

  test('missing required field returns error', () => {
    const signal = makeCanonical();
    const broken = { ...signal, signalId: undefined } as unknown as CanonicalSignal;
    const result = validateAndParseSignal(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('signalId'))).toBe(true);
  });

  test('confidence type error (string) returns error', () => {
    const signal = makeCanonical();
    const broken = { ...signal, confidence: 'high' } as unknown as CanonicalSignal;
    const result = validateAndParseSignal(broken);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('confidence_out_of_range');
  });

  test('confidence out of range (> 1.0) returns error', () => {
    const signal = { ...makeCanonical(), confidence: 1.5 };
    const result = validateAndParseSignal(signal);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('confidence_out_of_range');
  });

  test('future-dated timestamp returns error', () => {
    const signal = { ...makeCanonical(), timestamp: new Date(Date.now() + 60_000).toISOString() };
    const result = validateAndParseSignal(signal);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('timestamp_future_dated');
  });

  test('empty evidence array returns error', () => {
    const signal = { ...makeCanonical(), evidence: [] };
    const result = validateAndParseSignal(signal);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('evidence_required');
  });
});

// ─── Step 1: RC-06 trustLevel bounds (3 tests) ───────────────────────────────

describe('NormalizationPipeline — Step 1: RC-06 trustLevel bounds', () => {
  test('trustLevel out of bounds (> 1.0) returns error', () => {
    const signal = makeCanonical({
      evidence: [{ sourceType: 'sensor', source: { name: 'M', trustLevel: 1.5 } }],
    });
    const result = validateAndParseSignal(signal);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('trustLevel_out_of_bounds'))).toBe(true);
  });

  test('trustLevel out of bounds (< 0.0) returns error', () => {
    const signal = makeCanonical({
      evidence: [{ sourceType: 'sensor', source: { name: 'M', trustLevel: -0.1 } }],
    });
    const result = validateAndParseSignal(signal);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('trustLevel_out_of_bounds'))).toBe(true);
  });

  test('trustLevel exactly 0.0 and 1.0 are valid (boundary)', () => {
    const signal0 = makeCanonical({
      evidence: [{ sourceType: 'sensor', source: { name: 'M', trustLevel: 0.0 } }],
    });
    const signal1 = makeCanonical({
      evidence: [{ sourceType: 'sensor', source: { name: 'M', trustLevel: 1.0 } }],
    });
    expect(validateAndParseSignal(signal0).valid).toBe(true);
    expect(validateAndParseSignal(signal1).valid).toBe(true);
  });
});

// ─── Step 1: RC-07 sourceType enum (3 tests) ─────────────────────────────────

describe('NormalizationPipeline — Step 1: RC-07 sourceType enum', () => {
  test('invalid sourceType returns error', () => {
    const signal = makeCanonical({
      evidence: [{ sourceType: 'unknown_type' as never, source: { name: 'M', trustLevel: 0.8 } }],
    });
    const result = validateAndParseSignal(signal);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('sourceType_invalid'))).toBe(true);
  });

  test("'manual' sourceType is accepted as valid", () => {
    const signal = makeCanonical({
      evidence: [{ sourceType: 'manual' as never, source: { name: 'M', trustLevel: 0.8 } }],
    });
    const result = validateAndParseSignal(signal);
    expect(result.valid).toBe(true);
  });

  test("all canonical sourceTypes are accepted (sensor, log, external_intelligence, operator_input)", () => {
    const types = ['sensor', 'log', 'external_intelligence', 'operator_input'] as const;
    for (const sourceType of types) {
      const signal = makeCanonical({
        evidence: [{ sourceType, source: { name: 'M', trustLevel: 0.8 } }],
      });
      expect(validateAndParseSignal(signal).valid).toBe(true);
    }
  });
});

// ─── Step 2: RC-08 schemaVersion (2 tests) ───────────────────────────────────

describe('NormalizationPipeline — Step 2: RC-08 schemaVersion', () => {
  test("enrichSignal sets schemaVersion to '1.0.1'", () => {
    const canonical = makeCanonical();
    const enriched = enrichSignal(canonical);
    expect(enriched.schemaVersion).toBe('1.0.1');
  });

  test("normalized signal carries schemaVersion '1.0.1' through full pipeline", () => {
    const result = normalizationPipeline(makeCanonical());
    expect(result.success).toBe(true);
    expect((result.signal as unknown as Record<string, unknown>).schemaVersion).toBe('1.0.1');
  });
});

// ─── Step 3: transformToCQX (4 tests) ────────────────────────────────────────

describe('NormalizationPipeline — Step 3: transformToCQX', () => {
  test('CQX object has all 5 required fields in correct structure', () => {
    const raw = makeRaw();
    const cqx = transformToCQX({
      context: raw.context,
      whatIsHappening: raw.whatIsHappening,
      whatItMeans: raw.whatItMeans,
      confidence: raw.confidence,
      ethicsGates: raw.ethicsGates,
    });
    expect(cqx.context).toBe(raw.context);
    expect(cqx.outcome).toBeDefined();
    expect(cqx.meaning).toBeDefined();
    expect(cqx.strengthAndRisk).toBeDefined();
    expect(cqx.action).toBeDefined();
  });

  test('field mapping: outcome = whatIsHappening, meaning = whatItMeans', () => {
    const cqx = transformToCQX({
      context: 'ctx',
      whatIsHappening: 'anomaly detected',
      whatItMeans: 'system under stress',
      confidence: 0.8,
    });
    expect(cqx.outcome).toBe('anomaly detected');
    expect(cqx.meaning).toBe('system under stress');
  });

  test('strengthAndRisk.confidence matches input confidence', () => {
    const cqx = transformToCQX({
      context: 'ctx',
      whatIsHappening: 'x',
      whatItMeans: 'y',
      confidence: 0.65,
    });
    expect(cqx.strengthAndRisk.confidence).toBe(0.65);
  });

  test('action includes Escalate when confidence >= 0.75 and ethics all pass', () => {
    const highConf = transformToCQX({
      context: 'ctx', whatIsHappening: 'x', whatItMeans: 'y', confidence: 0.85,
      ethicsGates: { safety: true, delight: true, harmony: true },
    });
    expect(highConf.action).toContain('Escalate');

    const lowConf = transformToCQX({
      context: 'ctx', whatIsHappening: 'x', whatItMeans: 'y', confidence: 0.55,
    });
    expect(lowConf.action).not.toContain('Escalate');
  });
});

// ─── Step 4: capConfidence (4 tests) ─────────────────────────────────────────

describe('NormalizationPipeline — Step 4: capConfidence', () => {
  test('confidence below 0.92 passes through unchanged', () => {
    const result = capConfidence({ confidence: 0.75, confidenceHistory: [] });
    expect(result.confidence).toBe(0.75);
    expect(result.capApplied).toBe(false);
  });

  test('confidence above 0.92 is clamped to exactly 0.92', () => {
    const result = capConfidence({ confidence: 0.99, confidenceHistory: [] });
    expect(result.confidence).toBe(0.92);
    expect(result.capApplied).toBe(true);
  });

  test('baselineConfidence set to clamped confidence', () => {
    const result = capConfidence({ confidence: 0.95, confidenceHistory: [] });
    expect(result.baselineConfidence).toBe(0.92);

    const below = capConfidence({ confidence: 0.68, confidenceHistory: [] });
    expect(below.baselineConfidence).toBe(0.68);
  });

  test('history entry appended with correct source and reason', () => {
    const capped = capConfidence({ confidence: 0.98, confidenceHistory: [] });
    expect(capped.confidenceHistory).toHaveLength(1);
    expect(capped.confidenceHistory[0].source).toBe('ingestion');
    expect(capped.confidenceHistory[0].reason).toBe('capped_at_0.92');
    expect(capped.confidenceHistory[0].confidence).toBe(0.92);

    const notCapped = capConfidence({ confidence: 0.72, confidenceHistory: [] });
    expect(notCapped.confidenceHistory[0].reason).toBe('baseline_locked_at_ingestion');
  });
});

// ─── Step 5: initializeRuntimeHistory (4 tests) ──────────────────────────────

describe('NormalizationPipeline — Step 5: initializeRuntimeHistory', () => {
  const buildNormalized = (overrides: Partial<RawSignalInput> = {}): NormalizedSignal => {
    const canonical = makeCanonical(overrides);
    const enriched = enrichSignal(canonical);
    const capResult = capConfidence({ confidence: enriched.confidence, confidenceHistory: enriched.confidenceHistory });
    const cqx = transformToCQX({
      context: enriched.context,
      whatIsHappening: enriched.whatIsHappening,
      whatItMeans: enriched.whatItMeans,
      confidence: capResult.confidence,
      ethicsGates: enriched.ethicsGates,
    });
    return initializeRuntimeHistory(enriched, capResult, cqx);
  };

  test('confidenceHistory initialized with at least one entry', () => {
    const signal = buildNormalized();
    expect(Array.isArray(signal.confidenceHistory)).toBe(true);
    expect(signal.confidenceHistory.length).toBeGreaterThanOrEqual(1);
    expect(signal.confidenceHistory[0].source).toBe('ingestion');
  });

  test('learningHistory initialized as empty array', () => {
    const signal = buildNormalized();
    expect(Array.isArray(signal.learningHistory)).toBe(true);
    expect(signal.learningHistory).toHaveLength(0);
  });

  test('governanceEventReferences initialized as empty array', () => {
    const signal = buildNormalized();
    expect(Array.isArray(signal.governanceEventReferences)).toBe(true);
    expect(signal.governanceEventReferences).toHaveLength(0);
  });

  test('ethicsGates enriched with { passed, reason } rationale for all 3 gates', () => {
    const signal = buildNormalized({ ethicsGates: { safety: true, delight: false, harmony: true } });
    expect(signal.ethicsGates.safety.passed).toBe(true);
    expect(typeof signal.ethicsGates.safety.reason).toBe('string');
    expect(signal.ethicsGates.delight.passed).toBe(false);
    expect(signal.ethicsGates.delight.reason).toContain('blocked');
    expect(signal.ethicsGates.harmony.passed).toBe(true);
  });
});

// ─── Pipeline assembly (6 tests) ─────────────────────────────────────────────

describe('NormalizationPipeline — Assembly: normalizationPipeline', () => {
  test('happy path: returns success=true with fully normalized signal', () => {
    const result = normalizationPipeline(makeCanonical());
    expect(result.success).toBe(true);
    expect(result.signal).toBeDefined();
  });

  test('step 1 failure stops pipeline — invalid timestamp returns success=false', () => {
    const signal = { ...makeCanonical(), timestamp: new Date(Date.now() + 300_000).toISOString() };
    const result = normalizationPipeline(signal);
    expect(result.success).toBe(false);
    expect(result.step).toBe('step1_validate');
    expect(result.signal).toBeUndefined();
  });

  test('step chaining: NormalizedSignal has imsState=processing, runtimeState=none', () => {
    const result = normalizationPipeline(makeCanonical());
    expect(result.signal!.imsState).toBe('processing');
    expect(result.signal!.runtimeState).toBe('none');
  });

  test('final signal passes v1.0.1 schema compliance check', () => {
    const result = normalizationPipeline(makeCanonical());
    expect(isV1CompliantSignal(result.signal)).toBe(true);
  });

  test('immutability flags set: signalCoreImmutable=true, eventLogAppendOnly=true, immutable=true', () => {
    const result = normalizationPipeline(makeCanonical());
    const s = result.signal!;
    expect(s.signalCoreImmutable).toBe(true);
    expect(s.eventLogAppendOnly).toBe(true);
    expect(s.immutable).toBe(true);
  });

  test('history arrays present on normalized signal', () => {
    const result = normalizationPipeline(makeCanonical());
    const s = result.signal!;
    expect(Array.isArray(s.confidenceHistory)).toBe(true);
    expect(Array.isArray(s.learningHistory)).toBe(true);
    expect(Array.isArray(s.governanceEventReferences)).toBe(true);
  });
});

// ─── End-to-end (2 tests) ────────────────────────────────────────────────────

describe('NormalizationPipeline — End-to-end: normalizeAndValidateFull', () => {
  test('raw input → intake → normalization → v1.0.1 compliant signal', () => {
    const result = normalizeAndValidateFull(makeRaw());
    expect(result.success).toBe(true);
    expect(isV1CompliantSignal(result.signal)).toBe(true);

    const s = result.signal!;
    expect(s.imsState).toBe('processing');
    expect(s.confidence).toBeLessThanOrEqual(0.92);
    expect(s.baselineConfidence).toBe(s.confidence);
    expect(s.cqx.context).toBe(makeRaw().context);
    expect(s.cqx.outcome).toBe(makeRaw().whatIsHappening);
    expect(s.cqx.meaning).toBe(makeRaw().whatItMeans);
  });

  test('batch: 3 independent signals each produce unique signalIds and pass compliance', () => {
    const signals = [
      normalizeAndValidateFull(makeRaw({ confidence: 0.88 })),
      normalizeAndValidateFull(makeRaw({ confidence: 0.55 })),
      normalizeAndValidateFull(makeRaw({ confidence: 0.30 })),
    ];
    expect(signals.every(r => r.success)).toBe(true);
    expect(signals.every(r => isV1CompliantSignal(r.signal))).toBe(true);
    const ids = signals.map(r => r.signal!.signalId);
    expect(new Set(ids).size).toBe(3);
  });
});
