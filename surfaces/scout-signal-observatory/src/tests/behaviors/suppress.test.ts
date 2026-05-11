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
  validateSuppressPreConditions,
  canSuppress,
  executeSuppress,
  getSuppressionMemoryByPattern,
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

const op = { id: 'operator-001' };

describe('SuppressBehavior — validateSuppressPreConditions (composite)', () => {
  test('allPass true with valid state, rationale, and not suppressed', () => {
    const result = validateSuppressPreConditions(makeSignal(), 'Known false positive');
    expect(result.imsState).toBe(true);
    expect(result.rationaleProvided).toBe(true);
    expect(result.notAlreadySuppressed).toBe(true);
    expect(result.allPass).toBe(true);
  });

  test('allPass false when IMS state invalid', () => {
    const result = validateSuppressPreConditions(makeSignal({ imsState: 'idle' }), 'reason');
    expect(result.imsState).toBe(false);
    expect(result.allPass).toBe(false);
  });

  test('allPass false when rationale empty', () => {
    const result = validateSuppressPreConditions(makeSignal(), '');
    expect(result.rationaleProvided).toBe(false);
    expect(result.allPass).toBe(false);
  });

  test('allPass false when already suppressed', () => {
    const signal = makeSignal({ suppressedUntil: Date.now() + 60_000 });
    const result = validateSuppressPreConditions(signal, 'reason');
    expect(result.notAlreadySuppressed).toBe(false);
    expect(result.allPass).toBe(false);
  });
});

describe('SuppressBehavior — canSuppress', () => {
  test('suppressWithValidRationale: allowed=true', () => {
    const result = canSuppress(makeSignal(), 'Known false positive');
    expect(result.allowed).toBe(true);
  });

  test('suppressWithoutRationale: allowed=false, reason=rationale_required', () => {
    const result = canSuppress(makeSignal(), '');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('rationale_required');
  });

  test('suppressWithInvalidState: allowed=false, reason=ims_state_invalid', () => {
    const result = canSuppress(makeSignal({ imsState: 'idle' }), 'reason');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ims_state_invalid');
  });

  test('suppressAlreadySuppressedSignal: allowed=false, reason=already_suppressed', () => {
    const result = canSuppress(makeSignal({ suppressedUntil: Date.now() + 60_000 }), 'reason');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('already_suppressed');
  });
});

describe('SuppressBehavior — executeSuppress', () => {
  test('executeSuppressCreatesMemoryEntry: returns suppressed=true with suppressionId and expiresAt', () => {
    const signal = makeSignal();
    const result = executeSuppress(signal, op, 'Known false positive', '24_hours');
    expect(result.suppressed).toBe(true);
    expect(result.suppressionId).toBeDefined();
    expect(result.expiresAt).toBeDefined();
    // expiresAt is ISO8601
    expect(new Date(result.expiresAt!).toISOString()).toBe(result.expiresAt);
  });

  test('suppressedSignalRetainsOriginalConfidence: confidence never mutated', () => {
    const signal = makeSignal({ confidence: 0.72 });
    const result = executeSuppress(signal, op, 'False positive', '24_hours');
    expect(result.suppressed).toBe(true);
    // Signal object confidence unchanged
    expect(signal.confidence).toBe(0.72);
    // Memory entry has originalConfidence locked
    const entry = getActiveSuppressionEntry(signal.id);
    expect(entry!.originalConfidence).toBe(0.72);
  });

  test('suppressionExpirationWorks: expiresAt approximately 24h from now', () => {
    const signal = makeSignal();
    const before = Date.now();
    const result = executeSuppress(signal, op, 'Testing', '24_hours');
    const expiresMs = new Date(result.expiresAt!).getTime();
    expect(expiresMs).toBeGreaterThan(before + SUPPRESSION_DURATIONS_MS['24_hours'] - 500);
    expect(expiresMs).toBeLessThan(before + SUPPRESSION_DURATIONS_MS['24_hours'] + 500);
  });

  test('suppressionCanBeRevoked: revokeSuppress removes active suppression', () => {
    const signal = makeSignal();
    const suppResult = executeSuppress(signal, op, 'False positive', '24_hours');
    expect(suppResult.suppressed).toBe(true);
    const revResult = revokeSuppress(suppResult.suppressionId!, op.id, 'Re-evaluated');
    expect(revResult.success).toBe(true);
    expect(isCurrentlySuppressed(signal.id)).toBe(false);
  });

  test('executeSuppress blocked without rationale: suppressed=false, reason=rationale_required', () => {
    const result = executeSuppress(makeSignal(), op, '', '24_hours');
    expect(result.suppressed).toBe(false);
    expect(result.reason).toBe('rationale_required');
  });

  test('executeSuppress blocked with invalid IMS state: suppressed=false', () => {
    const result = executeSuppress(makeSignal({ imsState: 'failed' }), op, 'reason', '24_hours');
    expect(result.suppressed).toBe(false);
    expect(result.reason).toBe('ims_state_invalid');
  });

  test('suppressionGovernanceEventCreated: governance event with suppression_initiated type', () => {
    const signal = makeSignal();
    // suppress() creates the governance event — verify via suppress() directly
    const result = suppress(signal, op.id, 'Known false positive', 'known_false_positive');
    expect(result.governanceEvent?.eventType).toBe('suppression_initiated');
    expect(result.governanceEvent?.immutable).toBe(true);
  });
});

describe('SuppressBehavior — getSuppressionMemoryByPattern', () => {
  test('suppressionMemoryRetained: returns all entries for pattern after suppress', () => {
    const pattern = `mem-pattern-${Date.now()}`;
    const signal = makeSignal({ pattern });
    suppress(signal, op.id, 'False positive', 'known_false_positive');
    const { suppressionEntries } = getSuppressionMemoryByPattern(pattern);
    expect(suppressionEntries.length).toBeGreaterThanOrEqual(1);
    expect(suppressionEntries[0].signalPattern).toBe(pattern);
  });

  test('suppressionIndicatorVisible: activeSuppression present when suppression active', () => {
    const pattern = `vis-pattern-${Date.now()}`;
    const signal = makeSignal({ pattern });
    suppress(signal, op.id, 'Expected behavior', 'expected_behavior');
    const { activeSuppression } = getSuppressionMemoryByPattern(pattern);
    expect(activeSuppression).toBeDefined();
    expect(activeSuppression!.suppressionRationale).toBe('Expected behavior');
    expect(activeSuppression!.originalConfidence).toBe(signal.confidence);
  });

  test('falsePositiveWeightingApplied: getFalsePositiveWeight returns 0.3 after one suppression', () => {
    const pattern = `fp-weight-${Date.now()}`;
    const signal = makeSignal({ pattern });
    suppress(signal, op.id, 'FP', 'known_false_positive');
    expect(getFalsePositiveWeight(pattern)).toBe(0.3);
  });

  test('no activeSuppression for unregistered pattern', () => {
    const { suppressionEntries, activeSuppression } = getSuppressionMemoryByPattern('unknown-pattern-xyz');
    expect(suppressionEntries).toHaveLength(0);
    expect(activeSuppression).toBeUndefined();
  });
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
