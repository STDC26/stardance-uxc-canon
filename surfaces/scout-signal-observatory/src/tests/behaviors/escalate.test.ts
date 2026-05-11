// src/tests/behaviors/escalate.test.ts
// CC_SCOUT_07 tests — 8+ required

import {
  escalate,
  withdrawEscalation,
  validateConfidenceForEscalation,
  validateEthicsGatesForEscalation,
  validateSignalCompletenessForEscalation,
  validateEscalatePreConditions,
  canEscalate,
  executeEscalate,
  getAuditLog,
  getEscalationRecords,
} from '../../behaviors/EscalateBehavior';
import { Signal, EthicsGates } from '../../types/IMS';

const makeSignal = (overrides: Partial<Signal> = {}): Signal => ({
  id: 'sig-001',
  type: 'anomaly',
  confidence: 0.85,
  meaning: 'Significant pattern deviation detected',
  evidence: [{ source: 'Pattern Matcher', weight: 0.85 }],
  imsState: 'complete',
  timestamp: Date.now(),
  ethicsGates: { safety: true, delight: true, harmony: true },
  ...overrides,
});

describe('EscalateBehavior — Pre-condition validators', () => {
  test('validateConfidenceForEscalation: returns true for confidence >= 0.75', () => {
    expect(validateConfidenceForEscalation(0.75)).toBe(true);
    expect(validateConfidenceForEscalation(0.85)).toBe(true);
    expect(validateConfidenceForEscalation(0.92)).toBe(true);
  });

  test('validateConfidenceForEscalation: returns false for confidence < 0.75', () => {
    expect(validateConfidenceForEscalation(0.74)).toBe(false);
    expect(validateConfidenceForEscalation(0.5)).toBe(false);
    expect(validateConfidenceForEscalation(0.0)).toBe(false);
  });

  test('validateEthicsGatesForEscalation: returns true when all gates pass', () => {
    const gates: EthicsGates = { safety: true, delight: true, harmony: true };
    expect(validateEthicsGatesForEscalation(gates)).toBe(true);
  });

  test('validateEthicsGatesForEscalation: returns false when any gate fails', () => {
    expect(validateEthicsGatesForEscalation({ safety: false, delight: true, harmony: true })).toBe(false);
    expect(validateEthicsGatesForEscalation({ safety: true, delight: false, harmony: true })).toBe(false);
    expect(validateEthicsGatesForEscalation({ safety: true, delight: true, harmony: false })).toBe(false);
    expect(validateEthicsGatesForEscalation({ safety: false, delight: false, harmony: false })).toBe(false);
  });

  test('validateSignalCompletenessForEscalation: passes with complete signal', () => {
    expect(validateSignalCompletenessForEscalation(makeSignal())).toBe(true);
  });

  test('validateSignalCompletenessForEscalation: fails with missing meaning', () => {
    expect(validateSignalCompletenessForEscalation(makeSignal({ meaning: '' }))).toBe(false);
  });

  test('validateSignalCompletenessForEscalation: fails with empty evidence', () => {
    expect(validateSignalCompletenessForEscalation(makeSignal({ evidence: [] }))).toBe(false);
  });
});

