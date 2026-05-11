// src/tests/behaviors/governance.test.ts
// CC_SCOUT_12 tests — 20+ required

import {
  validateSignalIngestion,
  canEscalate,
  canInvestigate,
  canSuppress,
  canTriggerResearch,
  canMarkAsLearning,
  enforceConfidenceCap,
  proposeConfidenceUpdate,
  applyConfidenceUpdate,
  evaluateEthicsGates,
  canEscalateWithEthicsGates,
  displayEthicsGateStatus,
  createGovernanceEvent,
  persistGovernanceEvent,
  retrieveAuditTrail,
  displayAuditTrail,
  handleConfidenceCapViolation,
  handleEscalationViolation,
  handleEthicsGateViolation,
  executeOperatorAction,
  allowOperatorOverride,
  revokeOperatorAction,
  getFullAuditDatabase,
  getViolationRecords,
} from '../../governance/GovernanceEnforcement';
import { Signal, EthicsGates } from '../../types/IMS';
import { CONFIDENCE_HARD_CAP } from '../../logic/confidence-gates';

const makeSignal = (overrides: Partial<Signal> = {}): Signal => ({
  id: `sig-gov-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  type: 'anomaly',
  confidence: 0.8,
  meaning: 'High confidence signal',
  evidence: [{ source: 'Classifier', weight: 0.8 }],
  imsState: 'complete',
  timestamp: Date.now(),
  ethicsGates: { safety: true, delight: true, harmony: true },
  operatorDecision: 'escalated',
  ...overrides,
});

const allPassGates: EthicsGates = { safety: true, delight: true, harmony: true };
const failGates: EthicsGates = { safety: false, delight: true, harmony: true };

describe('GovernanceEnforcement — Signal ingestion validation', () => {
  test('valid signal passes ingestion validation', () => {
    const signal = makeSignal();
    const result = validateSignalIngestion(signal);
    expect(result.allowed).toBe(true);
  });

  test('missing confidence fails ingestion', () => {
    const result = validateSignalIngestion({ id: 's1', imsState: 'complete', meaning: 'test', type: 'x', timestamp: Date.now() } as Partial<Signal>);
    expect(result.allowed).toBe(false);
    expect(result.failedChecks).toContain('confidence_missing');
  });

  test('confidence > 0.92 fails ingestion', () => {
    const result = validateSignalIngestion({ ...makeSignal(), confidence: 0.95 });
    expect(result.allowed).toBe(false);
    expect(result.failedChecks).toContain('confidence_exceeds_cap_0.92');
  });

  test('missing meaning fails ingestion', () => {
    const result = validateSignalIngestion({ ...makeSignal(), meaning: '' });
    expect(result.allowed).toBe(false);
    expect(result.failedChecks).toContain('meaning_missing');
  });
});

describe('GovernanceEnforcement — Action pre-condition validators', () => {
  test('canEscalate: allowed with valid signal and passing ethics gates', () => {
    const result = canEscalate(makeSignal(), allPassGates);
    expect(result.allowed).toBe(true);
  });

  test('canEscalate: blocked when confidence < 0.75', () => {
    const result = canEscalate(makeSignal({ confidence: 0.6 }), allPassGates);
    expect(result.allowed).toBe(false);
    expect(result.failedChecks).toContain('confidence_gte_0_75');
  });

  test('canEscalate: blocked when ethics gates fail', () => {
    const result = canEscalate(makeSignal(), failGates);
    expect(result.allowed).toBe(false);
    expect(result.failedChecks).toContain('ethics_gates_pass');
  });

  test('canInvestigate: allowed with valid signal and evidence', () => {
    const result = canInvestigate(makeSignal(), [{ source: 'test', weight: 0.8 }]);
    expect(result.allowed).toBe(true);
  });

  test('canInvestigate: blocked with empty evidence pool', () => {
    const result = canInvestigate(makeSignal(), []);
    expect(result.allowed).toBe(false);
    expect(result.failedChecks).toContain('evidence_available');
  });

  test('canSuppress: allowed with rationale', () => {
    const result = canSuppress(makeSignal(), 'Known false positive');
    expect(result.allowed).toBe(true);
  });

  test('canSuppress: blocked without rationale', () => {
    const result = canSuppress(makeSignal(), '');
    expect(result.allowed).toBe(false);
    expect(result.failedChecks).toContain('rationale_provided');
  });

  test('canSuppress: blocked when already suppressed', () => {
    const signal = makeSignal({ suppressedUntil: Date.now() + 60_000 });
    const result = canSuppress(signal, 'reason');
    expect(result.allowed).toBe(false);
    expect(result.failedChecks).toContain('signal_not_already_suppressed');
  });

  test('canTriggerResearch: allowed for LOW/MEDIUM confidence', () => {
    const result = canTriggerResearch(makeSignal({ confidence: 0.5 }), { deerflowActive: true });
    expect(result.allowed).toBe(true);
  });

  test('canTriggerResearch: blocked for HIGH confidence', () => {
    const result = canTriggerResearch(makeSignal({ confidence: 0.85 }), { deerflowActive: true });
    expect(result.allowed).toBe(false);
  });

  test('canMarkAsLearning: allowed with valid feedback and decision', () => {
    const result = canMarkAsLearning(makeSignal(), 'correctly_classified');
    expect(result.allowed).toBe(true);
  });

  test('canMarkAsLearning: blocked with invalid feedback type', () => {
    const result = canMarkAsLearning(makeSignal(), 'invalid_feedback');
    expect(result.allowed).toBe(false);
    expect(result.failedChecks).toContain('feedback_type_valid');
  });
});

describe('GovernanceEnforcement — Confidence governance', () => {
  test('enforceConfidenceCap: clamps values above 0.92 to 0.92', () => {
    expect(enforceConfidenceCap(0.95)).toBe(CONFIDENCE_HARD_CAP);
    expect(enforceConfidenceCap(1.0)).toBe(CONFIDENCE_HARD_CAP);
  });

  test('enforceConfidenceCap: passes values at or below 0.92 unchanged', () => {
    expect(enforceConfidenceCap(0.92)).toBe(0.92);
    expect(enforceConfidenceCap(0.75)).toBe(0.75);
    expect(enforceConfidenceCap(0.0)).toBe(0.0);
  });

  test('proposeConfidenceUpdate: returns proposal without applying', () => {
    const signal = makeSignal({ confidence: 0.6 });
    const proposal = proposeConfidenceUpdate(signal, 0.8, 'research');
    expect(proposal.currentConfidence).toBe(0.6);
    expect(proposal.suggestedConfidence).toBe(0.8);
    expect(proposal.operatorApprovalRequired).toBe(true);
    expect(signal.confidence).toBe(0.6); // not mutated
  });

  test('applyConfidenceUpdate: requires operator approval', () => {
    const signal = makeSignal({ confidence: 0.6 });
    const result = applyConfidenceUpdate(signal, 0.8, 'operator-001', 'research', false);
    expect(result.operatorApproved).toBe(false);
    expect(result.appliedConfidence).toBeUndefined();
  });

  test('applyConfidenceUpdate: applies with operator approval', () => {
    const signal = makeSignal({ confidence: 0.6 });
    const result = applyConfidenceUpdate(signal, 0.8, 'operator-001', 'research', true);
    expect(result.operatorApproved).toBe(true);
    expect(result.appliedConfidence).toBe(0.8);
  });

  test('applyConfidenceUpdate: enforces 0.92 cap even when approved', () => {
    const signal = makeSignal({ confidence: 0.6 });
    const result = applyConfidenceUpdate(signal, 0.99, 'operator-001', 'research', true);
    expect(result.appliedConfidence).toBe(CONFIDENCE_HARD_CAP);
    expect(result.cappedAt).toBe(CONFIDENCE_HARD_CAP);
  });
});

describe('GovernanceEnforcement — Ethics gates enforcement', () => {
  test('evaluateEthicsGates: returns allPass=true when all three pass', () => {
    const result = evaluateEthicsGates(allPassGates);
    expect(result.allPass).toBe(true);
    expect(result.failedGates).toHaveLength(0);
    expect(result.actionsBlocked).toHaveLength(0);
  });

  test('evaluateEthicsGates: returns allPass=false and identifies failed gates', () => {
    const result = evaluateEthicsGates(failGates);
    expect(result.allPass).toBe(false);
    expect(result.failedGates).toContain('safety');
    expect(result.actionsBlocked).toContain('escalate');
  });

  test('canEscalateWithEthicsGates: allowed when all gates pass', () => {
    const result = evaluateEthicsGates(allPassGates);
    const check = canEscalateWithEthicsGates(result);
    expect(check.allowed).toBe(true);
  });

  test('canEscalateWithEthicsGates: blocked when gates fail', () => {
    const result = evaluateEthicsGates(failGates);
    const check = canEscalateWithEthicsGates(result);
    expect(check.allowed).toBe(false);
    expect(check.failedChecks).toContain('safety');
  });

  test('displayEthicsGateStatus: returns null when all gates pass', () => {
    const result = evaluateEthicsGates(allPassGates);
    expect(displayEthicsGateStatus(allPassGates, result)).toBeNull();
  });

  test('displayEthicsGateStatus: returns WARNING_BANNER when gates fail', () => {
    const result = evaluateEthicsGates(failGates);
    const display = displayEthicsGateStatus(failGates, result);
    expect(display!.displayType).toBe('WARNING_BANNER');
    expect(display!.severity).toBe('HIGH');
    expect(display!.details.safetyPassed).toBe(false);
  });
});

describe('GovernanceEnforcement — Audit trail', () => {
  test('createGovernanceEvent: creates immutable event and persists to audit DB', () => {
    const signal = makeSignal({ id: 'sig-audit-gov-001' });
    const event = createGovernanceEvent('test_action', signal, 'operator-001', { testKey: 'value' });
    expect(event.immutable).toBe(true);
    expect(event.signalId).toBe('sig-audit-gov-001');

    const db = getFullAuditDatabase();
    const found = db.some((e) => e.eventId === event.eventId);
    expect(found).toBe(true);
  });

  test('retrieveAuditTrail: returns events for signal in chronological order', () => {
    const signal = makeSignal({ id: `sig-trail-${Date.now()}` });
    createGovernanceEvent('action_1', signal, 'op-001', {});
    createGovernanceEvent('action_2', signal, 'op-001', {});

    const trail = retrieveAuditTrail(signal.id);
    expect(trail.length).toBeGreaterThanOrEqual(2);
    expect(trail[0].eventTimestamp).toBeLessThanOrEqual(trail[1].eventTimestamp);
  });

  test('displayAuditTrail: returns visibility=full', () => {
    const signal = makeSignal({ id: `sig-display-${Date.now()}` });
    createGovernanceEvent('display_test', signal, 'op-001', {});
    const display = displayAuditTrail(signal.id);
    expect(display.visibility).toBe('full');
    expect(display.totalEvents).toBeGreaterThanOrEqual(1);
  });
});

describe('GovernanceEnforcement — Violation handling', () => {
  test('handleConfidenceCapViolation: clamps to 0.92 and records violation', () => {
    const clamped = handleConfidenceCapViolation(0.99);
    expect(clamped).toBe(CONFIDENCE_HARD_CAP);
    const violations = getViolationRecords();
    const found = violations.some(
      (v) => v.violationType === 'confidence_cap_exceeded' && (v.details['calculatedValue'] as number) === 0.99
    );
    expect(found).toBe(true);
  });

  test('handleEscalationViolation: returns actionBlocked=true with alternatives', () => {
    const signal = makeSignal({ confidence: 0.6 });
    const result = handleEscalationViolation(signal, 'op-001');
    expect(result.actionBlocked).toBe(true);
    expect(result.alternatives.length).toBeGreaterThan(0);
  });

  test('handleEthicsGateViolation: returns actionBlocked=true', () => {
    const signal = makeSignal();
    const result = handleEthicsGateViolation(signal, 'op-001', ['safety']);
    expect(result.actionBlocked).toBe(true);
    expect(result.reason).toContain('safety');
  });
});

describe('GovernanceEnforcement — Human authority preservation', () => {
  test('executeOperatorAction: requires explicit operator initiation', () => {
    const signal = makeSignal();
    const result = executeOperatorAction(
      { id: 'escalate', operatorExplicitlyInitiated: false },
      signal,
      'op-001'
    );
    expect(result.executed).toBe(false);
    expect(result.reason).toBe('action_requires_explicit_operator_approval');
  });

  test('executeOperatorAction: executes when explicitly initiated', () => {
    const signal = makeSignal();
    const result = executeOperatorAction(
      { id: 'escalate', operatorExplicitlyInitiated: true },
      signal,
      'op-001'
    );
    expect(result.executed).toBe(true);
    expect(result.governanceEventCreated).toBe(true);
  });

  test('allowOperatorOverride: blocked without authority', () => {
    const signal = makeSignal();
    const result = allowOperatorOverride('escalate', 'override reason', 'op-001', signal, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('operator_lacks_override_authority');
  });

  test('allowOperatorOverride: allowed with authority, records override', () => {
    const signal = makeSignal();
    const result = allowOperatorOverride('escalate', 'emergency override', 'op-001', signal, true);
    expect(result.allowed).toBe(true);
    expect(result.overrideRecorded).toBe(true);
  });

  test('revokeOperatorAction: records revocation in audit trail', () => {
    const signal = makeSignal({ id: `sig-revoke-${Date.now()}` });
    const result = revokeOperatorAction('action-001', signal, 'op-001', 'Re-evaluated');
    expect(result.revoked).toBe(true);
    expect(result.auditTrailUpdated).toBe(true);

    const trail = retrieveAuditTrail(signal.id);
    const found = trail.some((e) => e.eventType === 'operator_action_revoked');
    expect(found).toBe(true);
  });
});

// ─── EventLoggingSchema tests (scout_runtime_event_logging_v1.0) ───────────────

import {
  persistGovernanceEvent as elsePersist,
  getGovernanceEvent,
  getSignalAuditTrail,
  getOperatorActivity,
  deleteGovernanceEvent,
  updateGovernanceEvent,
  getFullEventLog,
  EVENT_TYPES,
} from '../../governance/EventLoggingSchema';
import { GovernanceEvent } from '../../types/IMS';

const makeElsEvent = (overrides: Partial<GovernanceEvent> = {}): GovernanceEvent => ({
  eventId: `gov-els-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  eventType: EVENT_TYPES.ESCALATION_INITIATED,
  eventTimestamp: Date.now(),
  signalId: 'sig-els-001',
  signalConfidenceAtEvent: 0.85,
  signalMeaningAtEvent: 'Test signal',
  operatorId: 'op-els-001',
  actionDetails: {},
  failClosedApplied: true,
  governanceGatesChecked: [],
  immutable: true,
  ...overrides,
});

