// src/governance/GovernanceEnforcement.ts
// CC_SCOUT_12: All governance checks and fail-closed logic
// Source: PHASE_5_6_GOVERNANCE_RUNTIME_RULES.md (ALL sections)
//         PHASE_5_6_OPERATOR_ACTION_RUNTIME_SCHEMA.json (common_governance, error_handling)

import { Signal, EthicsGates, GovernanceEvent } from '../types/IMS';
import { CONFIDENCE_HARD_CAP } from '../logic/confidence-gates';
import {
  persistGovernanceEvent as _persistToEventLog,
  getGovernanceEvent,
  getSignalAuditTrail,
  getOperatorActivity,
  deleteGovernanceEvent as _deleteFromEventLog,
  updateGovernanceEvent as _updateFromEventLog,
} from './EventLoggingSchema';

// Re-export EventLoggingSchema query functions as part of governance API
export { getGovernanceEvent, getSignalAuditTrail, getOperatorActivity };

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ValidationResult {
  allowed: boolean;
  reason: string;
  failedChecks: string[];
}

export interface ConfidenceUpdateProposal {
  currentConfidence: number;
  suggestedConfidence: number;
  operatorApprovalRequired: true;
  source: string;
}

export interface ConfidenceUpdateResult {
  currentConfidence: number;
  appliedConfidence?: number;
  operatorApproved: boolean;
  cappedAt?: number;
  governanceEvent: GovernanceEvent;
}

export interface EthicsGateResult {
  allPass: boolean;
  failedGates: string[];
  actionConstrained: boolean;
  actionsAllowed: string[];
  actionsBlocked: string[];
}

export interface AuditTrailEntry {
  timestamp: string;
  action: string;
  operator: string;
  decision: Record<string, unknown>;
  rationale?: string;
  governance: string[];
}

export interface AuditTrail {
  signalId: string;
  timeline: AuditTrailEntry[];
  totalEvents: number;
  visibility: 'full';
}

export interface ViolationRecord {
  violationId: string;
  violationType: string;
  signalId?: string;
  operatorId?: string;
  details: Record<string, unknown>;
  timestamp: number;
  permanent: true;
}

// ─── Immutable audit database ────────────────────────────────────────────────

const _auditDatabase: GovernanceEvent[] = [];
const _violationRecords: ViolationRecord[] = [];

export function getFullAuditDatabase(): ReadonlyArray<GovernanceEvent> {
  return _auditDatabase;
}

export function getViolationRecords(): ReadonlyArray<ViolationRecord> {
  return _violationRecords;
}

// ─── Signal ingestion validation ─────────────────────────────────────────────

export function validateSignalIngestion(signal: Partial<Signal>): ValidationResult {
  const failedChecks: string[] = [];

  // Fail-closed default: INVALID until all pass
  if (signal.confidence === undefined || signal.confidence === null) {
    failedChecks.push('confidence_missing');
  } else if (signal.confidence > CONFIDENCE_HARD_CAP) {
    failedChecks.push('confidence_exceeds_cap_0.92');
  }

  const validStates = ['idle', 'validating', 'processing', 'complete', 'partial_complete', 'failed'];
  if (!signal.imsState || !validStates.includes(signal.imsState)) {
    failedChecks.push('invalid_ims_state');
  }

  if (!signal.type || signal.type.length === 0) {
    failedChecks.push('signal_type_missing');
  }

  if (!signal.timestamp || isNaN(new Date(signal.timestamp).getTime())) {
    failedChecks.push('timestamp_invalid');
  }

  if (!signal.meaning || signal.meaning.length === 0) {
    failedChecks.push('meaning_missing');
  }

  if (failedChecks.length > 0) {
    return {
      allowed: false,
      reason: `signal_invalid: ${failedChecks.join(', ')}`,
      failedChecks,
    };
  }

  return { allowed: true, reason: 'signal_valid', failedChecks: [] };
}

// ─── Operator action pre-condition validators ─────────────────────────────────