describe('EscalateBehavior — Runtime sequence', () => {
  test('escalateWithValidConditions: allowed=true, returns escalated_pending_approval state', () => {
    const signal = makeSignal();
    const result = escalate(signal, 'operator-001');
    expect(result.allowed).toBe(true);
    expect(result.newState).toBe('escalated_pending_approval');
    expect(result.operatorFeedback).toContain('Awaiting human approval');
  });

  test('escalateWithConfidenceBelowThreshold: blocked with reason confidence_below_threshold', () => {
    const signal = makeSignal({ confidence: 0.6 });
    const result = escalate(signal, 'operator-001');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('confidence_below_threshold');
    expect(result.newState).toBeUndefined();
  });

  test('escalateWithFailedEthicsGate: blocked with reason ethics_gate_failed', () => {
    const signal = makeSignal({
      ethicsGates: { safety: false, delight: true, harmony: true },
    });
    const result = escalate(signal, 'operator-001');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ethics_gate_failed');
  });

  test('escalateWithIncompleteSignal: blocked with reason signal_incomplete', () => {
    const signal = makeSignal({ evidence: [] });
    const result = escalate(signal, 'operator-001');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('signal_incomplete');
  });

  test('escalationEventImmutable: governance event has immutable:true', () => {
    const signal = makeSignal();
    const result = escalate(signal, 'operator-001');
    expect(result.allowed).toBe(true);
    expect(result.governanceEvent?.immutable).toBe(true);
    expect(result.governanceEvent?.eventType).toBe('escalation_initiated');
  });

  test('escalationAuditTrailCreated: event persisted in audit log', () => {
    const signal = makeSignal({ id: 'sig-audit-001' });
    escalate(signal, 'operator-001');
    const log = getAuditLog();
    const found = log.some((e) => e.signalId === 'sig-audit-001' && e.eventType === 'escalation_initiated');
    expect(found).toBe(true);
  });

  test('escalation record persisted with approval history', () => {
    const signal = makeSignal({ id: 'sig-record-001' });
    const result = escalate(signal, 'operator-001');
    expect(result.allowed).toBe(true);
    const records = getEscalationRecords();
    const record = records.find((r) => r.signalId === 'sig-record-001');
    expect(record).toBeDefined();
    expect(record!.approvalHistory).toHaveLength(1);
    expect(record!.approvalHistory[0].action).toBe('pending');
  });

  test('escalation locks confidence at time of escalation', () => {
    const signal = makeSignal({ confidence: 0.88 });
    const result = escalate(signal, 'operator-001');
    expect(result.governanceEvent?.signalConfidenceAtEvent).toBe(0.88);
  });
});

describe('EscalateBehavior — validateEscalatePreConditions (composite)', () => {
  test('allPass true when all conditions met', () => {
    const gates: EthicsGates = { safety: true, delight: true, harmony: true };
    const result = validateEscalatePreConditions(makeSignal(), gates);
    expect(result.confidence).toBe(true);
    expect(result.ethicsGates).toBe(true);
    expect(result.completeness).toBe(true);
    expect(result.allPass).toBe(true);
  });

  test('allPass false when confidence below threshold', () => {
    const gates: EthicsGates = { safety: true, delight: true, harmony: true };
    const result = validateEscalatePreConditions(makeSignal({ confidence: 0.5 }), gates);
    expect(result.confidence).toBe(false);
    expect(result.allPass).toBe(false);
  });

  test('allPass false when ethics gate fails', () => {
    const gates: EthicsGates = { safety: false, delight: true, harmony: true };
    const result = validateEscalatePreConditions(makeSignal(), gates);
    expect(result.ethicsGates).toBe(false);
    expect(result.allPass).toBe(false);
  });

  test('allPass false when signal incomplete', () => {
    const gates: EthicsGates = { safety: true, delight: true, harmony: true };
    const result = validateEscalatePreConditions(makeSignal({ evidence: [] }), gates);
    expect(result.completeness).toBe(false);
    expect(result.allPass).toBe(false);
  });
});

describe('EscalateBehavior — canEscalate', () => {
  test('escalateWithValidHighConfidenceAndAllGatesPassing: allowed=true', () => {
    const gates: EthicsGates = { safety: true, delight: true, harmony: true };
    const result = canEscalate(makeSignal({ confidence: 0.85 }), gates);
    expect(result.allowed).toBe(true);
  });

  test('escalateWithConfidenceBelowThreshold: allowed=false, reason=confidence_below_threshold', () => {
    const gates: EthicsGates = { safety: true, delight: true, harmony: true };
    const result = canEscalate(makeSignal({ confidence: 0.65 }), gates);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('confidence_below_threshold');
  });

  test('escalateWithFailedSafetyGate: allowed=false, reason=ethics_gate_failed', () => {
    const result = canEscalate(makeSignal(), { safety: false, delight: true, harmony: true });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ethics_gate_failed');
  });

  test('escalateWithFailedDelightGate: allowed=false, reason=ethics_gate_failed', () => {
    const result = canEscalate(makeSignal(), { safety: true, delight: false, harmony: true });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ethics_gate_failed');
  });

  test('escalateWithFailedHarmonyGate: allowed=false, reason=ethics_gate_failed', () => {
    const result = canEscalate(makeSignal(), { safety: true, delight: true, harmony: false });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ethics_gate_failed');
  });

  test('escalateWithIncompleteSignal: allowed=false, reason=signal_incomplete', () => {
    const gates: EthicsGates = { safety: true, delight: true, harmony: true };
    const result = canEscalate(makeSignal({ meaning: '' }), gates);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('signal_incomplete');
  });
});

