// src/governance/__tests__/governance-enforcement.test.ts
// CC_SCOUT_12 tests — 30+ required

import {
  // Pre-condition validators
  validateSignalIngestion,
  validateEscalatePreConditions,
  validateInvestigatePreConditions,
  validateSuppressPreConditions,
  validateResearchPreConditions,
  validateLearningPreConditions,
  // Confidence governance
  enforceConfidenceCap,
  lockConfidenceAtEscalation,
  lockConfidenceAtInvestigationStart,
  lockConfidenceAtResearchStart,
  trackConfidenceChanges,
  // Ethics gates
  evaluateEthicsGates,
  canEscalateWithEthicsGates,
  // Fail-closed validators
  canEscalate,
  canInvestigate,
  canSuppress,
  canTriggerResearch,
  canMarkAsLearning,
  // Human authority
  requireExplicitOperatorInitiation,
  preserveOperatorChoice,
  allowOperatorOverride,
  revokeOperatorAction,
  // Audit trail
  createGovernanceEvent,
  persistGovernanceEvent,
  retrieveAuditTrail,
  displayAuditTrailToOperator,
  getGovernanceEvent,
  getSignalAuditTrail,
  getOperatorActivity,
  // Violation handling
  handleConfidenceCapViolation,
  handleEscalationViolation,
  handleEthicsGateViolation,
  handleDeletionAttempt,
  handleUpdateAttempt,
  notifyGovernanceTeam,
  getViolationRecords,
  getFullAuditDatabase,
} from '../GovernanceEnforcement';
import { deleteGovernanceEvent, updateGovernanceEvent } from '../EventLoggingSchema';
import { Signal, EthicsGates } from '../../types/IMS';
import { CONFIDENCE_HARD_CAP } from '../../logic/confidence-gates';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeSignal = (overrides: Partial<Signal> = {}): Signal => ({
  id: `sig-gov-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  type: 'anomaly',
  confidence: 0.80,
  meaning: 'Governance test signal',
  evidence: [{ source: 'Test', weight: 0.8 }],
  imsState: 'complete',
  timestamp: Date.now(),
  ethicsGates: { safety: true, delight: true, harmony: true },
  operatorDecision: 'escalated',
  ...overrides,
});

const allPassGates: EthicsGates = { safety: true, delight: true, harmony: true };
const safetyFailGates: EthicsGates = { safety: false, delight: true, harmony: true };
const delightFailGates: EthicsGates = { safety: true, delight: false, harmony: true };
const harmonyFailGates: EthicsGates = { safety: true, delight: true, harmony: false };

const op = { id: 'operator-001' };

// ─── Category 1: Confidence Governance (6 tests) ─────────────────────────────

describe('GovernanceEnforcement — Confidence Governance', () => {
  test('confidenceCapEnforced_ExceedsCapClampedTo092', () => {
    const result = enforceConfidenceCap(0.99);
    expect(result).toBe(CONFIDENCE_HARD_CAP);
    expect(result).toBe(0.92);
  });

  test('confidenceCapEnforced_BelowCapKeptAsIs', () => {
    expect(enforceConfidenceCap(0.7)).toBe(0.7);
    expect(enforceConfidenceCap(0.5)).toBe(0.5);
    expect(enforceConfidenceCap(0.0)).toBe(0.0);
  });

  test('confidenceLocked_AtEscalation', () => {
    const signal = makeSignal({ confidence: 0.82 });
    const result = lockConfidenceAtEscalation(signal, 'gov-event-001');
    expect(result.locked).toBe(true);
    expect(result.lockedValue).toBe(0.82);
    expect(result.governanceEventId).toBe('gov-event-001');
  });

  test('confidenceLocked_AtInvestigationStart', () => {
    const signal = makeSignal({ confidence: 0.65 });
    const result = lockConfidenceAtInvestigationStart(signal, 'inv-event-001');
    expect(result.locked).toBe(true);
    expect(result.lockedValue).toBe(0.65);
    expect(result.investigationEventId).toBe('inv-event-001');
  });

  test('confidenceLocked_AtResearchStart', () => {
    const signal = makeSignal({ confidence: 0.55 });
    const result = lockConfidenceAtResearchStart(signal, 'res-event-001');
    expect(result.locked).toBe(true);
    expect(result.lockedValue).toBe(0.55);
    expect(result.researchEventId).toBe('res-event-001');
  });

  test('confidenceChangeTracked_WithSourceAndReason', () => {
    const signal = makeSignal({ confidence: 0.6 });
    const result = trackConfidenceChanges(signal, 0.6, 0.75, 'investigation_result');
    expect(result.oldConfidence).toBe(0.6);
    expect(result.newConfidence).toBe(0.75);
    expect(result.cappedNewConfidence).toBe(0.75);
    expect(result.source).toBe('investigation_result');
    expect(result.changeVisible).toBe(true);
    expect(result.changeAuditable).toBe(true);
  });
});

// ─── Category 2: Ethics Gates (5 tests) ──────────────────────────────────────

describe('GovernanceEnforcement — Ethics Gates', () => {
  test('ethicsGatesEvaluated_AllPassTrue', () => {
    const result = evaluateEthicsGates(allPassGates);
    expect(result.allPass).toBe(true);
    expect(result.failedGates).toHaveLength(0);
    expect(result.actionsBlocked).toHaveLength(0);
    expect(result.actionsAllowed).toContain('escalate');
  });

  test('ethicsGatesEvaluated_AnySafetyFalse', () => {
    const result = evaluateEthicsGates(safetyFailGates);
    expect(result.allPass).toBe(false);
    expect(result.failedGates).toContain('safety');
    expect(result.actionsBlocked).toContain('escalate');
  });

  test('ethicsGatesEvaluated_AnyDelightFalse', () => {
    const result = evaluateEthicsGates(delightFailGates);
    expect(result.allPass).toBe(false);
    expect(result.failedGates).toContain('delight');
    expect(result.actionConstrained).toBe(true);
  });

  test('ethicsGatesEvaluated_AnyHarmonyFalse', () => {
    const result = evaluateEthicsGates(harmonyFailGates);
    expect(result.allPass).toBe(false);
    expect(result.failedGates).toContain('harmony');
  });

  test('escalateBlocked_IfAnyGateFalse', () => {
    const ethicsResult = evaluateEthicsGates(safetyFailGates);
    const check = canEscalateWithEthicsGates(ethicsResult);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('safety');
  });
});

// ─── Category 3: Fail-Closed Logic (8 tests) ─────────────────────────────────

describe('GovernanceEnforcement — Fail-Closed Logic', () => {
  test('escalateBlocked_IfConfidenceBelowThreshold', () => {
    const result = canEscalate(makeSignal({ confidence: 0.50 }), allPassGates);
    expect(result.allowed).toBe(false);
    expect(result.failedChecks).toContain('confidence_gte_0_75');
  });

  test('escalateBlocked_IfEthicsGateFails', () => {
    const result = canEscalate(makeSignal({ confidence: 0.85 }), safetyFailGates);
    expect(result.allowed).toBe(false);
    expect(result.failedChecks).toContain('ethics_gates_pass');
  });

  test('escalateBlocked_IfSignalIncomplete', () => {
    const result = canEscalate(makeSignal({ imsState: 'idle' }), allPassGates);
    expect(result.allowed).toBe(false);
    expect(result.failedChecks).toContain('signal_complete');
  });

  test('investigateBlocked_IfEvidenceEmpty', () => {
    const result = canInvestigate(makeSignal(), []);
    expect(result.allowed).toBe(false);
    expect(result.failedChecks).toContain('evidence_available');
  });

  test('suppressBlocked_IfRationale_Missing', () => {
    const result = canSuppress(makeSignal(), '');
    expect(result.allowed).toBe(false);
    expect(result.failedChecks).toContain('rationale_provided');
  });

  test('researchBlocked_IfCapabilityUnavailable', () => {
    const result = canTriggerResearch(makeSignal({ confidence: 0.55 }), { deerflowActive: false });
    expect(result.allowed).toBe(false);
    expect(result.failedChecks).toContain('research_available');
  });

  test('learningBlocked_IfFeedbackTypeInvalid', () => {
    const result = canMarkAsLearning(makeSignal(), 'invalid_type');
    expect(result.allowed).toBe(false);
    expect(result.failedChecks).toContain('feedback_type_valid');
  });

  test('allBlockedActionsReturnReasonCode', () => {
    expect(canEscalate(makeSignal({ confidence: 0.5 }), allPassGates).reason).toContain('escalate_blocked_by');
    expect(canInvestigate(makeSignal(), []).reason).toContain('investigate_blocked_by');
    expect(canSuppress(makeSignal(), '').reason).toContain('suppress_blocked_by');
    expect(canTriggerResearch(makeSignal({ confidence: 0.9 }), { deerflowActive: true }).reason).toContain('research_blocked_by');
    expect(canMarkAsLearning(makeSignal(), 'bad').reason).toContain('learning_blocked_by');
  });
});

// ─── Category 4: Audit Trail (6 tests) ───────────────────────────────────────

describe('GovernanceEnforcement — Audit Trail', () => {
  test('governanceEventCreated_OnAllActions', () => {
    const signal = makeSignal();
    const event = createGovernanceEvent('test_action', signal, op.id, { test: true });
    expect(event.immutable).toBe(true);
    expect(event.eventType).toBe('test_action');
    expect(event.signalId).toBe(signal.id);
    expect(event.operatorId).toBe(op.id);
  });

  test('governanceEventImmutable_CannotDelete', () => {
    const result = deleteGovernanceEvent('any-event-id');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('immutable_audit_log_cannot_delete');
  });

  test('governanceEventImmutable_CannotUpdate', () => {
    const result = updateGovernanceEvent('any-event-id', { eventType: 'changed' });
    expect(result.success).toBe(false);
    expect(result.reason).toBe('immutable_audit_log_cannot_update');
  });

  test('governanceEventImmutable_ForcedAtCreation', () => {
    const signal = makeSignal();
    const event = createGovernanceEvent('immutability_test', signal, op.id, {});
    const eventId = event.eventId;
    // Retrieve and confirm immutable flag
    const retrieved = getGovernanceEvent(eventId);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.immutable).toBe(true);
  });

  test('auditTrailRetrievable_BySignalId', () => {
    const signal = makeSignal({ id: `sig-audit-trail-${Date.now()}` });
    createGovernanceEvent('trail_event_1', signal, op.id, {});
    createGovernanceEvent('trail_event_2', signal, op.id, {});
    // Both local and EventLoggingSchema stores
    const localTrail = retrieveAuditTrail(signal.id);
    const schemaTrail = getSignalAuditTrail(signal.id);
    expect(localTrail.length).toBeGreaterThanOrEqual(2);
    expect(schemaTrail.length).toBeGreaterThanOrEqual(2);
    expect(localTrail.every((e) => e.signalId === signal.id)).toBe(true);
  });

  test('auditTrailRetrievable_ByOperatorId', () => {
    const operatorId = `op-audit-${Date.now()}`;
    const signal = makeSignal();
    createGovernanceEvent('op_action_1', signal, operatorId, {});
    createGovernanceEvent('op_action_2', signal, operatorId, {});
    const activity = getOperatorActivity(operatorId);
    expect(activity.length).toBeGreaterThanOrEqual(2);
    expect(activity.every((e) => e.operatorId === operatorId)).toBe(true);
  });
});

// ─── Category 5: Violation Handling (5 tests) ────────────────────────────────

describe('GovernanceEnforcement — Violation Handling', () => {
  test('confidenceCapViolation_ClampedAndLogged', () => {
    const violationsBefore = getViolationRecords().length;
    const result = handleConfidenceCapViolation(0.99);
    expect(result).toBe(CONFIDENCE_HARD_CAP);
    expect(getViolationRecords().length).toBeGreaterThan(violationsBefore);
    const latest = getViolationRecords()[getViolationRecords().length - 1];
    expect(latest.violationType).toBe('confidence_cap_exceeded');
  });

  test('escalationViolation_BlockedAndExplained', () => {
    const signal = makeSignal({ confidence: 0.55 });
    const result = handleEscalationViolation(signal, op.id);
    expect(result.actionBlocked).toBe(true);
    expect(result.reason).toContain('0.75');
    expect(result.currentConfidence).toBe(0.55);
    expect(result.alternatives.length).toBeGreaterThan(0);
  });

  test('ethicsGateViolation_BlockedAndListed', () => {
    const signal = makeSignal();
    const result = handleEthicsGateViolation(signal, op.id, ['safety', 'harmony']);
    expect(result.actionBlocked).toBe(true);
    expect(result.reason).toContain('safety');
    expect(result.reason).toContain('harmony');
  });

  test('deletionAttempt_AlwaysFails', () => {
    const result = handleDeletionAttempt('some-event-id');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('immutable_audit_log_cannot_delete');
  });

  test('updateAttempt_AlwaysFails', () => {
    const result = handleUpdateAttempt('some-event-id');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('immutable_audit_log_cannot_update');
  });
});

// ─── Category 6: Spec-named validators (4 tests) ─────────────────────────────

describe('GovernanceEnforcement — Spec-Named Validators', () => {
  test('validateEscalatePreConditions: allPass true with high confidence, gates, complete signal', () => {
    const result = validateEscalatePreConditions(makeSignal({ confidence: 0.85 }), allPassGates);
    expect(result.confidence).toBe(true);
    expect(result.ethicsGates).toBe(true);
    expect(result.completeness).toBe(true);
    expect(result.allPass).toBe(true);
  });

  test('validateInvestigatePreConditions: allPass false when evidencePool empty', () => {
    const result = validateInvestigatePreConditions(makeSignal(), []);
    expect(result.evidenceAvailable).toBe(false);
    expect(result.allPass).toBe(false);
  });

  test('validateSuppressPreConditions: allPass false when rationale missing', () => {
    const result = validateSuppressPreConditions(makeSignal(), '');
    expect(result.rationaleProvided).toBe(false);
    expect(result.allPass).toBe(false);
  });

  test('validateResearchPreConditions: allPass false when confidence too high', () => {
    const result = validateResearchPreConditions(makeSignal({ confidence: 0.85 }), { deerflowActive: true });
    expect(result.confidenceInRange).toBe(false);
    expect(result.allPass).toBe(false);
  });

  test('validateLearningPreConditions: allPass true with valid type and decision', () => {
    const result = validateLearningPreConditions(makeSignal(), 'correctly_classified');
    expect(result.feedbackTypeValid).toBe(true);
    expect(result.signalHasDecision).toBe(true);
    expect(result.allPass).toBe(true);
  });

  test('validateSignalIngestion: blocks signal missing required fields', () => {
    const result = validateSignalIngestion({});
    expect(result.allowed).toBe(false);
    expect(result.failedChecks.length).toBeGreaterThan(0);
  });
});

// ─── Category 7: Human Authority Preservation (4 tests) ──────────────────────

describe('GovernanceEnforcement — Human Authority Preservation', () => {
  test('requireExplicitOperatorInitiation returns required=true', () => {
    const result = requireExplicitOperatorInitiation({ id: 'act-001', type: 'escalate' });
    expect(result.required).toBe(true);
    expect(result.actionId).toBe('act-001');
    expect(result.actionType).toBe('escalate');
  });

  test('preserveOperatorChoice records choice with timestamp', () => {
    const before = Date.now();
    const result = preserveOperatorChoice('escalate', 'accepted');
    expect(result.preserved).toBe(true);
    expect(result.actionType).toBe('escalate');
    expect(result.operatorDecision).toBe('accepted');
    expect(result.auditedAt).toBeGreaterThanOrEqual(before);
  });

  test('allowOperatorOverride: allowed when operator has authority', () => {
    const signal = makeSignal();
    const result = allowOperatorOverride('escalate', 'Reviewed manually', op.id, signal, true);
    expect(result.allowed).toBe(true);
    expect(result.overrideRecorded).toBe(true);
  });

  test('revokeOperatorAction: revoked=true with audit trail updated', () => {
    const signal = makeSignal();
    const result = revokeOperatorAction('act-rev-001', signal, op.id, 'Decision reversed');
    expect(result.revoked).toBe(true);
    expect(result.auditTrailUpdated).toBe(true);
  });
});

// ─── Category 8: Audit Trail Display + EventLoggingSchema integration (3 tests) ─

describe('GovernanceEnforcement — Display + EventLoggingSchema Integration', () => {
  test('displayAuditTrailToOperator returns full visibility trail', () => {
    const signal = makeSignal({ id: `sig-display-${Date.now()}` });
    createGovernanceEvent('display_test', signal, op.id, {});
    const trail = displayAuditTrailToOperator(signal.id);
    expect(trail.signalId).toBe(signal.id);
    expect(trail.visibility).toBe('full');
    expect(trail.totalEvents).toBeGreaterThanOrEqual(1);
  });

  test('notifyGovernanceTeam: notified=true with channels returned', () => {
    const violationRecord = getViolationRecords()[0] ?? {
      violationId: 'vio-test',
      violationType: 'test',
      details: {},
      timestamp: Date.now(),
      permanent: true as const,
    };
    const result = notifyGovernanceTeam(violationRecord);
    expect(result.notified).toBe(true);
    expect(result.channels).toContain('audit_log');
  });

  test('persistGovernanceEvent dual-writes to local and EventLoggingSchema stores', () => {
    const signal = makeSignal({ id: `sig-dual-write-${Date.now()}` });
    const event = createGovernanceEvent('dual_write_test', signal, op.id, {});
    // Local store
    const localTrail = retrieveAuditTrail(signal.id);
    expect(localTrail.some((e) => e.eventId === event.eventId)).toBe(true);
    // EventLoggingSchema canonical store
    const schemaEntry = getGovernanceEvent(event.eventId);
    expect(schemaEntry).not.toBeNull();
    expect(schemaEntry!.eventId).toBe(event.eventId);
  });
});