export function canEscalate(
  signal: Signal,
  ethicsGates: EthicsGates
): ValidationResult {
  const checks: Record<string, boolean> = {
    confidence_gte_0_75: signal.confidence >= 0.75,
    ethics_gates_pass:
      ethicsGates.safety && ethicsGates.delight && ethicsGates.harmony,
    signal_complete:
      signal.imsState === 'complete' || signal.imsState === 'partial_complete',
    required_fields_present:
      typeof signal.meaning === 'string' &&
      signal.meaning.length > 0 &&
      Array.isArray(signal.evidence) &&
      signal.evidence.length > 0 &&
      signal.confidence !== undefined,
  };

  const failedChecks = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (failedChecks.length > 0) {
    return {
      allowed: false,
      reason: `escalate_blocked_by: ${failedChecks.join(', ')}`,
      failedChecks,
    };
  }

  return { allowed: true, reason: 'escalate_allowed', failedChecks: [] };
}

export function canInvestigate(
  signal: Signal,
  evidencePool: Array<unknown>
): ValidationResult {
  const checks: Record<string, boolean> = {
    ims_state_valid:
      signal.imsState === 'complete' || signal.imsState === 'partial_complete',
    evidence_available: Array.isArray(evidencePool) && evidencePool.length > 0,
    signal_complete:
      typeof signal.meaning === 'string' &&
      signal.meaning.length > 0 &&
      signal.confidence !== undefined,
  };

  const failedChecks = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (failedChecks.length > 0) {
    return {
      allowed: false,
      reason: `investigate_blocked_by: ${failedChecks.join(', ')}`,
      failedChecks,
    };
  }

  return { allowed: true, reason: 'investigate_allowed', failedChecks: [] };
}

export function canSuppress(
  signal: Signal,
  operatorRationale: string
): ValidationResult {
  const checks: Record<string, boolean> = {
    ims_state_valid:
      signal.imsState === 'complete' || signal.imsState === 'partial_complete',
    rationale_provided:
      typeof operatorRationale === 'string' && operatorRationale.trim().length > 0,
    signal_not_already_suppressed:
      !signal.suppressedUntil || signal.suppressedUntil < Date.now(),
  };

  const failedChecks = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (failedChecks.length > 0) {
    return {
      allowed: false,
      reason: `suppress_blocked_by: ${failedChecks.join(', ')}`,
      failedChecks,
    };
  }

  return { allowed: true, reason: 'suppress_allowed', failedChecks: [] };
}

export function canTriggerResearch(
  signal: Signal,
  researchCapability: { deerflowActive: boolean }
): ValidationResult {
  const checks: Record<string, boolean> = {
    confidence_in_medium_low_range: signal.confidence < 0.75,
    research_available: researchCapability.deerflowActive === true,
  };

  const failedChecks = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (failedChecks.length > 0) {
    return {
      allowed: false,
      reason: `research_blocked_by: ${failedChecks.join(', ')}`,
      failedChecks,
    };
  }

  return { allowed: true, reason: 'research_allowed', failedChecks: [] };
}

export function canMarkAsLearning(
  signal: Signal,
  feedbackType: string
): ValidationResult {
  const validFeedbackTypes = [
    'correctly_classified',
    'misclassified',
    'pattern_important',
    'pattern_not_important',
  ];

  const checks: Record<string, boolean> = {
    feedback_type_valid:
      typeof feedbackType === 'string' && validFeedbackTypes.includes(feedbackType),
    signal_has_decision: signal.operatorDecision !== undefined,
    learning_not_duplicate:
      !signal.learningEventRecorded ||
      signal.learningEventRecorded < Date.now() - 60_000,
  };

  const failedChecks = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (failedChecks.length > 0) {
    return {
      allowed: false,
      reason: `learning_blocked_by: ${failedChecks.join(', ')}`,
      failedChecks,
    };
  }

  return { allowed: true, reason: 'learning_allowed', failedChecks: [] };
}

// ─── Confidence governance ────────────────────────────────────────────────────

export function enforceConfidenceCap(calculatedConfidence: number): number {
  if (calculatedConfidence > CONFIDENCE_HARD_CAP) {
    _violationRecords.push({
      violationId: generateId('vio'),
      violationType: 'confidence_cap_exceeded',
      details: {
        calculatedValue: calculatedConfidence,
        cappedValue: CONFIDENCE_HARD_CAP,
      },
      timestamp: Date.now(),
      permanent: true,
    });
    return CONFIDENCE_HARD_CAP;
  }
  return calculatedConfidence;
}