describe('EscalateBehavior — executeEscalate (direct bypass prevention)', () => {
  const op = { id: 'operator-001' };
  const allPass: EthicsGates = { safety: true, delight: true, harmony: true };

  test('executed=false, no governance event when confidence < 0.75', () => {
    const logBefore = getAuditLog().length;
    const result = executeEscalate(makeSignal({ confidence: 0.6 }), op, allPass);
    expect(result.executed).toBe(false);
    expect(result.reason).toBe('confidence_below_threshold');
    expect(result.governanceEventId).toBeUndefined();
    expect(getAuditLog().length).toBe(logBefore); // no new event
  });

  test('executed=false, no governance event when ethics gate fails', () => {
    const logBefore = getAuditLog().length;
    const result = executeEscalate(makeSignal(), op, { safety: false, delight: true, harmony: true });
    expect(result.executed).toBe(false);
    expect(result.reason).toBe('ethics_gate_failed');
    expect(result.governanceEventId).toBeUndefined();
    expect(getAuditLog().length).toBe(logBefore);
  });

  test('executed=false, no governance event when signal missing fields', () => {
    const logBefore = getAuditLog().length;
    const result = executeEscalate(makeSignal({ evidence: [] }), op, allPass);
    expect(result.executed).toBe(false);
    expect(result.reason).toBe('signal_incomplete');
    expect(result.governanceEventId).toBeUndefined();
    expect(getAuditLog().length).toBe(logBefore);
  });

  test('executed=true with governance event when all checks pass', () => {
    const logBefore = getAuditLog().length;
    const result = executeEscalate(makeSignal({ id: 'sig-execute-001' }), op, allPass);
    expect(result.executed).toBe(true);
    expect(result.escalationState).toBe('escalated_pending_approval');
    expect(result.governanceEventId).toBeDefined();
    expect(getAuditLog().length).toBeGreaterThan(logBefore);
  });

  test('ethics gates re-validated at execution boundary even if passed to canEscalate first', () => {
    // Simulate bypass attempt: canEscalate passes, then gates change before executeEscalate
    const gates: EthicsGates = { safety: true, delight: true, harmony: true };
    const allowed = canEscalate(makeSignal(), gates);
    expect(allowed.allowed).toBe(true);

    // Gates change — executeEscalate MUST re-validate and block
    const changedGates: EthicsGates = { safety: false, delight: true, harmony: true };
    const result = executeEscalate(makeSignal(), op, changedGates);
    expect(result.executed).toBe(false);
    expect(result.reason).toBe('ethics_gate_failed');
  });
});

describe('EscalateBehavior — Withdrawal', () => {
  test('withdraw escalation creates withdrawal record', () => {
    const signal = makeSignal({ id: 'sig-withdraw-001' });
    escalate(signal, 'operator-001');
    const records = getEscalationRecords();
    const record = records.find((r) => r.signalId === 'sig-withdraw-001');
    expect(record).toBeDefined();

    const withdrawResult = withdrawEscalation(record!.escalationId, 'operator-001', 'Re-evaluating');
    expect(withdrawResult.success).toBe(true);
    expect(record!.withdrawn).toBe(true);
  });

  test('withdraw non-existent escalation returns not_found', () => {
    const result = withdrawEscalation('nonexistent-id', 'operator-001', 'reason');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('escalation_not_found');
  });
});
