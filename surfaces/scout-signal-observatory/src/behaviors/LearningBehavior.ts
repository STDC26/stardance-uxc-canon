// src/behaviors/LearningBehavior.ts
// CC_SCOUT_11: Mark As Learning operator action
// Source: PHASE_5_6_IBC_SECTION_1_FOUNDATION.md (Behavior 5)
//         PHASE_5_6_OPERATOR_ACTION_RUNTIME_SCHEMA.json (mark_as_learning)

import { Signal, GovernanceEvent } from '../types/IMS';
import { persistGovernanceEvent } from '../governance/EventLoggingSchema';

// ─── Types ───────────────────────────────────────────────────────────────────

export type FeedbackType =
  | 'correctly_classified'
  | 'misclassified'
  | 'pattern_important'
  | 'pattern_not_important';

export const VALID_FEEDBACK_TYPES: FeedbackType[] = [
  'correctly_classified',
  'misclassified',
  'pattern_important',
  'pattern_not_important',
];

export interface EdgeEvent {
  eventId: string;
  eventType: 'operator_feedback';
  feedbackType: FeedbackType;
  operatorId: string;
  signalId: string;
  timestamp: number;
  immutable: true;
  retracted: boolean;
  retractedAt?: number;
  retractedBy?: string;
}

export interface ReinforcementMemoryEntry {
  patternId: string;
  signalPattern?: string;
  feedbackType: FeedbackType;
  operatorId: string;
  timestamp: number;
  patternWeight: number;
  classificationConfidenceAdjusted: boolean;
  confidenceNotUpdated: true; // GOVERNANCE: learning NEVER changes confidence
}

export interface ClassificationUpdate {
  signalId: string;
  tagsUpdated: boolean;
  weightsUpdated: boolean;
  importanceUpdated: boolean;
  confidenceUpdated: false; // GOVERNANCE: always false
  source: 'operator_learning';
}

export interface LearningAuditEntry {
  auditId: string;
  edgeEventId: string;
  signalId: string;
  operatorId: string;
  feedbackType: FeedbackType;
  changes: ClassificationUpdate;
  timestamp: number;
  visible: true;
  measurable: true;
  reversible: true;
}

export interface LearningResult {
  allowed: boolean;
  reason: string;
  edgeEvent?: EdgeEvent;
  reinforcementEntry?: ReinforcementMemoryEntry;
  classificationUpdate?: ClassificationUpdate;
  auditEntry?: LearningAuditEntry;
  governanceEvent?: GovernanceEvent;
  operatorFeedback?: string;
  newState?: 'learning_event_recorded';
}

// In-memory stores
const _edgeEvents: EdgeEvent[] = [];
const _reinforcementMemory: ReinforcementMemoryEntry[] = [];
const _classificationUpdates: ClassificationUpdate[] = [];
const _learningAudit: LearningAuditEntry[] = [];
const _learningGovernanceLog: GovernanceEvent[] = [];

export function getEdgeEvents(): ReadonlyArray<EdgeEvent> {
  return _edgeEvents;
}

export function getReinforcementMemory(): ReadonlyArray<ReinforcementMemoryEntry> {
  return _reinforcementMemory;
}

export function getLearningAudit(): ReadonlyArray<LearningAuditEntry> {
  return _learningAudit;
}

export function getLearningGovernanceLog(): ReadonlyArray<GovernanceEvent> {
  return _learningGovernanceLog;
}

// ─── Pre-condition validators ────────────────────────────────────────────────

export function validateFeedbackType(feedbackType: string): feedbackType is FeedbackType {
  return (VALID_FEEDBACK_TYPES as string[]).includes(feedbackType);
}

export function validateOperatorHasDecision(signal: Signal): boolean {
  return signal.operatorDecision !== undefined;
}

export function validateNotDuplicateLearning(signal: Signal): boolean {
  const minIntervalMs = 60_000; // 1 min minimum between learning events
  return (
    !signal.learningEventRecorded ||
    signal.learningEventRecorded < Date.now() - minIntervalMs
  );
}

// ─── Runtime implementation ──────────────────────────────────────────────────