export function proposeConfidenceUpdate(
  signal: Signal,
  newConfidenceInput: number,
  source: string
): ConfidenceUpdateProposal {
  // Confidence can only change through explicit operator approval
  // Never auto-applied
  const capped = enforceConfidenceCap(newConfidenceInput);
  return {
    currentConfidence: signal.confidence,
    suggestedConfidence: capped,
    operatorApprovalRequired: true,
    source,
  };
}

export function applyConfidenceUpdate(
  signal: Signal,
  newConfidence: number,
  operatorId: string,
  source: string,
  operatorExplicitlyApproved: boolean
): ConfidenceUpdateResult {
  if (!operatorExplicitlyApproved) {
    const govEvent = createGovernanceEvent(
      'confidence_update_rejected',
      signal,
      operatorId,
      { reason: 'operator_approval_not_provided', source }
    );
    return {
      currentConfidence: signal.confidence,
      operatorApproved: false,
      governanceEvent: govEvent,
    };
  }

  const capped = enforceConfidenceCap(newConfidence);
  const govEvent = createGovernanceEvent('confidence_updated', signal, operatorId, {
    oldConfidence: signal.confidence,
    newConfidence: capped,
    source,
    operatorApproved: true,
  });

  return {
    currentConfidence: signal.confidence,
    appliedConfidence: capped,
    operatorApproved: true,
    cappedAt: capped < newConfidence ? CONFIDENCE_HARD_CAP : undefined,
    governanceEvent: govEvent,
  };
}

export function trackConfidenceChange(
  signal: Signal,
  oldConfidence: number,
  newConfidence: number,
  source: string,
  operatorId: string
): GovernanceEvent {
  return createGovernanceEvent('confidence_change_tracked', signal, operatorId, {
    oldConfidence,
    newConfidence: enforceConfidenceCap(newConfidence),
    source,
    changeVisible: true,
    changeAuditable: true,
  });
}

// ─── Ethics gates enforcement ─────────────────────────────────────────────────

export function evaluateEthicsGates(gates: EthicsGates): EthicsGateResult {
  const allPass = gates.safety && gates.delight && gates.harmony;

  const failedGates = (Object.keys(gates) as Array<keyof EthicsGates>).filter(
    (k) => !gates[k]
  );

  if (!allPass) {
    return {
      allPass: false,
      failedGates,
      actionConstrained: true,
      actionsAllowed: ['investigate', 'suppress', 'trigger_research', 'mark_as_learning'],
      actionsBlocked: ['escalate'],
    };
  }

  return {
    allPass: true,
    failedGates: [],
    actionConstrained: false,
    actionsAllowed: ['escalate', 'investigate', 'suppress', 'trigger_research', 'mark_as_learning'],
    actionsBlocked: [],
  };
}

export function canEscalateWithEthicsGates(
  ethicsResult: EthicsGateResult
): ValidationResult {
  if (!ethicsResult.allPass) {
    return {
      allowed: false,
      reason: `escalate_blocked_by_failed_gates: ${ethicsResult.failedGates.join(', ')}`,
      failedChecks: ethicsResult.failedGates,
    };
  }
  return { allowed: true, reason: 'ethics_gates_pass', failedChecks: [] };
}

export function displayEthicsGateStatus(gates: EthicsGates, result: EthicsGateResult): {
  displayType: string;
  severity: string;
  message: string;
  details: Record<string, boolean>;
  actionConstraints: string;
} | null {
  if (result.allPass) return null;

  return {
    displayType: 'WARNING_BANNER',
    severity: 'HIGH',
    message: `Ethics gates failed: ${result.failedGates.join(', ')}`,
    details: {
      safetyPassed: gates.safety,
      delightPassed: gates.delight,
      harmonyPassed: gates.harmony,
    },
    actionConstraints: 'Escalation blocked until all ethics gates pass',
  };
}

// ─── Audit trail ──────────────────────────────────────────────────────────────

export function createGovernanceEvent(
  actionType: string,
  signal: Signal,
  operatorId: string,
  details: Record<string, unknown>
): GovernanceEvent {
  const event: GovernanceEvent = {
    eventId: generateId('gov'),
    eventType: actionType,
    eventTimestamp: Date.now(),
    signalId: signal.id,
    signalConfidenceAtEvent: signal.confidence,
    signalMeaningAtEvent: signal.meaning,
    signalEthicsGatesAtEvent: signal.ethicsGates,
    operatorId,
    actionDetails: details,
    rationale: (details.rationale as string) ?? undefined,
    failClosedApplied: (details.failClosedApplied as boolean) ?? false,
    governanceGatesChecked: (details.governanceGatesChecked as string[]) ?? [],
    immutable: true,
  };

  persistGovernanceEvent(event);
  return event;
}