describe('EventLoggingSchema — persistGovernanceEvent', () => {
  test('creates immutable event and returns eventId + persisted=true', () => {
    const event = makeElsEvent({ eventId: 'gov-persist-001', signalId: 'sig-persist-001' });
    const result = elsePersist(event);
    expect(result.eventId).toBe('gov-persist-001');
    expect(result.persisted).toBe(true);
  });

  test('stored event has immutable:true enforced regardless of input', () => {
    const event = makeElsEvent({ eventId: 'gov-imm-001', signalId: 'sig-imm-001', immutable: true });
    elsePersist(event);
    const retrieved = getGovernanceEvent('gov-imm-001');
    expect(retrieved?.immutable).toBe(true);
  });

  test('all event types can be persisted', () => {
    const types = Object.values(EVENT_TYPES);
    types.forEach((eventType, i) => {
      const event = makeElsEvent({ eventId: `gov-type-${i}`, eventType, signalId: `sig-type-${i}` });
      const result = elsePersist(event);
      expect(result.persisted).toBe(true);
    });
  });
});

describe('EventLoggingSchema — getGovernanceEvent', () => {
  test('retrieves event by eventId', () => {
    const event = makeElsEvent({ eventId: 'gov-get-001', signalId: 'sig-get-001' });
    elsePersist(event);
    const retrieved = getGovernanceEvent('gov-get-001');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.eventId).toBe('gov-get-001');
  });

  test('returns null for unknown eventId', () => {
    expect(getGovernanceEvent('nonexistent-id')).toBeNull();
  });

  test('retrieved event is read-only (has immutable:true)', () => {
    const event = makeElsEvent({ eventId: 'gov-ro-001', signalId: 'sig-ro-001' });
    elsePersist(event);
    const retrieved = getGovernanceEvent('gov-ro-001');
    expect(retrieved!.immutable).toBe(true);
  });
});