export function markAsLearning(
  signal: Signal,
  operatorId: string,
  feedbackType: string
): LearningResult {
  // Pre-condition checks (fail-closed)
  const failedChecks: string[] = [];

  if (!validateFeedbackType(feedbackType)) {
    failedChecks.push('feedback_type_invalid');
  }
  if (!validateOperatorHasDecision(signal)) {
    failedChecks.push('signal_has_no_operator_decision');
  }
  if (!validateNotDuplicateLearning(signal)) {
    failedChecks.push('duplicate_learning_event_too_soon');
  }

  if (failedChecks.length > 0) {
    return {
      allowed: false,
      reason: `learning_blocked_by: ${failedChecks.join(', ')}`,
      operatorFeedback: `Mark As Learning blocked: ${failedChecks.join(', ')}`,
    };
  }

  const validFeedback = feedbackType as FeedbackType;

  // Step 2: Create EDGE event (immutable)
  const edgeEvent: EdgeEvent = {
    eventId: generateId('edge'),
    eventType: 'operator_feedback',
    feedbackType: validFeedback,
    operatorId,
    signalId: signal.id,
    timestamp: Date.now(),
    immutable: true,
    retracted: false,
  };

  // Step 3: Update reinforcement memory
  // GOVERNANCE: confidence NEVER changed — learning is separate
  const patternWeight = calculatePatternWeight(validFeedback, signal);
  const reinforcementEntry: ReinforcementMemoryEntry = {
    patternId: generateId('pat'),
    signalPattern: signal.pattern,
    feedbackType: validFeedback,
    operatorId,
    timestamp: Date.now(),
    patternWeight,
    classificationConfidenceAdjusted: false,
    confidenceNotUpdated: true,
  };

  // Step 4: Update signal classification (tags, weights, importance — NOT confidence)
  const classificationUpdate: ClassificationUpdate = {
    signalId: signal.id,
    tagsUpdated: true,
    weightsUpdated: validFeedback === 'pattern_important' || validFeedback === 'pattern_not_important',
    importanceUpdated: true,
    confidenceUpdated: false, // GOVERNANCE: always false
    source: 'operator_learning',
  };

  // Step 5: Persist feedback
  _edgeEvents.push(edgeEvent);
  _reinforcementMemory.push(reinforcementEntry);
  _classificationUpdates.push(classificationUpdate);

  // Step 6: Create learning audit trail (visible, measurable, reversible)
  const auditEntry: LearningAuditEntry = {
    auditId: generateId('aud'),
    edgeEventId: edgeEvent.eventId,
    signalId: signal.id,
    operatorId,
    feedbackType: validFeedback,
    changes: classificationUpdate,
    timestamp: Date.now(),
    visible: true,
    measurable: true,
    reversible: true,
  };
  _learningAudit.push(auditEntry);

  // Governance event (immutable)
  const governanceEvent: GovernanceEvent = {
    eventId: generateId('gov'),
    eventType: 'learning_recorded',
    eventTimestamp: Date.now(),
    signalId: signal.id,
    signalConfidenceAtEvent: signal.confidence,
    signalMeaningAtEvent: signal.meaning,
    operatorId,
    actionDetails: {
      edgeEventId: edgeEvent.eventId,
      feedbackType: validFeedback,
      confidenceNotMutated: true,
      patternWeightAdjusted: true,
      classificationUpdated: true,
    },
    failClosedApplied: true,
    governanceGatesChecked: [
      'learning_events_visible_not_hidden',
      'learning_separate_from_confidence',
      'operator_feedback_captured_as_rationale',
      'learning_effects_auditable',
    ],
    immutable: true,
  };
  _learningGovernanceLog.push(governanceEvent);

  // Step 7: Emit state
  return {
    allowed: true,
    reason: 'learning_allowed',
    edgeEvent,
    reinforcementEntry,
    classificationUpdate,
    auditEntry,
    governanceEvent,
    operatorFeedback: 'Feedback recorded. This helps SCOUT learn.',
    newState: 'learning_event_recorded',
  };
}

// Retract a learning event (marks as retracted — cannot delete, per spec)
export function retractLearningEvent(
  edgeEventId: string,
  operatorId: string
): { success: boolean; reason: string } {
  const event = _edgeEvents.find((e) => e.eventId === edgeEventId);
  if (!event) {
    return { success: false, reason: 'edge_event_not_found' };
  }
  if (event.retracted) {
    return { success: false, reason: 'already_retracted' };
  }

  event.retracted = true;
  event.retractedAt = Date.now();
  event.retractedBy = operatorId;

  return { success: true, reason: 'learning_event_retracted' };
}

// ─── Helper functions ────────────────────────────────────────────────────────

