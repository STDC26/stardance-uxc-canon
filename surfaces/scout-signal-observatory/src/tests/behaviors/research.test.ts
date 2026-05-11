// src/tests/behaviors/research.test.ts
// CC_SCOUT_10 tests — 12+ required

import {
  triggerResearch,
  applyResearchDecision,
  validateConfidenceRangeForResearch,
  validateResearchCapability,
  validateResearchPreConditions,
  canTriggerResearch,
  executeResearch,
  getResearchResults,
  applyResearchConfidenceUpdate,
  getResearchReports,
  ResearchCapability,
} from '../../behaviors/ResearchBehavior';
import { Signal } from '../../types/IMS';
import { CONFIDENCE_HARD_CAP } from '../../logic/confidence-gates';

const makeSignal = (overrides: Partial<Signal> = {}): Signal => ({
  id: `sig-res-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  type: 'anomaly',
  confidence: 0.55,
  meaning: 'Uncertain signal requiring research',
  evidence: [{ source: 'Pattern Matcher', weight: 0.55 }],
  imsState: 'partial_complete',
  timestamp: Date.now(),
  uncertainty: 0.4,
  ...overrides,
});

const defaultCap: ResearchCapability = {
  deerflowActive: true,
  vectorStoreAvailable: true,
  externalSourcesAvailable: true,
};

const op = { id: 'operator-001' };
const activeCap = { deerflowActive: true };
const inactiveCap = { deerflowActive: false };

describe('ResearchBehavior — validateResearchPreConditions (composite)', () => {
  test('allPass true with medium confidence, uncertainty, and active DeerFlow', () => {
    const result = validateResearchPreConditions(makeSignal({ confidence: 0.55, uncertainty: 0.4 }), activeCap);
    expect(result.confidenceInRange).toBe(true);
    expect(result.uncertaintyPresent).toBe(true);
    expect(result.researchAvailable).toBe(true);
    expect(result.allPass).toBe(true);
  });

  test('allPass false when confidence too high', () => {
    const result = validateResearchPreConditions(makeSignal({ confidence: 0.85 }), activeCap);
    expect(result.confidenceInRange).toBe(false);
    expect(result.allPass).toBe(false);
  });

  test('allPass false when uncertainty too low', () => {
    const result = validateResearchPreConditions(makeSignal({ uncertainty: 0.2 }), activeCap);
    expect(result.uncertaintyPresent).toBe(false);
    expect(result.allPass).toBe(false);
  });

  test('allPass false when DeerFlow inactive', () => {
    const result = validateResearchPreConditions(makeSignal(), inactiveCap);
    expect(result.researchAvailable).toBe(false);
    expect(result.allPass).toBe(false);
  });

  test('allPass false when uncertainty field absent', () => {
    const signal = makeSignal();
    const { uncertainty: _, ...noUncertainty } = signal;
    const result = validateResearchPreConditions(noUncertainty as typeof signal, activeCap);
    expect(result.uncertaintyPresent).toBe(false);
    expect(result.allPass).toBe(false);
  });
});

describe('ResearchBehavior — canTriggerResearch', () => {
  test('researchWithValidMediumConfidence: allowed=true', () => {
    const result = canTriggerResearch(makeSignal({ confidence: 0.65 }), activeCap);
    expect(result.allowed).toBe(true);
  });

  test('researchWithValidLowConfidence: allowed=true', () => {
    const result = canTriggerResearch(makeSignal({ confidence: 0.35 }), activeCap);
    expect(result.allowed).toBe(true);
  });

  test('researchWithHighConfidence: allowed=false, reason=confidence_not_in_range', () => {
    const result = canTriggerResearch(makeSignal({ confidence: 0.85 }), activeCap);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('confidence_not_in_range');
  });

  test('researchWithoutUncertainty: allowed=false, reason=uncertainty_not_present', () => {
    const result = canTriggerResearch(makeSignal({ uncertainty: 0.2 }), activeCap);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('uncertainty_not_present');
  });

  test('researchWithoutCapability: allowed=false, reason=research_capability_unavailable', () => {
    const result = canTriggerResearch(makeSignal(), inactiveCap);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('research_capability_unavailable');
  });
});

describe('ResearchBehavior — executeResearch / getResearchResults (async polling)', () => {
  test('executeResearchStartsAsync: returns immediately with researching=true and researchId', () => {
    const result = executeResearch(makeSignal({ id: `sig-exec-${Date.now()}` }), op);
    expect(result.researching).toBe(true);
    expect(result.researchId).toBeDefined();
    expect(typeof result.researchId).toBe('string');
  });

  test('researchProgressPolling: status transitions from running to complete', async () => {
    const start = executeResearch(makeSignal({ id: `sig-poll-${Date.now()}` }), op);
    expect(start.researching).toBe(true);
    if (start.researching && start.researchId) {
      const immediate = getResearchResults(start.researchId);
      expect(['running', 'complete']).toContain(immediate.status);
      await new Promise((r) => setTimeout(r, 50));
      const completed = getResearchResults(start.researchId);
      expect(completed.status).toBe('complete');
    }
  });

  test('researchReportGenerated: report has all required fields after polling', async () => {
    const start = executeResearch(makeSignal({ id: `sig-report-${Date.now()}` }), op);
    if (start.researching && start.researchId) {
      await new Promise((r) => setTimeout(r, 50));
      const { report } = getResearchResults(start.researchId);
      expect(report).toBeDefined();
      expect(report!.researchId).toBeDefined();
      expect(Array.isArray(report!.vectorResults)).toBe(true);
      expect(Array.isArray(report!.externalIntelligence)).toBe(true);
      expect(report!.synthesis).toBeDefined();
      expect(report!.confidenceRecalculation).toBeDefined();
      expect(report!.allSourcesVisible).toBe(true);
      expect(report!.operatorDecisionRequired).toBe(true);
    }
  });

  test('researchConfidenceCapEnforced: suggestedConfidence <= 0.92', async () => {
    const start = executeResearch(makeSignal({ confidence: 0.7, id: `sig-cap-${Date.now()}` }), op);
    if (start.researching && start.researchId) {
      await new Promise((r) => setTimeout(r, 50));
      const { report } = getResearchResults(start.researchId);
      expect(report!.confidenceRecalculation.cappedNewConfidence).toBeLessThanOrEqual(0.92);
    }
  });

  test('researchConfidenceNotAppliedAutomatically: autoApplied=false, original confidence unchanged', async () => {
    const signal = makeSignal({ confidence: 0.55, id: `sig-nomut-${Date.now()}` });
    const start = executeResearch(signal, op);
    if (start.researching && start.researchId) {
      await new Promise((r) => setTimeout(r, 50));
      const { report } = getResearchResults(start.researchId);
      expect(report!.confidenceRecalculation.autoApplied).toBe(false);
      expect(report!.confidenceRecalculation.operatorApprovalRequired).toBe(true);
      expect(signal.confidence).toBe(0.55); // unchanged
    }
  });

  test('executeResearch blocked when confidence too high: researching=false', () => {
    const result = executeResearch(makeSignal({ confidence: 0.85 }), op);
    expect(result.researching).toBe(false);
    expect(result.reason).toBe('confidence_not_in_range');
  });

  test('getResearchResults returns failed for unknown researchId', () => {
    const result = getResearchResults('nonexistent-id');
    expect(result.status).toBe('failed');
  });
});

describe('ResearchBehavior — applyResearchConfidenceUpdate', () => {
  test('operatorCanAcceptOrRejectNewConfidence: applyResearchConfidenceUpdate applies when operator accepts', () => {
    const signal = makeSignal();
    const result = applyResearchConfidenceUpdate(signal, 0.70, op, 'res-123');
    expect(result.applied).toBe(true);
    expect(result.newConfidence).toBe(0.70);
    expect(result.governanceEventId).toBeDefined();
  });

  test('researchGovernanceEventCreated: governance event created on acceptance', () => {
    const signal = makeSignal();
    const result = applyResearchConfidenceUpdate(signal, 0.68, op, 'res-456');
    expect(result.applied).toBe(true);
    expect(result.governanceEventId).toBeDefined();
    expect(typeof result.governanceEventId).toBe('string');
  });

  test('applyResearchConfidenceUpdate enforces 0.92 cap on input', () => {
    const signal = makeSignal();
    const result = applyResearchConfidenceUpdate(signal, 0.99, op, 'res-789');
    expect(result.applied).toBe(true);
    expect(result.newConfidence).toBe(0.92);
  });
});

describe('ResearchBehavior — Pre-condition validators', () => {
  test('validateConfidenceRangeForResearch: passes for confidence < 0.75', () => {
    expect(validateConfidenceRangeForResearch(0.74)).toBe(true);
    expect(validateConfidenceRangeForResearch(0.5)).toBe(true);
    expect(validateConfidenceRangeForResearch(0.0)).toBe(true);
  });

  test('validateConfidenceRangeForResearch: fails for confidence >= 0.75', () => {
    expect(validateConfidenceRangeForResearch(0.75)).toBe(false);
    expect(validateConfidenceRangeForResearch(0.85)).toBe(false);
    expect(validateConfidenceRangeForResearch(0.92)).toBe(false);
  });

  test('validateResearchCapability: passes when deerflowActive=true', () => {
    expect(validateResearchCapability({ deerflowActive: true, vectorStoreAvailable: true, externalSourcesAvailable: true })).toBe(true);
  });

  test('validateResearchCapability: fails when deerflowActive=false', () => {
    expect(validateResearchCapability({ deerflowActive: false, vectorStoreAvailable: true, externalSourcesAvailable: true })).toBe(false);
  });
});

describe('ResearchBehavior — Runtime sequence', () => {
  test('triggerResearch with valid signal: returns research complete report', async () => {
    const signal = makeSignal();
    const result = await triggerResearch(signal, 'operator-001', defaultCap);
    expect(result.allowed).toBe(true);
    expect(result.report).toBeDefined();
    expect(result.report!.stage).toBe('research_complete');
  });

  test('triggerResearch with HIGH confidence: blocked', async () => {
    const signal = makeSignal({ confidence: 0.85 });
    const result = await triggerResearch(signal, 'operator-001', defaultCap);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('confidence_not_in_medium_low_range');
  });

  test('triggerResearch without deerflow: blocked', async () => {
    const signal = makeSignal();
    const result = await triggerResearch(signal, 'operator-001', {
      deerflowActive: false,
      vectorStoreAvailable: false,
      externalSourcesAvailable: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('deerflow_not_active');
  });

  test('vector retrieval returns results', async () => {
    const signal = makeSignal();
    const result = await triggerResearch(signal, 'operator-001', defaultCap);
    expect(result.report!.vectorResults.length).toBeGreaterThan(0);
  });

  test('external intelligence sources returned', async () => {
    const signal = makeSignal();
    const result = await triggerResearch(signal, 'operator-001', defaultCap);
    expect(result.report!.externalIntelligence.length).toBeGreaterThan(0);
    expect(result.report!.allSourcesVisible).toBe(true);
  });

  test('synthesis generated with all components', async () => {
    const signal = makeSignal();
    const result = await triggerResearch(signal, 'operator-001', defaultCap);
    const synthesis = result.report!.synthesis;
    expect(synthesis.evidenceSynthesis).toBeDefined();
    expect(synthesis.patternSynthesis).toBeDefined();
    expect(synthesis.alternativeHypotheses).toBeDefined();
  });

  test('confidence recalculation is NOT auto-applied', async () => {
    const signal = makeSignal({ confidence: 0.55 });
    const result = await triggerResearch(signal, 'operator-001', defaultCap);
    expect(result.report!.confidenceRecalculation.autoApplied).toBe(false);
    expect(result.report!.confidenceRecalculation.operatorApprovalRequired).toBe(true);
    expect(signal.confidence).toBe(0.55); // unchanged
  });

  test('confidence cap 0.92 enforced on recalculation', async () => {
    const signal = makeSignal({ confidence: 0.7 });
    const result = await triggerResearch(signal, 'operator-001', defaultCap);
    expect(result.report!.confidenceRecalculation.cappedNewConfidence).toBeLessThanOrEqual(CONFIDENCE_HARD_CAP);
  });

  test('operator can accept new confidence', async () => {
    const signal = makeSignal();
    const resResult = await triggerResearch(signal, 'operator-001', defaultCap);
    const decision = applyResearchDecision(resResult.report!.researchId, signal, 'operator-001', true);
    expect(decision.accepted).toBe(true);
    expect(decision.appliedConfidence).toBeDefined();
    expect(decision.governanceEvent.eventType).toBe('research_confidence_accepted');
  });

  test('operator can reject new confidence', async () => {
    const signal = makeSignal();
    const resResult = await triggerResearch(signal, 'operator-001', defaultCap);
    const decision = applyResearchDecision(resResult.report!.researchId, signal, 'operator-001', false);
    expect(decision.accepted).toBe(false);
    expect(decision.appliedConfidence).toBeUndefined();
    expect(decision.governanceEvent.eventType).toBe('research_confidence_rejected');
  });

  test('research report persisted to store', async () => {
    const signal = makeSignal({ id: 'sig-res-persist-001' });
    await triggerResearch(signal, 'operator-001', defaultCap);
    const reports = getResearchReports();
    const found = reports.some((r) => r.signalId === 'sig-res-persist-001');
    expect(found).toBe(true);
  });

  test('research governance event is immutable with correct gates checked', async () => {
    const signal = makeSignal();
    const result = await triggerResearch(signal, 'operator-001', defaultCap);
    expect(result.governanceEvent?.immutable).toBe(true);
    expect(result.governanceEvent?.governanceGatesChecked).toContain('confidence_cap_0.92_maintained');
    expect(result.governanceEvent?.actionDetails['autoApplied']).toBe(false);
  });
});
