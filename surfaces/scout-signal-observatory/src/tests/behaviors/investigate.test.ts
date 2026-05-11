// src/tests/behaviors/investigate.test.ts
// CC_SCOUT_08 tests — 10+ required

import {
  investigate,
  checkInvestigationPreConditions,
  validateIMSStateForInvestigation,
  validateEvidencePoolForInvestigation,
  validateSignalForInvestigation,
  getInvestigationReports,
} from '../../behaviors/InvestigateBehavior';
import { Signal } from '../../types/IMS';

const makeSignal = (overrides: Partial<Signal> = {}): Signal => ({
  id: 'sig-inv-001',
  type: 'anomaly',
  confidence: 0.65,
  meaning: 'Moderate pattern anomaly detected',
  evidence: [{ source: 'Pattern Matcher', weight: 0.65 }],
  imsState: 'complete',
  timestamp: Date.now(),
  operatorDecision: 'investigate',
  ...overrides,
});

describe('InvestigateBehavior — Pre-condition validators', () => {
  test('validateIMSStateForInvestigation: accepts complete and partial_complete', () => {
    expect(validateIMSStateForInvestigation('complete')).toBe(true);
    expect(validateIMSStateForInvestigation('partial_complete')).toBe(true);
  });

  test('validateIMSStateForInvestigation: rejects other states', () => {
    expect(validateIMSStateForInvestigation('idle')).toBe(false);
    expect(validateIMSStateForInvestigation('processing')).toBe(false);
    expect(validateIMSStateForInvestigation('failed')).toBe(false);
  });

  test('validateEvidencePoolForInvestigation: passes with 1+ evidence sources', () => {
    expect(validateEvidencePoolForInvestigation([{ source: 'test', weight: 0.5 }])).toBe(true);
    expect(validateEvidencePoolForInvestigation([{ source: 'a', weight: 0.5 }, { source: 'b', weight: 0.5 }])).toBe(true);
  });

  test('validateEvidencePoolForInvestigation: fails with empty pool', () => {
    expect(validateEvidencePoolForInvestigation([])).toBe(false);
    expect(validateEvidencePoolForInvestigation(undefined as unknown as [])).toBe(false);
  });

  test('validateSignalForInvestigation: passes with valid signal fields', () => {
    expect(validateSignalForInvestigation(makeSignal())).toBe(true);
  });

  test('validateSignalForInvestigation: fails with missing meaning', () => {
    expect(validateSignalForInvestigation(makeSignal({ meaning: '' }))).toBe(false);
  });

  test('checkInvestigationPreConditions: all-pass returns allowed=true', () => {
    const result = checkInvestigationPreConditions(makeSignal());
    expect(result.allowed).toBe(true);
    expect(result.failedChecks).toHaveLength(0);
  });

  test('checkInvestigationPreConditions: returns failed checks when blocked', () => {
    const signal = makeSignal({ evidence: [], imsState: 'idle' });
    const result = checkInvestigationPreConditions(signal);
    expect(result.allowed).toBe(false);
    expect(result.failedChecks).toContain('ims_state_valid');
    expect(result.failedChecks).toContain('evidence_available');
  });
});

describe('InvestigateBehavior — Runtime sequence', () => {
  test('investigateWithValidEvidence: returns report', async () => {
    const signal = makeSignal();
    const result = await investigate(signal, 'operator-001');
    expect(result.allowed).toBe(true);
    expect(result.report).toBeDefined();
    expect(result.report!.signalId).toBe(signal.id);
    expect(result.newState).toBe('investigating');
  });

  test('investigateWithNoEvidence: blocked', async () => {
    const signal = makeSignal({ evidence: [] });
    const result = await investigate(signal, 'operator-001');
    expect(result.allowed).toBe(false);
  });

  test('investigationDoesNotMutateConfidence: report shows confidenceAutoUpdated=false', async () => {
    const signal = makeSignal({ confidence: 0.65 });
    const result = await investigate(signal, 'operator-001');
    expect(result.allowed).toBe(true);
    expect(result.report!.confidenceAutoUpdated).toBe(false);
    expect(result.report!.baselineConfidence).toBe(0.65);
  });

  test('operatorReviewRequired: report flags operatorDecisionRequired=true', async () => {
    const signal = makeSignal();
    const result = await investigate(signal, 'operator-001');
    expect(result.report!.operatorDecisionRequired).toBe(true);
  });

  test('investigateDetectsContradictions: high uncertainty produces contradictions', async () => {
    const signal = makeSignal({ uncertainty: 0.6 });
    const result = await investigate(signal, 'operator-001');
    expect(result.allowed).toBe(true);
    expect(result.report!.contradictions.length).toBeGreaterThan(0);
    expect(result.report!.alternativeHypotheses.length).toBeGreaterThan(0);
  });

  test('investigation report has all required fields', async () => {
    const signal = makeSignal();
    const result = await investigate(signal, 'operator-001');
    const report = result.report!;
    expect(report.investigationId).toBeDefined();
    expect(report.historicalSignals).toBeDefined();
    expect(report.patternCorrelations).toBeDefined();
    expect(report.contextEnrichment).toBeDefined();
    expect(report.suggestedActions.length).toBeGreaterThan(0);
  });

  test('investigation governance event is immutable', async () => {
    const signal = makeSignal();
    const result = await investigate(signal, 'operator-001');
    expect(result.governanceEvent?.immutable).toBe(true);
    expect(result.governanceEvent?.actionDetails['confidenceNotMutated']).toBe(true);
  });

  test('investigation report persisted to store', async () => {
    const signal = makeSignal({ id: 'sig-inv-persist-001' });
    await investigate(signal, 'operator-001');
    const reports = getInvestigationReports();
    const found = reports.some((r) => r.signalId === 'sig-inv-persist-001');
    expect(found).toBe(true);
  });

  test('investigation from partial_complete state is allowed', async () => {
    const signal = makeSignal({ imsState: 'partial_complete', confidence: 0.55 });
    const result = await investigate(signal, 'operator-001');
    expect(result.allowed).toBe(true);
  });

  test('investigation from failed state is blocked', async () => {
    const signal = makeSignal({ imsState: 'failed' });
    const result = await investigate(signal, 'operator-001');
    expect(result.allowed).toBe(false);
  });
});