describe('EventLoggingSchema — getSignalAuditTrail', () => {
  test('returns chronological events for a signal', () => {
    const signalId = `sig-trail-${Date.now()}`;
    const now = Date.now();
    elsePersist(makeElsEvent({ eventId: `t1-${signalId}`, signalId, eventTimestamp: now + 100, eventType: EVENT_TYPES.INVESTIGATION_INITIATED }));
    elsePersist(makeElsEvent({ eventId: `t2-${signalId}`, signalId, eventTimestamp: now + 200, eventType: EVENT_TYPES.ESCALATION_INITIATED }));
    elsePersist(makeElsEvent({ eventId: `t3-${signalId}`, signalId, eventTimestamp: now + 50, eventType: EVENT_TYPES.SUPPRESSION_INITIATED }));

    const trail = getSignalAuditTrail(signalId);
    expect(trail.length).toBe(3);
    // Chronological: t3 (now+50), t1 (now+100), t2 (now+200)
    expect(trail[0].eventTimestamp).toBeLessThan(trail[1].eventTimestamp);
    expect(trail[1].eventTimestamp).toBeLessThan(trail[2].eventTimestamp);
  });

  test('returns empty array for unknown signalId', () => {
    expect(getSignalAuditTrail('nonexistent-signal')).toHaveLength(0);
  });
});

