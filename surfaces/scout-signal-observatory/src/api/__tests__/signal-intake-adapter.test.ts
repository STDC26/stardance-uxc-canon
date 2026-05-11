// src/api/__tests__/signal-intake-adapter.test.ts
// CC_SCOUT_16 tests — 10+ required

import {
  validateRawSignal,
  transformToCanonical,
  processIncomingSignal,
  INTAKE_ERROR_CODES,
  VALID_EVIDENCE_SOURCE_TYPES,
  RawSignalInput,
  CanonicalSignal,
} from '../SignalIntakeAdapter';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeValidRaw = (overrides: Partial<RawSignalInput> = {}): RawSignalInput => ({
  source: { id: 'src-001', name: 'Sensor Alpha', trustLevel: 0.85 },
  context: 'Production environment — anomaly detected',
  whatIsHappening: 'Latency spike above 3σ baseline in service mesh',
  whatItMeans: 'Possible memory pressure or external dependency failure',
  confidence: 0.82,
  evidence: [
    { sourceType: 'sensor', source: { name: 'LatencyMonitor', trustLevel: 0.9 }, data: { p99: 2800 } },
  ],
  ethicsGates: { safety: true, delight: true, harmony: true },
  ...overrides,
});

// ─── Suite 1: validateRawSignal ───────────────────────────────────────────────

