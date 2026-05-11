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