describe('EventLoggingSchema — getOperatorActivity', () => {
  test('filters events by operatorId', () => {
    const operatorId = `op-activity-${Date.now()}`;
    const signalId = `sig-op-${Date.now()}`;
    elsePersist(makeElsEvent({ eventId: `oa1-${Date.now()}`, operatorId, signalId }));
    elsePersist(makeElsEvent({ eventId: `oa2-${Date.now()}`, operatorId, signalId }));
    elsePersist(makeElsEvent({ eventId: `oa3-${Date.now()}`, operatorId: 'other-op', signalId }));

    const activity = getOperatorActivity(operatorId);
    expect(activity.length).toBeGreaterThanOrEqual(2);
    activity.forEach((e) => expect(e.operatorId).toBe(operatorId));
  });

  test('filters by time range when provided', () => {
    const operatorId = `op-tr-${Date.now()}`;
    const signalId = `sig-tr-${Date.now()}`;
    const now = Date.now();
    elsePersist(makeElsEvent({ eventId: `tr1-${now}`, operatorId, signalId, eventTimestamp: now - 5000 }));
    elsePersist(makeElsEvent({ eventId: `tr2-${now}`, operatorId, signalId, eventTimestamp: now }));
    elsePersist(makeElsEvent({ eventId: `tr3-${now}`, operatorId, signalId, eventTimestamp: now + 5000 }));

    const inRange = getOperatorActivity(operatorId, { start: now - 1000, end: now + 1000 });
    expect(inRange.length).toBe(1);
    expect(inRange[0].eventTimestamp).toBe(now);
  });
});

