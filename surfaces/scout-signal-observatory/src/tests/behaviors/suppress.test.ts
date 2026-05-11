// src/tests/behaviors/suppress.test.ts
// CC_SCOUT_09 tests — 8+ required

import {
  suppress,
  revokeSuppress,
  isCurrentlySuppressed,
  getActiveSuppressionEntry,
  getFalsePositiveWeight,
  validateIMSStateForSuppression,
  validateRationaleForSuppression,
  validateNotAlreadySuppressed,
  SUPPRESSION_DURATIONS_MS,
} from '../../behaviors/SuppressBehavior';
import { Signal } from '../../types/IMS';

const makeSignal = (overrides: Partial<Signal> = {}): Signal => ({
  id: `sig-sup-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  type: 'anomaly',
  confidence: 0.65,
  meaning: 'Known pattern — low priority',
  evidence: [{ source: 'Pattern Matcher', weight: 0.65 }],
  imsState: 'complete',
  timestamp: Date.now(),
  pattern: 'test-pattern',
  ...overrides,
});

describe('SuppressBehavior — Pre-condition validators', () => {
  test('validateIMSStateForSuppression: accepts complete and partial_complete', () => {
    expect(validateIMSStateForSuppression('complete')).toBe(true);
    expect(validateIMSStateForSuppression('partial_complete')).toBe(true);
  });

  test('validateIMSStateForSuppression: rejects other states', () => {
    expect(validateIMSStateForSuppression('idle')).toBe(false);
    expect(validateIMSStateForSuppression('failed')).toBe(false);
  });

  test('validateRationaleForSuppression: passes with non-empty string', () => {
    expect(validateRationaleForSuppression('known_false_positive')).toBe(true);
    expect(validateRationaleForSuppression('test rationale')).toBe(true);
  });

  test('validateRationaleForSuppression: fails with empty string', () => {
    expect(validateRationaleForSuppression('')).toBe(false);
    expect(validateRationaleForSuppression('   ')).toBe(false);
  });

  test('validateNotAlreadySuppressed: returns true when not suppressed', () => {
    expect(validateNotAlreadySuppressed(makeSignal())).toBe(true);
  });

  test('validateNotAlreadySuppressed: returns false when suppressedUntil is in future', () => {
    const signal = makeSignal({ suppressedUntil: Date.now() + 60_000 });
    expect(validateNotAlreadySuppressed(signal)).toBe(false);
  });
});

describe('SuppressBehavior — Runtime sequence', () => {
  test('suppress with valid conditions: allowed=true, returns suppressed_with_memory state', () => {
    const signal = makeSignal();
    const result = suppress(signal, 'operator-001', 'Known false positive', 'known_false_positive');
    expect(result.allowed).toBe(true);
    expect(result.newState).toBe('suppressed_with_memory');
    expect(result.operatorFeedback).toContain('suppressed');
  });

  test('suppress without rationale: blocked', () => {
    const signal = makeSignal();
    const result = suppress(signal, 'operator-001', '');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('rationale_missing');
  });

  test('suppress with invalid IMS state: blocked', () => {
    const signal = makeSignal({ imsState: 'idle' });
    const result = suppress(signal, 'operator-001', 'testing');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('ims_state_invalid');
  });

  test('suppress preserves original confidence — never mutated', () => {
    const signal = makeSignal({ confidence: 0.72 });
    const result = suppress(signal, 'operator-001', 'Known pattern');
    expect(result.allowed).toBe(true);
    expect(result.suppressionEntry!.originalConfidence).toBe(0.72);
    // Signal confidence unchanged
    expect(signal.confidence).toBe(0.72);
  });

  test('suppression expiration configured correctly for 24_hours', () => {
    const signal = makeSignal();
    const before = Date.now();
    const result = suppress(signal, 'operator-001', 'testing', 'testing_signal', '24_hours');
    const after = Date.now();
    expect(result.suppressionEntry!.suppressionExpiration).toBeGreaterThan(
      before + SUPPRESSION_DURATIONS_MS['24_hours'] - 100
    );
    expect(result.suppressionEntry!.suppressionExpiration).toBeLessThan(
      after + SUPPRESSION_DURATIONS_MS['24_hours'] + 100
    );
  });

  test('suppression expiration for 7_days', () => {
    const signal = makeSignal();
    const result = suppress(signal, 'operator-001', 'week-long suppress', 'expected_behavior', '7_days');
    expect(result.suppressionEntry!.suppressionExpiration).toBeGreaterThan(Date.now() + SUPPRESSION_DURATIONS_MS['7_days'] - 1000);
  });

  test('isCurrentlySuppressed returns true after suppress', () => {
    const signal = makeSignal();
    suppress(signal, 'operator-001', 'Test');
    expect(isCurrentlySuppressed(signal.id)).toBe(true);
  });

  test('revokeSuppress: operator can revoke suppression anytime', () => {
    const signal = makeSignal();
    const suppressResult = suppress(signal, 'operator-001', 'False positive');
    expect(suppressResult.allowed).toBe(true);

    const entry = getActiveSuppressionEntry(signal.id);
    expect(entry).toBeDefined();

    const revokeResult = revokeSuppress(entry!.suppressionId, 'operator-001', 'Re-evaluated');
    expect(revokeResult.success).toBe(true);
    expect(isCurrentlySuppressed(signal.id)).toBe(false);
  });

  test('revoke non-existent suppression returns not_found', () => {
    const result = revokeSuppress('nonexistent-id', 'operator-001', 'reason');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('suppression_not_found');
  });

  test('false positive weight accumulated across suppressions', () => {
    const pattern = `fp-pattern-${Date.now()}`;
    const signal1 = makeSignal({ pattern });
    suppress(signal1, 'operator-001', 'FP1', 'known_false_positive', '24_hours');
    const weight = getFalsePositiveWeight(pattern);
    expect(weight).toBe(0.3);
  });

  test('suppression governance event is immutable and captures rationale', () => {
    const signal = makeSignal();
    const result = suppress(signal, 'operator-001', 'Testing false positive');
    expect(result.governanceEvent?.immutable).toBe(true);
    expect(result.governanceEvent?.rationale).toBe('Testing false positive');
    expect(result.governanceEvent?.actionDetails['originalConfidencePreserved']).toBe(signal.confidence);
  });
});
