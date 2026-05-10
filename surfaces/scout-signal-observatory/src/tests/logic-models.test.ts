// CC_SCOUT_09 — logic-models.test.ts
// Tests for interpretation-model, evidence-model, trust-model, decision-model,
// uxc-enforcement, formatters, validators

import { InterpretationModel, interpretationModel } from '../logic/interpretation-model';
import { EvidenceModel, evidenceModel } from '../logic/evidence-model';
import { TrustModel } from '../logic/trust-model';
import { DecisionModel } from '../logic/decision-model';
import { checkUXCCompliance } from '../logic/uxc-enforcement';
import { formatConfidencePercent, formatTimestamp, truncate } from '../utils/formatters';
import { isValidSignalInput, isValidConfidence } from '../utils/validators';
import { EvidenceSource, EvidenceTrace } from '../types/Evidence';

// --- InterpretationModel ---
describe('InterpretationModel', () => {
  let model: InterpretationModel;
  beforeEach(() => { model = new InterpretationModel(); });

  test('interprets anomaly with high confidence as high urgency + escalate', () => {
    const r = model.interpret('anomaly', 0.82);
    expect(r.urgency).toBe('high');
    expect(r.recommendedAction).toContain('Escalate');
    expect(r.meaning).toContain('baseline operational behaviour');
  });

  test('interprets anomaly with low confidence as medium urgency + collect evidence', () => {
    const r = model.interpret('anomaly', 0.60);
    expect(r.urgency).toBe('medium');
    expect(r.recommendedAction).toContain('Collect');
  });

  test('interprets threshold_breach as high urgency', () => {
    const r = model.interpret('threshold_breach', 0.90);
    expect(r.urgency).toBe('high');
    expect(r.riskLevel).toContain('High');
  });

  test('interprets novel signal as unknown risk', () => {
    const r = model.interpret('novel', 0.55);
    expect(r.urgency).toBe('medium');
    expect(r.riskLevel).toContain('Unknown');
  });

  test('interprets event as low urgency', () => {
    const r = model.interpret('event', 0.85);
    expect(r.urgency).toBe('low');
  });

  test('interprets unknown signal as indeterminate risk', () => {
    const r = model.interpret('unknown', 0.20);
    expect(r.riskLevel).toContain('Indeterminate');
  });

  test('singleton interpretationModel is available', () => {
    expect(interpretationModel).toBeInstanceOf(InterpretationModel);
  });
});

// --- EvidenceModel ---
describe('EvidenceModel', () => {
  let model: EvidenceModel;
  const mockSources: EvidenceSource[] = [
    { id: 'src-1', name: 'Pattern Matcher', confidence: 0.82, description: 'Pattern analysis' },
    { id: 'src-2', name: 'Baseline Comparator', confidence: 0.87, description: 'Baseline diff' },
  ];

  beforeEach(() => { model = new EvidenceModel(); });

  test('synthesize creates evidence trace with correct sourceCount', () => {
    const trace = model.synthesize(mockSources);
    expect(trace.sourceCount).toBe(2);
    expect(trace.sources).toEqual(mockSources);
    expect(trace.signalsUsed).toEqual(['src-1', 'src-2']);
    expect(trace.canonApplied).toContain('stardance-canon-v3.0');
  });

  test('combineConfidence averages sources and caps at 0.92', () => {
    const conf = model.combineConfidence(mockSources);
    expect(conf).toBeCloseTo((0.82 + 0.87) / 2);
  });

  test('combineConfidence returns 0 for empty sources', () => {
    expect(model.combineConfidence([])).toBe(0);
  });

  test('combineConfidence caps at 0.92', () => {
    const highSources: EvidenceSource[] = [
      { id: 's1', name: 'A', confidence: 0.95, description: '' },
      { id: 's2', name: 'B', confidence: 0.97, description: '' },
    ];
    expect(model.combineConfidence(highSources)).toBe(0.92);
  });

  test('singleton evidenceModel is available', () => {
    expect(evidenceModel).toBeInstanceOf(EvidenceModel);
  });
});

