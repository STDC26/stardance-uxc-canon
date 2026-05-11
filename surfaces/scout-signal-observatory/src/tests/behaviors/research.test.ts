// src/tests/behaviors/research.test.ts
// CC_SCOUT_10 tests — 12+ required

import {
  triggerResearch,
  applyResearchDecision,
  validateConfidenceRangeForResearch,
  validateResearchCapability,
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
