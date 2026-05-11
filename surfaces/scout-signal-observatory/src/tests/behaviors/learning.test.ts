// src/tests/behaviors/learning.test.ts
// CC_SCOUT_11 tests — 8+ required

import {
  markAsLearning,
  retractLearningEvent,
  validateFeedbackType,
  validateOperatorHasDecision,
  validateNotDuplicateLearning,
  getEdgeEvents,
  getLearningAudit,
  VALID_FEEDBACK_TYPES,
  validateLearningPreConditions,
  canMarkAsLearning,
  executeMarkAsLearning,
  getPatternLearningHistory,
  LEARNING_EFFECTS,
  PATTERN_WEIGHT_ADJUSTMENTS,
} from '../../behaviors/LearningBehavior';
import { Signal } from '../../types/IMS';

const makeSignal = (overrides: Partial<Signal> = {}): Signal => ({
  id: `sig-lrn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  type: 'anomaly',
  confidence: 0.72,
  meaning: 'Correctly identified pattern',
  evidence: [{ source: 'Classifier', weight: 0.72 }],
  imsState: 'complete',
  timestamp: Date.now(),
  operatorDecision: 'escalated',
  ...overrides,
});

describe('LearningBehavior — Pre-condition validators', () => {
  test('validateFeedbackType: accepts all valid feedback types', () => {
    for (const ft of VALID_FEEDBACK_TYPES) {
      expect(validateFeedbackType(ft)).toBe(true);
    }
  });

  test('validateFeedbackType: rejects invalid feedback types', () => {
    expect(validateFeedbackType('invalid_type')).toBe(false);
    expect(validateFeedbackType('')).toBe(false);
    expect(validateFeedbackType('correct')).toBe(false);
  });

  test('validateOperatorHasDecision: passes when operatorDecision is set', () => {
    expect(validateOperatorHasDecision(makeSignal({ operatorDecision: 'escalated' }))).toBe(true);
    expect(validateOperatorHasDecision(makeSignal({ operatorDecision: 'investigated' }))).toBe(true);
  });

  test('validateOperatorHasDecision: fails when operatorDecision is missing', () => {
    const signal = makeSignal();
    delete signal.operatorDecision;
    expect(validateOperatorHasDecision(signal)).toBe(false);
  });

  test('validateNotDuplicateLearning: passes when no prior learning event', () => {
    expect(validateNotDuplicateLearning(makeSignal())).toBe(true);
  });

  test('validateNotDuplicateLearning: fails when learning was recorded recently', () => {
    const signal = makeSignal({ learningEventRecorded: Date.now() - 10_000 }); // 10s ago
    expect(validateNotDuplicateLearning(signal)).toBe(false);
  });
});

describe('LearningBehavior — Runtime sequence', () => {
  test('markAsLearning with correctly_classified: returns allowed=true', () => {
    const signal = makeSignal();
    const result = markAsLearning(signal, 'operator-001', 'correctly_classified');
    expect(result.allowed).toBe(true);
    expect(result.newState).toBe('learning_event_recorded');
    expect(result.operatorFeedback).toContain('Feedback recorded');
  });

  test('markAsLearning with misclassified: returns allowed=true', () => {
    const signal = makeSignal();
    const result = markAsLearning(signal, 'operator-001', 'misclassified');
    expect(result.allowed).toBe(true);
    expect(result.edgeEvent?.feedbackType).toBe('misclassified');
  });

  test('markAsLearning with pattern_important: returns allowed=true', () => {
    const signal = makeSignal();
    const result = markAsLearning(signal, 'operator-001', 'pattern_important');
    expect(result.allowed).toBe(true);
  });

  test('markAsLearning with pattern_not_important: returns allowed=true', () => {
    const signal = makeSignal();
    const result = markAsLearning(signal, 'operator-001', 'pattern_not_important');
    expect(result.allowed).toBe(true);
  });

  test('markAsLearning with invalid feedback type: blocked', () => {
    const signal = makeSignal();
    const result = markAsLearning(signal, 'operator-001', 'bad_feedback');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('feedback_type_invalid');
  });

  test('confidence is NEVER mutated by learning', () => {
    const signal = makeSignal({ confidence: 0.72 });
    const result = markAsLearning(signal, 'operator-001', 'correctly_classified');
    expect(result.allowed).toBe(true);
    expect(result.classificationUpdate!.confidenceUpdated).toBe(false);
    expect(signal.confidence).toBe(0.72); // unchanged
    expect(result.reinforcementEntry!.confidenceNotUpdated).toBe(true);
  });

  test('EDGE event created with correct fields and immutable=true', () => {
    const signal = makeSignal();
    const result = markAsLearning(signal, 'operator-001', 'correctly_classified');
    const edge = result.edgeEvent!;
    expect(edge.eventType).toBe('operator_feedback');
    expect(edge.immutable).toBe(true);
    expect(edge.feedbackType).toBe('correctly_classified');
    expect(edge.operatorId).toBe('operator-001');
  });

  test('learning audit trail created with visibility=true', () => {
    const signal = makeSignal();
    const result = markAsLearning(signal, 'operator-001', 'correctly_classified');
    expect(result.auditEntry!.visible).toBe(true);
    expect(result.auditEntry!.measurable).toBe(true);
    expect(result.auditEntry!.reversible).toBe(true);
  });

  test('retractLearningEvent marks event as retracted (not deleted)', () => {
    const signal = makeSignal();
    const result = markAsLearning(signal, 'operator-001', 'correctly_classified');
    const edgeId = result.edgeEvent!.eventId;

    const retractResult = retractLearningEvent(edgeId, 'operator-001');
    expect(retractResult.success).toBe(true);

    const events = getEdgeEvents();
    const event = events.find((e) => e.eventId === edgeId);
    expect(event!.retracted).toBe(true);
    expect(event!.retractedBy).toBe('operator-001');
    // Event still exists (not deleted)
    expect(event).toBeDefined();
  });

  test('audit trail persisted to store', () => {
    const signal = makeSignal();
    markAsLearning(signal, 'operator-001', 'pattern_important');
    const audit = getLearningAudit();
    const found = audit.some((a) => a.signalId === signal.id);
    expect(found).toBe(true);
  });
});

describe('LearningBehavior — validateLearningPreConditions (composite)', () => {
  test('allPass true with valid feedbackType and operator decision present', () => {
    const result = validateLearningPreConditions(makeSignal(), 'correctly_classified');
    expect(result.feedbackTypeValid).toBe(true);
    expect(result.signalHasDecision).toBe(true);
    expect(result.allPass).toBe(true);
  });

  test('allPass false when feedbackType invalid', () => {
    const result = validateLearningPreConditions(makeSignal(), 'bad_type');
    expect(result.feedbackTypeValid).toBe(false);
    expect(result.allPass).toBe(false);
  });

  test('allPass false when signal has no operator decision', () => {
    const signal = makeSignal();
    delete signal.operatorDecision;
    const result = validateLearningPreConditions(signal, 'correctly_classified');
    expect(result.signalHasDecision).toBe(false);
    expect(result.allPass).toBe(false);
  });

  test('allPass false when both gates fail', () => {
    const signal = makeSignal();
    delete signal.operatorDecision;
    const result = validateLearningPreConditions(signal, 'invalid_type');
    expect(result.feedbackTypeValid).toBe(false);
    expect(result.signalHasDecision).toBe(false);
    expect(result.allPass).toBe(false);
  });
});

describe('LearningBehavior — canMarkAsLearning', () => {
  test('allowed=true with valid feedback and decision present', () => {
    const result = canMarkAsLearning(makeSignal(), 'misclassified');
    expect(result.allowed).toBe(true);
  });

  test('allowed=false with invalid feedback: reason=feedback_type_invalid', () => {
    const result = canMarkAsLearning(makeSignal(), 'wrong_type');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('feedback_type_invalid');
  });

  test('allowed=false when no operator decision: reason=signal_no_decision', () => {
    const signal = makeSignal();
    delete signal.operatorDecision;
    const result = canMarkAsLearning(signal, 'correctly_classified');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('signal_no_decision');
  });

  test('feedback_type_invalid takes priority over signal_no_decision', () => {
    const signal = makeSignal();
    delete signal.operatorDecision;
    const result = canMarkAsLearning(signal, 'bad_type');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('feedback_type_invalid');
  });
});

describe('LearningBehavior — executeMarkAsLearning', () => {
  const op = { id: 'operator-001' };

  test('recorded=true with valid signal and feedback: returns edgeEventId and learningEffect', () => {
    const signal = makeSignal();
    const result = executeMarkAsLearning(signal, op, 'correctly_classified');
    expect(result.recorded).toBe(true);
    expect(result.edgeEventId).toBeDefined();
    expect(typeof result.edgeEventId).toBe('string');
    expect(result.learningEffect).toBe(LEARNING_EFFECTS['correctly_classified']);
  });

  test('learningEffect matches spec strings for all feedback types', () => {
    for (const ft of VALID_FEEDBACK_TYPES) {
      const signal = makeSignal();
      const result = executeMarkAsLearning(signal, op, ft);
      expect(result.recorded).toBe(true);
      expect(result.learningEffect).toBe(LEARNING_EFFECTS[ft]);
    }
  });

  test('recorded=false when feedbackType invalid: reason=feedback_type_invalid', () => {
    const result = executeMarkAsLearning(makeSignal(), op, 'not_a_type');
    expect(result.recorded).toBe(false);
    expect(result.reason).toBe('feedback_type_invalid');
  });

  test('recorded=false when signal has no operator decision: reason=signal_no_decision', () => {
    const signal = makeSignal();
    delete signal.operatorDecision;
    const result = executeMarkAsLearning(signal, op, 'pattern_important');
    expect(result.recorded).toBe(false);
    expect(result.reason).toBe('signal_no_decision');
  });

  test('executeMarkAsLearning does NOT mutate signal confidence', () => {
    const signal = makeSignal({ confidence: 0.72 });
    executeMarkAsLearning(signal, op, 'correctly_classified');
    expect(signal.confidence).toBe(0.72);
  });
});

describe('LearningBehavior — getPatternLearningHistory', () => {
  test('returns empty history for unknown pattern', () => {
    const { feedbackEvents, cumulativeWeight, effectiveness } = getPatternLearningHistory('unknown-xyz');
    expect(feedbackEvents).toHaveLength(0);
    expect(cumulativeWeight).toBe(0);
    expect(effectiveness).toBe(0);
  });

  test('feedbackEvents accumulate for pattern after markAsLearning', () => {
    const pattern = `hist-pattern-${Date.now()}`;
    const signal = makeSignal({ pattern });
    markAsLearning(signal, 'operator-001', 'correctly_classified');
    const { feedbackEvents } = getPatternLearningHistory(pattern);
    expect(feedbackEvents.length).toBeGreaterThanOrEqual(1);
    expect(feedbackEvents[0].signalPattern).toBe(pattern);
    expect(feedbackEvents[0].feedbackType).toBe('correctly_classified');
  });

  test('cumulativeWeight uses spec weight adjustments', () => {
    const pattern = `weight-pattern-${Date.now()}`;
    const signal1 = makeSignal({ pattern });
    const signal2 = makeSignal({ pattern });
    markAsLearning(signal1, 'operator-001', 'correctly_classified'); // +0.1
    markAsLearning(signal2, 'operator-001', 'misclassified');        // -0.15
    const { cumulativeWeight } = getPatternLearningHistory(pattern);
    const expected = PATTERN_WEIGHT_ADJUSTMENTS['correctly_classified'] + PATTERN_WEIGHT_ADJUSTMENTS['misclassified'];
    expect(Math.abs(cumulativeWeight - expected)).toBeLessThan(0.0001);
  });

  test('effectiveness is ratio of positive feedback to total', () => {
    const pattern = `eff-pattern-${Date.now()}`;
    const s1 = makeSignal({ pattern });
    const s2 = makeSignal({ pattern });
    const s3 = makeSignal({ pattern });
    markAsLearning(s1, 'operator-001', 'correctly_classified'); // positive
    markAsLearning(s2, 'operator-001', 'pattern_important');    // positive
    markAsLearning(s3, 'operator-001', 'misclassified');        // negative
    const { effectiveness } = getPatternLearningHistory(pattern);
    // 2 positive out of 3 total
    expect(effectiveness).toBeCloseTo(2 / 3, 5);
  });
});