// --- TrustModel ---
describe('TrustModel', () => {
  let model: TrustModel;
  beforeEach(() => { model = new TrustModel(); });

  test('starts with trust score of 0.5', () => {
    expect(model.getState().score).toBe(0.5);
    expect(model.getState().decayActive).toBe(false);
  });

  test('accumulate increases trust score and records factor', () => {
    model.accumulate('high_confidence_result', 0.2);
    const state = model.getState();
    expect(state.score).toBeCloseTo(0.7);
    expect(state.factors).toContain('high_confidence_result');
  });

  test('accumulate clamps score to 1.0 maximum', () => {
    model.accumulate('boost', 0.8);
    expect(model.getState().score).toBe(1.0);
  });

  test('decay reduces trust score and sets decayActive', () => {
    model.decay(0.1);
    const state = model.getState();
    expect(state.score).toBeCloseTo(0.4);
    expect(state.decayActive).toBe(true);
  });

  test('decay clamps score to 0.0 minimum', () => {
    model.decay(1.0);
    expect(model.getState().score).toBe(0.0);
  });

  test('reset restores initial state', () => {
    model.accumulate('factor', 0.3);
    model.decay(0.1);
    model.reset();
    const state = model.getState();
    expect(state.score).toBe(0.5);
    expect(state.factors).toHaveLength(0);
    expect(state.decayActive).toBe(false);
  });
});

// --- DecisionModel ---
describe('DecisionModel', () => {
  let model: DecisionModel;
  const mockTrace: EvidenceTrace = {
    sources: [],
    signalsUsed: [],
    sourceCount: 0,
    canonApplied: ['stardance-canon-v3.0'],
  };

  beforeEach(() => { model = new DecisionModel(); });

  test('derive returns 3-question hierarchy with correct answers', () => {
    const result = model.derive('anomaly', 'Unusual deviation', 'Escalate', mockTrace, 0.85);
    expect(result.question1.answer).toContain('anomaly');
    expect(result.question2.answer).toBe('Unusual deviation');
    expect(result.question3.answer).toBe('Escalate');
    expect(result.overallConfidence).toBe(0.85);
  });

  test('getQuestions returns the 3 canonical questions', () => {
    const q = model.getQuestions();
    expect(q.q1).toBe('What signal am I looking at?');
    expect(q.q2).toBe('What does it mean?');
    expect(q.q3).toBe('What should I do?');
  });
});

// --- UXC Enforcement ---
describe('checkUXCCompliance', () => {
  test('passes when all C0/C7/C8 requirements met for complete state', () => {
    const result = checkUXCCompliance('complete', {
      operatorControlPreserved: true,
      confidenceVisible: true,
      cqxPresent: true,
    });
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  test('fails C0 when operatorControlPreserved is false', () => {
    const result = checkUXCCompliance('idle', {
      operatorControlPreserved: false,
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toContain('C0: operatorControlPreserved must be true');
  });

  test('fails C7/C8 when in complete state but confidence and cqx not visible', () => {
    const result = checkUXCCompliance('complete', {
      operatorControlPreserved: true,
      confidenceVisible: false,
      cqxPresent: false,
    });
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });

  test('passes idle state with only operatorControlPreserved=true', () => {
    const result = checkUXCCompliance('idle', {
      operatorControlPreserved: true,
    });
    expect(result.passed).toBe(true);
  });
});

// --- Formatters ---
describe('formatters', () => {
  test('formatConfidencePercent rounds to nearest integer', () => {
    expect(formatConfidencePercent(0.87)).toBe('87%');
    expect(formatConfidencePercent(0.0)).toBe('0%');
    expect(formatConfidencePercent(1.0)).toBe('100%');
    expect(formatConfidencePercent(0.555)).toBe('56%');
  });

  test('formatTimestamp returns a non-empty string', () => {
    const ts = Date.now();
    const result = formatTimestamp(ts);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('truncate shortens long strings with ellipsis', () => {
    expect(truncate('hello world', 5)).toBe('hello…');
    expect(truncate('hi', 5)).toBe('hi');
    expect(truncate('exactly', 7)).toBe('exactly');
  });
});

// --- Validators ---
describe('validators', () => {
  test('isValidSignalInput returns true for non-empty string', () => {
    expect(isValidSignalInput('anomaly detected')).toBe(true);
    expect(isValidSignalInput('  x  ')).toBe(true);
  });

  test('isValidSignalInput returns false for empty or whitespace', () => {
    expect(isValidSignalInput('')).toBe(false);
    expect(isValidSignalInput('   ')).toBe(false);
  });

  test('isValidConfidence returns true for values 0-1', () => {
    expect(isValidConfidence(0)).toBe(true);
    expect(isValidConfidence(0.5)).toBe(true);
    expect(isValidConfidence(1)).toBe(true);
  });

  test('isValidConfidence returns false for out-of-range values', () => {
    expect(isValidConfidence(-0.1)).toBe(false);
    expect(isValidConfidence(1.1)).toBe(false);
    expect(isValidConfidence(NaN)).toBe(false);
  });
});