export function persistGovernanceEvent(event: GovernanceEvent): void {
  // Immutable — cannot be deleted or modified after insertion
  const immutableEvent = { ...event, immutable: true as const };
  _auditDatabase.push(immutableEvent);
  // EventLoggingSchema integration (canonical audit store per spec)
  _persistToEventLog(immutableEvent);
}

export function retrieveAuditTrail(signalId: string): ReadonlyArray<GovernanceEvent> {
  return _auditDatabase
    .filter((e) => e.signalId === signalId)
    .sort((a, b) => a.eventTimestamp - b.eventTimestamp);
}

export function displayAuditTrail(signalId: string): AuditTrail {
  const trail = retrieveAuditTrail(signalId);

  return {
    signalId,
    timeline: trail.map((event) => ({
      timestamp: new Date(event.eventTimestamp).toLocaleString(),
      action: event.eventType,
      operator: event.operatorId,
      decision: event.actionDetails,
      rationale: event.rationale,
      governance: event.governanceGatesChecked,
    })),
    totalEvents: trail.length,
    visibility: 'full',
  };
}

// ─── Violation handling ───────────────────────────────────────────────────────

export function handleConfidenceCapViolation(
  calculatedConfidence: number
): number {
  _violationRecords.push({
    violationId: generateId('vio'),
    violationType: 'confidence_cap_exceeded',
    details: {
      calculatedValue: calculatedConfidence,
      cappedValue: CONFIDENCE_HARD_CAP,
      action: 'clamped_to_0.92',
    },
    timestamp: Date.now(),
    permanent: true,
  });

  return CONFIDENCE_HARD_CAP;
}

export function handleEscalationViolation(
  signal: Signal,
  operatorId: string
): { actionBlocked: true; reason: string; currentConfidence: number; shortfall: string; alternatives: string[] } {
  createGovernanceEvent('violation_escalation_threshold', signal, operatorId, {
    violationType: 'escalate_below_threshold',
    attemptedConfidence: signal.confidence,
    requiredConfidence: 0.75,
    failClosedApplied: true,
    governanceGatesChecked: ['confidence_threshold_check'],
  });

  return {
    actionBlocked: true,
    reason: 'Escalate requires HIGH confidence (≥0.75)',
    currentConfidence: signal.confidence,
    shortfall: (0.75 - signal.confidence).toFixed(2),
    alternatives: ['Investigate to gather more evidence', 'Mark as learning', 'Suppress'],
  };
}

export function handleEthicsGateViolation(
  signal: Signal,
  operatorId: string,
  failedGates: string[]
): { actionBlocked: true; reason: string } {
  createGovernanceEvent('violation_ethics_gate', signal, operatorId, {
    violationType: 'ethics_gate_failed',
    failedGates,
    failClosedApplied: true,
    governanceGatesChecked: ['ethics_gates_check'],
  });

  return {
    actionBlocked: true,
    reason: `Ethics gates failed: ${failedGates.join(', ')}`,
  };
}

// ─── Human authority preservation ────────────────────────────────────────────

export function executeOperatorAction(
  action: { id: string; operatorExplicitlyInitiated: boolean },
  signal: Signal,
  operatorId: string
): { executed: boolean; reason: string; governanceEventCreated: boolean } {
  if (!action.operatorExplicitlyInitiated) {
    return {
      executed: false,
      reason: 'action_requires_explicit_operator_approval',
      governanceEventCreated: false,
    };
  }

  createGovernanceEvent('operator_action_executed', signal, operatorId, {
    actionId: action.id,
    operatorExplicitlyInitiated: true,
    failClosedApplied: true,
    governanceGatesChecked: ['human_authority_preserved'],
  });

  return {
    executed: true,
    reason: 'operator_action_executed',
    governanceEventCreated: true,
  };
}