describe('SignalIntakeAdapter — validateRawSignal', () => {
  test('valid signal passes all checks', () => {
    const result = validateRawSignal(makeValidRaw());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('non-object body returns UNKNOWN_ERROR', () => {
    expect(validateRawSignal(null).valid).toBe(false);
    expect(validateRawSignal('string').valid).toBe(false);
    expect(validateRawSignal(42).valid).toBe(false);
  });

  test('missing source returns MISSING_SOURCE', () => {
    const result = validateRawSignal({ ...makeValidRaw(), source: undefined });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(INTAKE_ERROR_CODES.MISSING_SOURCE);
  });

  test('missing source.id returns MISSING_SOURCE_ID', () => {
    const raw = makeValidRaw();
    const result = validateRawSignal({ ...raw, source: { ...raw.source, id: '' } });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(INTAKE_ERROR_CODES.MISSING_SOURCE_ID);
  });

  test('source.trustLevel out of range returns SOURCE_TRUST_LEVEL_INVALID', () => {
    const raw = makeValidRaw();
    expect(validateRawSignal({ ...raw, source: { ...raw.source, trustLevel: 1.5 } }).errors)
      .toContain(INTAKE_ERROR_CODES.SOURCE_TRUST_LEVEL_INVALID);
    expect(validateRawSignal({ ...raw, source: { ...raw.source, trustLevel: -0.1 } }).errors)
      .toContain(INTAKE_ERROR_CODES.SOURCE_TRUST_LEVEL_INVALID);
  });

  test('missing context returns MISSING_CONTEXT', () => {
    const result = validateRawSignal({ ...makeValidRaw(), context: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(INTAKE_ERROR_CODES.MISSING_CONTEXT);
  });

  test('missing whatIsHappening returns MISSING_WHAT_IS_HAPPENING', () => {
    const result = validateRawSignal({ ...makeValidRaw(), whatIsHappening: '   ' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(INTAKE_ERROR_CODES.MISSING_WHAT_IS_HAPPENING);
  });

  test('missing whatItMeans returns MISSING_WHAT_IT_MEANS', () => {
    const result = validateRawSignal({ ...makeValidRaw(), whatItMeans: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(INTAKE_ERROR_CODES.MISSING_WHAT_IT_MEANS);
  });

  test('missing confidence returns MISSING_CONFIDENCE', () => {
    const { confidence: _, ...rest } = makeValidRaw();
    const result = validateRawSignal(rest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(INTAKE_ERROR_CODES.MISSING_CONFIDENCE);
  });

  test('confidence > 1.0 returns CONFIDENCE_OUT_OF_RANGE', () => {
    const result = validateRawSignal({ ...makeValidRaw(), confidence: 1.1 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(INTAKE_ERROR_CODES.CONFIDENCE_OUT_OF_RANGE);
  });

  test('confidence < 0 returns CONFIDENCE_OUT_OF_RANGE', () => {
    const result = validateRawSignal({ ...makeValidRaw(), confidence: -0.1 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(INTAKE_ERROR_CODES.CONFIDENCE_OUT_OF_RANGE);
  });

  test('empty evidence array returns EVIDENCE_REQUIRED', () => {
    const result = validateRawSignal({ ...makeValidRaw(), evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(INTAKE_ERROR_CODES.EVIDENCE_REQUIRED);
  });

  test('invalid evidence sourceType returns EVIDENCE_INVALID_SOURCE_TYPE', () => {
    const raw = makeValidRaw();
    const result = validateRawSignal({
      ...raw,
      evidence: [{ sourceType: 'unknown_type', source: { name: 'X', trustLevel: 0.5 } }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(INTAKE_ERROR_CODES.EVIDENCE_INVALID_SOURCE_TYPE);
  });

  test('evidence missing source returns EVIDENCE_MISSING_SOURCE', () => {
    const raw = makeValidRaw();
    const result = validateRawSignal({
      ...raw,
      evidence: [{ sourceType: 'sensor', source: null as unknown as { name: string; trustLevel: number } }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(INTAKE_ERROR_CODES.EVIDENCE_MISSING_SOURCE);
  });

  test('all valid evidence source types accepted', () => {
    for (const st of VALID_EVIDENCE_SOURCE_TYPES) {
      const raw = makeValidRaw();
      raw.evidence[0].sourceType = st;
      expect(validateRawSignal(raw).valid).toBe(true);
    }
  });

  test('multiple validation failures collected (fail-closed: all errors returned)', () => {
    const result = validateRawSignal({ confidence: 2.0, evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.errors).toContain(INTAKE_ERROR_CODES.CONFIDENCE_OUT_OF_RANGE);
    expect(result.errors).toContain(INTAKE_ERROR_CODES.EVIDENCE_REQUIRED);
  });
});

// ─── Suite 2: transformToCanonical ───────────────────────────────────────────

describe('SignalIntakeAdapter — transformToCanonical', () => {
  test('returns canonical signal with all required SPEC-02 fields', () => {
    const signal = transformToCanonical(makeValidRaw());
    expect(signal.signalId).toBeDefined();
    expect(typeof signal.signalId).toBe('string');
    expect(signal.source.id).toBe('src-001');
    expect(signal.source.name).toBe('Sensor Alpha');
    expect(signal.source.trustLevel).toBe(0.85);
    expect(signal.context).toBe('Production environment — anomaly detected');
    expect(signal.whatIsHappening).toBe('Latency spike above 3σ baseline in service mesh');
    expect(signal.whatItMeans).toBe('Possible memory pressure or external dependency failure');
    expect(signal.imsState).toBe('idle');
    expect(signal.immutable).toBe(true);
  });

  test('confidence capped at 0.92', () => {
    const signal = transformToCanonical(makeValidRaw({ confidence: 0.99 }));
    expect(signal.confidence).toBe(0.92);
    expect(signal.baselineConfidence).toBe(0.92);
  });

  test('confidence below cap preserved exactly', () => {
    const signal = transformToCanonical(makeValidRaw({ confidence: 0.73 }));
    expect(signal.confidence).toBe(0.73);
    expect(signal.baselineConfidence).toBe(0.73);
  });

  test('baselineConfidence equals confidence at ingestion (immutable lock)', () => {
    const signal = transformToCanonical(makeValidRaw({ confidence: 0.65 }));
    expect(signal.baselineConfidence).toBe(signal.confidence);
  });

  test('confidenceHistory initialized with ingestion snapshot', () => {
    const signal = transformToCanonical(makeValidRaw({ confidence: 0.82 }));
    expect(signal.confidenceHistory).toHaveLength(1);
    expect(signal.confidenceHistory[0].confidence).toBe(0.82);
    expect(signal.confidenceHistory[0].source).toBe('ingestion');
    expect(signal.confidenceHistory[0].reason).toContain('baseline confidence locked');
  });

  test('evidence items have evidenceId, immutable:true, and correct sourceType', () => {
    const raw = makeValidRaw();
    const signal = transformToCanonical(raw);
    expect(signal.evidence).toHaveLength(1);
    expect(signal.evidence[0].evidenceId).toBeDefined();
    expect(signal.evidence[0].immutable).toBe(true);
    expect(signal.evidence[0].sourceType).toBe('sensor');
    expect(signal.evidence[0].source.name).toBe('LatencyMonitor');
  });

  test('ethicsGates defaulted to all-true when not provided', () => {
    const { ethicsGates: _, ...rest } = makeValidRaw();
    const signal = transformToCanonical(rest as RawSignalInput);
    expect(signal.ethicsGates.safety).toBe(true);
    expect(signal.ethicsGates.delight).toBe(true);
    expect(signal.ethicsGates.harmony).toBe(true);
  });

  test('ethicsGates preserved from input', () => {
    const signal = transformToCanonical(makeValidRaw({ ethicsGates: { safety: true, delight: false, harmony: true } }));
    expect(signal.ethicsGates.delight).toBe(false);
  });

  test('governanceEventReferences initialized as empty array', () => {
    const signal = transformToCanonical(makeValidRaw());
    expect(signal.governanceEventReferences).toEqual([]);
  });

  test('learningHistory initialized as empty array', () => {
    const signal = transformToCanonical(makeValidRaw());
    expect(signal.learningHistory).toEqual([]);
  });

  test('timestamp is valid ISO8601 UTC string', () => {
    const signal = transformToCanonical(makeValidRaw());
    expect(() => new Date(signal.timestamp)).not.toThrow();
    expect(signal.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('whitespace trimmed from string fields', () => {
    const signal = transformToCanonical(makeValidRaw({
      context: '  Situation context  ',
      whatIsHappening: '  What is happening  ',
      whatItMeans: '  What it means  ',
    }));
    expect(signal.context).toBe('Situation context');
    expect(signal.whatIsHappening).toBe('What is happening');
    expect(signal.whatItMeans).toBe('What it means');
  });
});

// ─── Suite 3: processIncomingSignal ──────────────────────────────────────────

describe('SignalIntakeAdapter — processIncomingSignal', () => {
  test('valid input returns success=true with signalId and canonical signal', () => {
    const result = processIncomingSignal(makeValidRaw());
    expect(result.success).toBe(true);
    expect(result.signalId).toBeDefined();
    expect(result.signal).toBeDefined();
    expect(result.signal!.imsState).toBe('idle');
    expect(result.signal!.immutable).toBe(true);
  });

  test('invalid input returns success=false — fail-closed', () => {
    const result = processIncomingSignal({ confidence: 2.0, evidence: [] });
    expect(result.success).toBe(false);
    expect(result.signal).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors!.length).toBeGreaterThan(0);
  });

  test('first validation error is surfaced as reason', () => {
    const result = processIncomingSignal({ ...makeValidRaw(), confidence: 1.5 });
    expect(result.success).toBe(false);
    expect(result.reason).toBe(INTAKE_ERROR_CODES.CONFIDENCE_OUT_OF_RANGE);
  });

  test('null input returns success=false', () => {
    expect(processIncomingSignal(null).success).toBe(false);
    expect(processIncomingSignal(undefined).success).toBe(false);
  });

  test('each valid input produces a unique signalId', () => {
    const a = processIncomingSignal(makeValidRaw());
    const b = processIncomingSignal(makeValidRaw());
    expect(a.signalId).not.toBe(b.signalId);
  });

  test('confidence 0.92+ is capped in returned signal', () => {
    const result = processIncomingSignal(makeValidRaw({ confidence: 0.95 }));
    expect(result.success).toBe(true);
    expect(result.signal!.confidence).toBe(0.92);
    expect(result.signal!.baselineConfidence).toBe(0.92);
  });

  test('partial input: missing multiple fields returns all errors', () => {
    const result = processIncomingSignal({ source: { id: 'x', name: 'y', trustLevel: 0.5 } });
    expect(result.success).toBe(false);
    expect(result.validationErrors!.length).toBeGreaterThanOrEqual(4);
  });
});