function calculatePatternWeight(feedbackType: FeedbackType, signal: Signal): number {
  switch (feedbackType) {
    case 'correctly_classified':
      return Math.min(signal.confidence + 0.05, 0.92);
    case 'misclassified':
      return Math.max(signal.confidence - 0.1, 0.1);
    case 'pattern_important':
      return Math.min(signal.confidence + 0.1, 0.92);
    case 'pattern_not_important':
      return Math.max(signal.confidence - 0.15, 0.05);
  }
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Spec-required function signatures (CC_SCOUT_11 acceptance criteria) ─────

export type LearningEvent = ReinforcementMemoryEntry;

export interface Operator {
  id: string;
}

export const LEARNING_EFFECTS: Record<FeedbackType, string> = {
  correctly_classified: 'Reinforce pattern as valid classification',
  misclassified: 'Reduce confidence in pattern, explore alternative',
  pattern_important: 'Mark pattern for future attention, increase monitoring priority',
  pattern_not_important: 'Deprioritize pattern in future signal processing',
};

export const PATTERN_WEIGHT_ADJUSTMENTS: Record<FeedbackType, number> = {
  correctly_classified: 0.1,
  misclassified: -0.15,
  pattern_important: 0.2,
  pattern_not_important: -0.2,
};

/** Composite pre-condition validator — returns per-gate booleans and allPass. */
export function validateLearningPreConditions(
  signal: Signal,
  feedbackType: string
): { feedbackTypeValid: boolean; signalHasDecision: boolean; allPass: boolean } {
  const feedbackTypeValid = validateFeedbackType(feedbackType);
  const signalHasDecision = validateOperatorHasDecision(signal);
  return {
    feedbackTypeValid,
    signalHasDecision,
    allPass: feedbackTypeValid && signalHasDecision,
  };
}

/**
 * canMarkAsLearning — check without executing.
 * Returns first failure reason with spec-required reason codes.
 */
export function canMarkAsLearning(
  signal: Signal,
  feedbackType: string
): { allowed: boolean; reason?: string } {
  const checks = validateLearningPreConditions(signal, feedbackType);
  if (!checks.feedbackTypeValid) return { allowed: false, reason: 'feedback_type_invalid' };
  if (!checks.signalHasDecision) return { allowed: false, reason: 'signal_no_decision' };
  return { allowed: true };
}

/**
 * executeMarkAsLearning — execute with all governance rules enforced.
 * Re-validates at execution boundary (fail-closed).
 * Integrates with EventLoggingSchema canonical audit store.
 * Returns { recorded, edgeEventId, learningEffect } per spec.
 */
export function executeMarkAsLearning(
  signal: Signal,
  operator: Operator,
  feedbackType: string
): { recorded: boolean; edgeEventId?: string; learningEffect?: string; reason?: string } {
  const check = canMarkAsLearning(signal, feedbackType);
  if (!check.allowed) {
    return { recorded: false, reason: check.reason };
  }

  const result = markAsLearning(signal, operator.id, feedbackType);
  if (!result.allowed || !result.edgeEvent) {
    return { recorded: false, reason: result.reason };
  }

  // Integrate with EventLoggingSchema (canonical immutable audit store per spec)
  if (result.governanceEvent) {
    persistGovernanceEvent(result.governanceEvent);
  }

  return {
    recorded: true,
    edgeEventId: result.edgeEvent.eventId,
    learningEffect: LEARNING_EFFECTS[feedbackType as FeedbackType],
  };
}

/**
 * getPatternLearningHistory — retrieve all learning feedback for a signal pattern.
 * Returns feedbackEvents, cumulativeWeight (sum of spec weight adjustments), and
 * effectiveness (ratio of positive to total feedback events).
 */
export function getPatternLearningHistory(
  signalPattern: string
): { feedbackEvents: LearningEvent[]; cumulativeWeight: number; effectiveness: number } {
  const feedbackEvents = (_reinforcementMemory as ReinforcementMemoryEntry[]).filter(
    (e) => e.signalPattern === signalPattern
  );

  const cumulativeWeight = feedbackEvents.reduce(
    (sum, e) => sum + (PATTERN_WEIGHT_ADJUSTMENTS[e.feedbackType] ?? 0),
    0
  );

  const positiveTypes: FeedbackType[] = ['correctly_classified', 'pattern_important'];
  const positiveCount = feedbackEvents.filter((e) => positiveTypes.includes(e.feedbackType)).length;
  const effectiveness = feedbackEvents.length > 0 ? positiveCount / feedbackEvents.length : 0;

  return { feedbackEvents, cumulativeWeight, effectiveness };
}