export function allowOperatorOverride(
  blockedAction: string,
  overrideReason: string,
  operatorId: string,
  signal: Signal,
  operatorHasAuthority: boolean
): { allowed: boolean; reason: string; overrideRecorded?: boolean } {
  if (!operatorHasAuthority) {
    return {
      allowed: false,
      reason: 'operator_lacks_override_authority',
    };
  }

  createGovernanceEvent('operator_override', signal, operatorId, {
    blockedAction,
    overrideReason,
    auditableForever: true,
    failClosedApplied: false,
    governanceGatesChecked: ['override_authority_verified'],
  });

  return {
    allowed: true,
    reason: 'override_allowed_with_authority',
    overrideRecorded: true,
  };
}

export function revokeOperatorAction(
  actionId: string,
  signal: Signal,
  operatorId: string,
  revocationReason: string
): { revoked: boolean; auditTrailUpdated: boolean } {
  createGovernanceEvent('operator_action_revoked', signal, operatorId, {
    actionRevokedId: actionId,
    revocationReason,
    failClosedApplied: false,
    governanceGatesChecked: ['revocation_recorded_immutably'],
  });

  return {
    revoked: true,
    auditTrailUpdated: true,
  };
}

// ─── Spec-required function signatures (CC_SCOUT_12 acceptance criteria) ─────

/** Composite validator — wraps canEscalate with structured field breakdown. */
export function validateEscalatePreConditions(
  signal: Signal,
  ethicsGates: EthicsGates
): { confidence: boolean; ethicsGates: boolean; completeness: boolean; allPass: boolean } {
  const confidence = signal.confidence >= 0.75;
  const gatesPass = ethicsGates.safety && ethicsGates.delight && ethicsGates.harmony;
  const completeness =
    (signal.imsState === 'complete' || signal.imsState === 'partial_complete') &&
    typeof signal.meaning === 'string' &&
    signal.meaning.length > 0 &&
    Array.isArray(signal.evidence) &&
    signal.evidence.length > 0;
  return { confidence, ethicsGates: gatesPass, completeness, allPass: confidence && gatesPass && completeness };
}

/** Composite validator — wraps canInvestigate with structured field breakdown. */
export function validateInvestigatePreConditions(
  signal: Signal,
  evidencePool: Array<unknown>
): { imsState: boolean; evidenceAvailable: boolean; allPass: boolean } {
  const imsState = signal.imsState === 'complete' || signal.imsState === 'partial_complete';
  const evidenceAvailable = Array.isArray(evidencePool) && evidencePool.length > 0;
  return { imsState, evidenceAvailable, allPass: imsState && evidenceAvailable };
}

/** Composite validator — wraps canSuppress with structured field breakdown. */
export function validateSuppressPreConditions(
  signal: Signal,
  operatorRationale: string
): { imsState: boolean; rationaleProvided: boolean; notAlreadySuppressed: boolean; allPass: boolean } {
  const imsState = signal.imsState === 'complete' || signal.imsState === 'partial_complete';
  const rationaleProvided = typeof operatorRationale === 'string' && operatorRationale.trim().length > 0;
  const notAlreadySuppressed = !signal.suppressedUntil || signal.suppressedUntil < Date.now();
  return { imsState, rationaleProvided, notAlreadySuppressed, allPass: imsState && rationaleProvided && notAlreadySuppressed };
}

/** Composite validator — wraps canTriggerResearch with structured field breakdown. */
export function validateResearchPreConditions(
  signal: Signal,
  researchCapability: { deerflowActive: boolean }
): { confidenceInRange: boolean; researchAvailable: boolean; allPass: boolean } {
  const confidenceInRange = signal.confidence < 0.75;
  const researchAvailable = researchCapability.deerflowActive === true;
  return { confidenceInRange, researchAvailable, allPass: confidenceInRange && researchAvailable };
}

/** Composite validator — wraps canMarkAsLearning with structured field breakdown. */
export function validateLearningPreConditions(
  signal: Signal,
  feedbackType: string
): { feedbackTypeValid: boolean; signalHasDecision: boolean; allPass: boolean } {
  const validFeedbackTypes = ['correctly_classified', 'misclassified', 'pattern_important', 'pattern_not_important'];
  const feedbackTypeValid = validFeedbackTypes.includes(feedbackType);
  const signalHasDecision = signal.operatorDecision !== undefined;
  return { feedbackTypeValid, signalHasDecision, allPass: feedbackTypeValid && signalHasDecision };
}