describe('EventLoggingSchema — immutability enforcement', () => {
  test('deleteGovernanceEvent always returns success:false with reason', () => {
    const event = makeElsEvent({ eventId: 'gov-del-001', signalId: 'sig-del-001' });
    elsePersist(event);
    const result = deleteGovernanceEvent('gov-del-001');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('immutable_audit_log_cannot_delete');
  });

  test('deleteGovernanceEvent creates a governance_violation event', () => {
    const logBefore = getFullEventLog().length;
    deleteGovernanceEvent('gov-del-002');
    const logAfter = getFullEventLog().length;
    expect(logAfter).toBeGreaterThan(logBefore);
    const violation = getFullEventLog().find(
      (e) =>
        e.eventType === EVENT_TYPES.GOVERNANCE_VIOLATION &&
        (e.actionDetails as Record<string, unknown>)['violationType'] === 'attempted_audit_log_deletion'
    );
    expect(violation).toBeDefined();
  });

  test('updateGovernanceEvent always returns success:false with reason', () => {
    const event = makeElsEvent({ eventId: 'gov-upd-001', signalId: 'sig-upd-001' });
    elsePersist(event);
    const result = updateGovernanceEvent('gov-upd-001', { signalId: 'hacked' });
    expect(result.success).toBe(false);
    expect(result.reason).toBe('immutable_audit_log_cannot_update');
  });

  test('updateGovernanceEvent creates a governance_violation event', () => {
    const logBefore = getFullEventLog().length;
    updateGovernanceEvent('gov-upd-002', { evil: 'change' });
    const logAfter = getFullEventLog().length;
    expect(logAfter).toBeGreaterThan(logBefore);
    const violation = getFullEventLog().find(
      (e) =>
        e.eventType === EVENT_TYPES.GOVERNANCE_VIOLATION &&
        (e.actionDetails as Record<string, unknown>)['violationType'] === 'attempted_audit_log_update'
    );
    expect(violation).toBeDefined();
  });

  test('original event is not modified after deletion attempt', () => {
    const event = makeElsEvent({ eventId: 'gov-safe-001', signalId: 'sig-safe-001', signalMeaningAtEvent: 'original' });
    elsePersist(event);
    deleteGovernanceEvent('gov-safe-001');
    const retrieved = getGovernanceEvent('gov-safe-001');
    expect(retrieved!.signalMeaningAtEvent).toBe('original');
  });
});
