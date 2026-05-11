// src/tests/behaviors/investigate.test.ts
// CC_SCOUT_08 tests — 10+ required

import {
  investigate,
  checkInvestigationPreConditions,
  validateIMSStateForInvestigation,
  validateEvidencePoolForInvestigation,
  validateSignalForInvestigation,
  validateInvestigatePreConditions,
  canInvestigate,
  executeInvestigate,
  getInvestigationResults,
  getInvestigationReports,
  EvidenceSource,
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

const evidencePool: EvidenceSource[] = [{ source: 'Pattern Matcher', weight: 0.65 }];
const emptyPool: EvidenceSource[] = [];

describe('InvestigateBehavior — validateInvestigatePreConditions (composite)', () => {
  test('allPass true with valid state and evidence', () => {
    const result = validateInvestigatePreConditions(makeSignal(), evidencePool);
    expect(result.imsState).toBe(true);
    expect(result.evidenceAvailable).toBe(true);
    expect(result.allPass).toBe(true);
  });

  test('allPass false with invalid IMS state', () => {
    const result = validateInvestigatePreConditions(makeSignal({ imsState: 'idle' }), evidencePool);
    expect(result.imsState).toBe(false);
    expect(result.allPass).toBe(false);
  });

  test('allPass false with empty evidence pool', () => {
    const result = validateInvestigatePreConditions(makeSignal(), emptyPool);
    expect(result.evidenceAvailable).toBe(false);
    expect(result.allPass).toBe(false);
  });
});

describe('InvestigateBehavior — canInvestigate', () => {
  test('investigateWithValidEvidencePool: allowed=true', () => {
    const result = canInvestigate(makeSignal(), evidencePool);
    expect(result.allowed).toBe(true);
  });

  test('investigateWithNoEvidence: allowed=false, reason=evidence_pool_empty', () => {
    const result = canInvestigate(makeSignal(), emptyPool);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('evidence_pool_empty');
  });

  test('investigateWithInvalidState: allowed=false, reason=ims_state_invalid', () => {
    const result = canInvestigate(makeSignal({ imsState: 'idle' }), evidencePool);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ims_state_invalid');
  });

  test('investigateWithInvalidState: validating also blocked', () => {
    const result = canInvestigate(makeSignal({ imsState: 'validating' }), evidencePool);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ims_state_invalid');
  });
});

describe('InvestigateBehavior — executeInvestigate / getInvestigationResults (async polling)', () => {
  test('investigationCompletesAsync: executeInvestigate returns immediately with investigationId', () => {
    const result = executeInvestigate(makeSignal({ id: 'sig-async-001' }), evidencePool);
    expect(result.executing).toBe(true);
    if (result.executing) {
      expect(result.investigationId).toBeDefined();
      expect(typeof result.investigationId).toBe('string');
    }
  });

  test('getInvestigationResults returns running status immediately after start', () => {
    const start = executeInvestigate(makeSignal({ id: 'sig-poll-001' }), evidencePool);
    expect(start.executing).toBe(true);
    if (start.executing) {
      const pollResult = getInvestigationResults(start.investigationId);
      // Could be running or complete (microtask may have resolved)
      expect(['running', 'complete']).toContain(pollResult.status);
    }
  });

  test('getInvestigationResults returns complete with report after awaiting', async () => {
    const start = executeInvestigate(makeSignal({ id: 'sig-complete-001' }), evidencePool);
    expect(start.executing).toBe(true);
    if (start.executing) {
      // Allow the fire-and-forget promise to resolve
      await new Promise((r) => setTimeout(r, 50));
      const pollResult = getInvestigationResults(start.investigationId);
      expect(pollResult.status).toBe('complete');
      expect(pollResult.report).toBeDefined();
      expect(pollResult.report!.signalId).toBe('sig-complete-001');
    }
  });

  test('investigationReportGeneratedCorrectly: report has all schema fields', async () => {
    const start = executeInvestigate(makeSignal({ id: 'sig-schema-001' }), evidencePool);
    if (start.executing) {
      await new Promise((r) => setTimeout(r, 50));
      const { report } = getInvestigationResults(start.investigationId);
      expect(report).toBeDefined();
      expect(report!.investigationId).toBeDefined();
      expect(report!.baselineConfidence).toBeDefined();
      expect(Array.isArray(report!.historicalSignals)).toBe(true);
      expect(Array.isArray(report!.patternCorrelations)).toBe(true);
      expect(report!.contextEnrichment).toBeDefined();
      expect(Array.isArray(report!.contradictions)).toBe(true);
      expect(Array.isArray(report!.suggestedActions)).toBe(true);
    }
  });

  test('investigationDoesNotMutateConfidence: confidenceAutoUpdated=false, baseline locked', async () => {
    const start = executeInvestigate(makeSignal({ id: 'sig-nomut-001', confidence: 0.65 }), evidencePool);
    if (start.executing) {
      await new Promise((r) => setTimeout(r, 50));
      const { report } = getInvestigationResults(start.investigationId);
      expect(report!.confidenceAutoUpdated).toBe(false);
      expect(report!.baselineConfidence).toBe(0.65);
      expect(report!.operatorDecisionRequired).toBe(true);
    }
  });

  test('executeInvestigate blocked when evidence pool empty: executing=false', () => {
    const result = executeInvestigate(makeSignal(), emptyPool);
    expect(result.executing).toBe(false);
  });

  test('executeInvestigate blocked when IMS state invalid: executing=false', () => {
    const result = executeInvestigate(makeSignal({ imsState: 'failed' }), evidencePool);
    expect(result.executing).toBe(false);
  });

  test('getInvestigationResults returns failed for unknown id', () => {
    const result = getInvestigationResults('nonexistent-id');
    expect(result.status).toBe('failed');
  });

  test('investigationShallowVsDeep: both produce valid reports', async () => {
    const shallow = executeInvestigate(makeSignal({ id: 'sig-shallow-001' }), evidencePool);
    const deep = executeInvestigate(makeSignal({ id: 'sig-deep-001' }), [
      { source: 'Pattern Matcher', weight: 0.7 },
      { source: 'Context Engine', weight: 0.6 },
      { source: 'Historical DB', weight: 0.5 },
    ]);
    await new Promise((r) => setTimeout(r, 50));
    if (shallow.executing && deep.executing) {
      expect(getInvestigationResults(shallow.investigationId).status).toBe('complete');
      expect(getInvestigationResults(deep.investigationId).status).toBe('complete');
    }
  });

  test('operatorActionOptionsPresented: suggestedActions is non-empty', async () => {
    const start = executeInvestigate(makeSignal({ id: 'sig-actions-001' }), evidencePool);
    if (start.executing) {
      await new Promise((r) => setTimeout(r, 50));
      const { report } = getInvestigationResults(start.investigationId);
      expect(report!.suggestedActions.length).toBeGreaterThan(0);
    }
  });
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
