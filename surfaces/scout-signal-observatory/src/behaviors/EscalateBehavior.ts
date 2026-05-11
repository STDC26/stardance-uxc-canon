// src/behaviors/EscalateBehavior.ts
// CC_SCOUT_07: Escalate operator action
// Source: PHASE_5_6_IBC_SECTION_1_FOUNDATION.md (Behavior 1)
//         PHASE_5_6_OPERATOR_ACTION_RUNTIME_SCHEMA.json (escalate)
//         PHASE_5_6_GOVERNANCE_RUNTIME_RULES.md (Section 4)

import { Signal, EthicsGates, GovernanceEvent } from '../types/IMS';

// ─── Pre-condition validators ────────────────────────────────────────────────

export function validateConfidenceForEscalation(confidence: number): boolean {
  return confidence >= 0.75;
}

export function validateEthicsGatesForEscalation(gates: EthicsGates): boolean {
  return gates.safety === true && gates.delight === true && gates.harmony === true;
}

export function validateSignalCompletenessForEscalation(signal: Signal): boolean {
  return (
    typeof signal.meaning === 'string' &&
    signal.meaning.length > 0 &&
    typeof signal.confidence === 'number' &&
    Array.isArray(signal.evidence) &&
    signal.evidence.length > 0
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EscalationResult {
  allowed: boolean;
  reason: string;
  governanceEvent?: GovernanceEvent;
  operatorFeedback?: string;
  newState?: 'escalated_pending_approval';
}

export interface EscalationRecord {
  escalationId: string;
  signalId: string;
  operatorId: string;
  timestamp: number;
  confidenceLocked: number;
  approvalHistory: ApprovalEntry[];
  withdrawn: boolean;
  canWithdraw: true;
  canCancel: true;
  cannotDelete: true;
  auditTrailPermanent: true;
}

export interface ApprovalEntry {
  action: 'approved' | 'rejected' | 'withdrawn' | 'pending';
  timestamp: number;
  authorityId?: string;
  reason?: string;
}

// In-memory immutable audit log (Phase 5.7 scope — persistence layer hook)
const _auditLog: GovernanceEvent[] = [];
const _escalationRecords: EscalationRecord[] = [];

export function getAuditLog(): ReadonlyArray<GovernanceEvent> {
  return _auditLog;
}

export function getEscalationRecords(): ReadonlyArray<EscalationRecord> {
  return _escalationRecords;
}

// ─── Runtime implementation ──────────────────────────────────────────────────

export function escalate(
  signal: Signal,
  operatorId: string
): EscalationResult {
  // Step 1: Validate confidence ≥ 0.75 (fail-closed)
  if (!validateConfidenceForEscalation(signal.confidence)) {
    return {
      allowed: false,
      reason: 'confidence_below_threshold',
      operatorFeedback: `Escalate requires HIGH confidence (≥0.75). Current: ${signal.confidence.toFixed(2)}`,
    };
  }

  // Step 2: Validate all ethics gates pass (fail-closed)
  const gates: EthicsGates = signal.ethicsGates ?? { safety: false, delight: false, harmony: false };
  if (!validateEthicsGatesForEscalation(gates)) {
    const failed = (Object.keys(gates) as Array<keyof EthicsGates>)
      .filter((k) => !gates[k])
      .join(', ');
    return {
      allowed: false,
      reason: 'ethics_gate_failed',
      operatorFeedback: `Escalation blocked — ethics gates failed: ${failed}`,
    };
  }

  // Step 3: Validate signal complete (fail-closed)
  if (!validateSignalCompletenessForEscalation(signal)) {
    return {
      allowed: false,
      reason: 'signal_incomplete',
      operatorFeedback: 'Signal is missing required fields (meaning, confidence, evidence)',
    };
  }

  // Step 4: Create governance event (immutable)
  const eventId = generateId('gov');
  const governanceEvent: GovernanceEvent = {
    eventId,
    eventType: 'escalation_initiated',
    eventTimestamp: Date.now(),
    signalId: signal.id,
    signalConfidenceAtEvent: signal.confidence,
    signalMeaningAtEvent: signal.meaning,
    signalEthicsGatesAtEvent: { ...gates },
    operatorId,
    actionDetails: {
      confidenceLocked: signal.confidence,
      imsStateAtEscalation: signal.imsState,
    },
    failClosedApplied: true,
    governanceGatesChecked: [
      'confidence_gte_0.75_verified',
      'ethics_gates_all_pass_verified',
      'signal_fields_complete_verified',
      'human_approval_required_set',
      'governance_event_immutable',
    ],
    immutable: true,
  };

  // Step 5: Route to review authority (priority determined from confidence band)
  const priority = signal.confidence >= 0.90 ? 'critical' : signal.confidence >= 0.75 ? 'high' : 'standard';

  // Step 6: Set approval requirement
  const escalationId = generateId('esc');
  const record: EscalationRecord = {
    escalationId,
    signalId: signal.id,
    operatorId,
    timestamp: Date.now(),
    confidenceLocked: signal.confidence,
    approvalHistory: [{ action: 'pending', timestamp: Date.now() }],
    withdrawn: false,
    canWithdraw: true,
    canCancel: true,
    cannotDelete: true,
    auditTrailPermanent: true,
  };

  // Step 7: Persist escalation (immutable audit log)
  _auditLog.push(governanceEvent);
  _escalationRecords.push(record);

  // Step 8: Emit operator feedback
  return {
    allowed: true,
    reason: 'escalate_allowed',
    governanceEvent,
    operatorFeedback: `Escalation sent for review. Awaiting human approval. Priority: ${priority}`,
    newState: 'escalated_pending_approval',
  };
}

// Withdraw an escalation (operator-initiated — creates audit record, cannot delete original)
export function withdrawEscalation(
  escalationId: string,
  operatorId: string,
  reason: string
): { success: boolean; reason: string } {
  const record = _escalationRecords.find((r) => r.escalationId === escalationId);
  if (!record) {
    return { success: false, reason: 'escalation_not_found' };
  }
  if (record.withdrawn) {
    return { success: false, reason: 'already_withdrawn' };
  }

  record.withdrawn = true;
  record.approvalHistory.push({
    action: 'withdrawn',
    timestamp: Date.now(),
    authorityId: operatorId,
    reason,
  });

  // Governance event for withdrawal (immutable)
  _auditLog.push({
    eventId: generateId('gov'),
    eventType: 'escalation_withdrawn',
    eventTimestamp: Date.now(),
    signalId: record.signalId,
    signalConfidenceAtEvent: record.confidenceLocked,
    signalMeaningAtEvent: '',
    operatorId,
    actionDetails: { escalationId, withdrawalReason: reason },
    rationale: reason,
    failClosedApplied: false,
    governanceGatesChecked: [],
    immutable: true,
  });

  return { success: true, reason: 'escalation_withdrawn' };
}

// ─── Learning effects ────────────────────────────────────────────────────────

export interface EscalationLearningEffect {
  escalationId: string;
  operatorId: string;
  confidenceAtEscalation: number;
  timestamp: number;
  type: 'escalation_event_recorded';
}

const _learningEffects: EscalationLearningEffect[] = [];

export function recordEscalationLearning(
  escalationId: string,
  operatorId: string,
  confidence: number
): EscalationLearningEffect {
  const effect: EscalationLearningEffect = {
    escalationId,
    operatorId,
    confidenceAtEscalation: confidence,
    timestamp: Date.now(),
    type: 'escalation_event_recorded',
  };
  _learningEffects.push(effect);
  return effect;
}

export function getEscalationLearningEffects(): ReadonlyArray<EscalationLearningEffect> {
  return _learningEffects;
}

// ─── Spec-required function signatures (CC_SCOUT_07 acceptance criteria) ─────

export interface Operator {
  id: string;
}

/** Composite pre-condition validator — returns per-gate booleans and allPass. */
export function validateEscalatePreConditions(
  signal: Signal,
  ethicsGates: EthicsGates
): { confidence: boolean; ethicsGates: boolean; completeness: boolean; allPass: boolean } {
  const confidence = validateConfidenceForEscalation(signal.confidence);
  const gates = validateEthicsGatesForEscalation(ethicsGates);
  const completeness = validateSignalCompletenessForEscalation(signal);
  return { confidence, ethicsGates: gates, completeness, allPass: confidence && gates && completeness };
}

/**
 * canEscalate — check without executing.
 * Validates all pre-conditions; returns allowed + reason on first failure.
 */
export function canEscalate(
  signal: Signal,
  ethicsGates: EthicsGates
): { allowed: boolean; reason?: string } {
  const checks = validateEscalatePreConditions(signal, ethicsGates);
  if (!checks.confidence) return { allowed: false, reason: 'confidence_below_threshold' };
  if (!checks.ethicsGates) return { allowed: false, reason: 'ethics_gate_failed' };
  if (!checks.completeness) return { allowed: false, reason: 'signal_incomplete' };
  return { allowed: true };
}

/**
 * executeEscalate — full execution with governance.
 *
 * CRITICAL: ethicsGates is re-validated INSIDE this function at the execution
 * boundary, not relying on a prior canEscalate() call. This prevents bypass
 * when gates could change between check and execution.
 */
export function executeEscalate(
  signal: Signal,
  operator: Operator,
  ethicsGates: EthicsGates
): { executed: boolean; governanceEventId?: string; escalationState?: string; reason?: string } {
  // Re-validate ALL pre-conditions at execution boundary (fail-closed)
  const checks = validateEscalatePreConditions(signal, ethicsGates);
  if (!checks.confidence) return { executed: false, reason: 'confidence_below_threshold' };
  if (!checks.ethicsGates) return { executed: false, reason: 'ethics_gate_failed' };
  if (!checks.completeness) return { executed: false, reason: 'signal_incomplete' };

  // Merge explicit ethicsGates into signal before calling core escalate()
  const signalWithGates: Signal = { ...signal, ethicsGates };
  const result = escalate(signalWithGates, operator.id);

  if (!result.allowed) {
    return { executed: false, reason: result.reason };
  }

  return {
    executed: true,
    governanceEventId: result.governanceEvent?.eventId,
    escalationState: 'escalated_pending_approval',
    reason: result.reason,
  };
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