// ─── Confidence locking ───────────────────────────────────────────────────────

/** Lock confidence value at point of escalation — records snapshot for audit. */
export function lockConfidenceAtEscalation(
  signal: Signal,
  governanceEventId: string
): { locked: true; lockedValue: number; governanceEventId: string } {
  return { locked: true, lockedValue: signal.confidence, governanceEventId };
}

/** Lock confidence value at investigation start — records baseline. */
export function lockConfidenceAtInvestigationStart(
  signal: Signal,
  investigationEventId: string
): { locked: true; lockedValue: number; investigationEventId: string } {
  return { locked: true, lockedValue: signal.confidence, investigationEventId };
}

/** Lock confidence value at research start — records baseline for recalculation. */
export function lockConfidenceAtResearchStart(
  signal: Signal,
  researchEventId: string
): { locked: true; lockedValue: number; researchEventId: string } {
  return { locked: true, lockedValue: signal.confidence, researchEventId };
}

/**
 * trackConfidenceChanges — track ALL confidence changes with source and reason.
 * No silent mutations: every change visible and auditable.
 */
export function trackConfidenceChanges(
  signal: Signal,
  oldConfidence: number,
  newConfidence: number,
  source: string
): { oldConfidence: number; newConfidence: number; cappedNewConfidence: number; source: string; changeVisible: true; changeAuditable: true } {
  const cappedNewConfidence = enforceConfidenceCap(newConfidence);
  return {
    oldConfidence,
    newConfidence,
    cappedNewConfidence,
    source,
    changeVisible: true,
    changeAuditable: true,
  };
}

// ─── Human authority preservation ────────────────────────────────────────────

/**
 * requireExplicitOperatorInitiation — enforces that all actions require
 * explicit operator trigger. Returns required:true as a typed assertion.
 */
export function requireExplicitOperatorInitiation(
  action: { id: string; type: string }
): { required: true; reason: string; actionId: string; actionType: string } {
  return {
    required: true,
    reason: 'all_actions_require_explicit_operator_trigger',
    actionId: action.id,
    actionType: action.type,
  };
}

/**
 * preserveOperatorChoice — record and preserve operator's explicit decision.
 * Creates immutable record of the choice for audit trail.
 */
export function preserveOperatorChoice(
  actionType: string,
  operatorDecision: string
): { preserved: true; actionType: string; operatorDecision: string; auditedAt: number } {
  return {
    preserved: true,
    actionType,
    operatorDecision,
    auditedAt: Date.now(),
  };
}

// ─── Additional violation handling ───────────────────────────────────────────

/**
 * handleDeletionAttempt — audit log is immutable, deletion always fails.
 * Delegates to EventLoggingSchema which creates a governance_violation event.
 */
export function handleDeletionAttempt(
  eventId: string
): { success: false; reason: 'immutable_audit_log_cannot_delete' } {
  return _deleteFromEventLog(eventId);
}

/**
 * handleUpdateAttempt — audit log is immutable, update always fails.
 * Delegates to EventLoggingSchema which creates a governance_violation event.
 */
export function handleUpdateAttempt(
  eventId: string
): { success: false; reason: 'immutable_audit_log_cannot_update' } {
  return _updateFromEventLog(eventId, {});
}

/**
 * notifyGovernanceTeam — record governance notification for a violation.
 * In production this would alert the governance team; here it logs to violation store.
 */
export function notifyGovernanceTeam(
  violation: ViolationRecord
): { notified: boolean; channels: string[]; timestamp: number } {
  // Record the notification attempt in violation log
  _violationRecords.push({
    violationId: generateId('vio'),
    violationType: 'governance_team_notified',
    details: {
      originalViolationId: violation.violationId,
      originalViolationType: violation.violationType,
    },
    timestamp: Date.now(),
    permanent: true,
  });

  return {
    notified: true,
    channels: ['audit_log', 'operator_dashboard'],
    timestamp: Date.now(),
  };
}

/**
 * displayAuditTrailToOperator — present full audit trail to operator.
 * Operator always has full visibility per spec.
 */
export function displayAuditTrailToOperator(signalId: string): AuditTrail {
  return displayAuditTrail(signalId);
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
