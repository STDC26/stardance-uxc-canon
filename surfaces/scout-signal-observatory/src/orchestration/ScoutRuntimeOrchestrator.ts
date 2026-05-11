// src/orchestration/ScoutRuntimeOrchestrator.ts
// CC_SCOUT_13: Integrate all Phase 5.7 behaviors into orchestrated runtime
// Source: PHASE_5_6_RUNTIME_ORCHESTRATION_TOPOLOGY.md
//         PHASE_5_6_STATE_MACHINE_EXTENSION.md

import { IMSState, EthicsGates, Signal, GovernanceEvent } from '../types/IMS';
import { InMemorySignalStore } from '../persistence/signal-store';
import type { NormalizedSignal } from '../ingestion/normalization-pipeline';

import { escalate, withdrawEscalation, EscalationResult } from '../behaviors/EscalateBehavior';
import {
  investigate,
  InvestigationResult,
  executeInvestigate,
  getInvestigationResults,
} from '../behaviors/InvestigateBehavior';
import {
  suppress,
  revokeSuppress,
  SuppressionResult,
  SuppressionRationale,
  SuppressionDuration,
} from '../behaviors/SuppressBehavior';
import {
  triggerResearch,
  applyResearchDecision,
  ResearchResult,
  ResearchCapability,
  executeResearch,
  getResearchResults,
} from '../behaviors/ResearchBehavior';
import { markAsLearning, retractLearningEvent, LearningResult, Operator } from '../behaviors/LearningBehavior';

import {
  canEscalate,
  canInvestigate,
  canSuppress,
  canTriggerResearch,
  canMarkAsLearning,
  evaluateEthicsGates,
  createGovernanceEvent,
  persistGovernanceEvent,
  retrieveAuditTrail,
  enforceConfidenceCap,
  EthicsGateResult,
} from '../governance/GovernanceEnforcement';

// ─── Extended state machine types ────────────────────────────────────────────

interface StateTransition {
  from: IMSState;
  to: IMSState;
  trigger: string;
  guard: (ctx: OrchestratorContext) => boolean;
  action?: (ctx: OrchestratorContext) => void;
  timeoutMs?: number;
}

export interface OrchestratorContext {
  signal?: Signal;
  operatorId?: string;
  ethicsGates?: EthicsGates;
  ethicsGateResult?: EthicsGateResult;
  suppressionRationale?: string;
  suppressionCategory?: SuppressionRationale;
  suppressionDuration?: SuppressionDuration;
  feedbackType?: string;
  researchId?: string;
  escalationId?: string;
  researchCapability?: ResearchCapability;
  lastActionResult?: unknown;
  previousState?: IMSState;
  stateEnteredAt?: number;
  error?: string;
}

export interface OrchestratorActionResult {
  success: boolean;
  previousState: IMSState;
  newState: IMSState;
  reason: string;
  operatorFeedback?: string;
  governanceEvent?: GovernanceEvent;
  payload?: unknown;
}

// ─── Scout Runtime Orchestrator ──────────────────────────────────────────────

export class ScoutRuntimeOrchestrator {
  private currentState: IMSState = 'idle';
  private ctx: OrchestratorContext = {};
  private listeners: Map<string, Array<(data: unknown) => void>> = new Map();
  private timeoutHandles: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // Optional persistence store — injected at construction for testability.
  private store: InMemorySignalStore | null = null;

  constructor(store?: InMemorySignalStore) {
    if (store) this.store = store;
  }

  // Persist a normalized signal snapshot after a behavior executes.
  private async persistSignalSnapshot(signal: NormalizedSignal, event?: GovernanceEvent): Promise<void> {
    if (!this.store) return;
    await this.store.storeSignal(signal);
    if (event) {
      this.store.appendGovernanceEvent(signal.signalId, event);
    }
  }

  // Extended state machine — all 11 states with guarded transitions
  private transitions: StateTransition[] = [
    // ── Base transitions (Phase 5) ──
    {
      from: 'idle',
      to: 'validating',
      trigger: 'signal_received',
      guard: (ctx) => !!ctx.signal,
    },
    {
      from: 'validating',
      to: 'processing',
      trigger: 'validation_passed',
      guard: (ctx) =>
        !!ctx.signal &&
        typeof ctx.signal.confidence === 'number' &&
        ctx.signal.confidence <= 0.92,
    },
    {
      from: 'validating',
      to: 'failed',
      trigger: 'validation_failed',
      guard: (ctx) => !!ctx.error,
    },
    {
      from: 'processing',
      to: 'complete',
      trigger: 'confidence_high',
      guard: (ctx) =>
        !!ctx.signal &&
        ctx.signal.confidence >= 0.75 &&
        !!(ctx.ethicsGateResult?.allPass),
      timeoutMs: 30_000,
    },
    {
      from: 'processing',
      to: 'partial_complete',
      trigger: 'confidence_medium',
      guard: (ctx) =>
        !!ctx.signal &&
        ctx.signal.confidence >= 0.45 &&
        ctx.signal.confidence < 0.75,
      timeoutMs: 30_000,
    },
    {
      from: 'processing',
      to: 'failed',
      trigger: 'processing_error',
      guard: (ctx) => !!ctx.error,
    },

    // ── Extended transitions — from complete ──
    {
      from: 'complete',
      to: 'escalated_pending_approval',
      trigger: 'escalate_action',
      guard: (ctx) =>
        !!ctx.signal &&
        ctx.signal.confidence >= 0.75 &&
        !!(ctx.ethicsGateResult?.allPass),
    },
    {
      from: 'complete',
      to: 'investigating',
      trigger: 'investigate_action',
      guard: (ctx) =>
        !!ctx.signal &&
        Array.isArray(ctx.signal.evidence) &&
        ctx.signal.evidence.length > 0,
    },
    {
      from: 'complete',
      to: 'suppressed_with_memory',
      trigger: 'suppress_action',
      guard: (ctx) =>
        !!ctx.signal &&
        typeof ctx.suppressionRationale === 'string' &&
        ctx.suppressionRationale.trim().length > 0,
    },
    {
      from: 'complete',
      to: 'researching',
      trigger: 'research_action',
      guard: (ctx) => ctx.researchCapability?.deerflowActive === true,
    },
    {
      from: 'complete',
      to: 'learning_event_recorded',
      trigger: 'learning_action',
      guard: (ctx) => typeof ctx.feedbackType === 'string',
    },
    {
      from: 'complete',
      to: 'idle',
      trigger: 'reset',
      guard: () => true,
    },

    // ── Extended transitions — from partial_complete ──
    // Escalate from partial_complete is BLOCKED per spec (must investigate first)
    {
      from: 'partial_complete',
      to: 'investigating',
      trigger: 'investigate_action',
      guard: (ctx) =>
        !!ctx.signal &&
        Array.isArray(ctx.signal.evidence) &&
        ctx.signal.evidence.length > 0,
    },
    {
      from: 'partial_complete',
      to: 'suppressed_with_memory',
      trigger: 'suppress_action',
      guard: (ctx) =>
        !!ctx.signal &&
        typeof ctx.suppressionRationale === 'string' &&
        ctx.suppressionRationale.trim().length > 0,
    },
    {
      from: 'partial_complete',
      to: 'researching',
      trigger: 'research_action',
      guard: (ctx) => ctx.researchCapability?.deerflowActive === true,
    },
    {
      from: 'partial_complete',
      to: 'learning_event_recorded',
      trigger: 'learning_action',
      guard: (ctx) => typeof ctx.feedbackType === 'string',
    },
    {
      from: 'partial_complete',
      to: 'idle',
      trigger: 'reset',
      guard: () => true,
    },

    // ── Extended transitions — from escalated_pending_approval ──
    {
      from: 'escalated_pending_approval',
      to: 'complete',
      trigger: 'escalation_resolved',
      guard: () => true,
    },

    // ── Extended transitions — from investigating ──
    {
      from: 'investigating',
      to: 'complete',
      trigger: 'investigation_complete',
      guard: () => true,
      timeoutMs: 300_000, // 5 min
    },
    {
      from: 'investigating',
      to: 'escalated_pending_approval',
      trigger: 'escalate_action',
      guard: (ctx) =>
        !!ctx.signal &&
        ctx.signal.confidence >= 0.75 &&
        !!(ctx.ethicsGateResult?.allPass),
    },
    {
      from: 'investigating',
      to: 'suppressed_with_memory',
      trigger: 'suppress_action',
      guard: (ctx) =>
        typeof ctx.suppressionRationale === 'string' &&
        ctx.suppressionRationale.trim().length > 0,
    },
    {
      from: 'investigating',
      to: 'researching',
      trigger: 'research_action',
      guard: (ctx) => ctx.researchCapability?.deerflowActive === true,
    },
    {
      from: 'investigating',
      to: 'learning_event_recorded',
      trigger: 'learning_action',
      guard: (ctx) => typeof ctx.feedbackType === 'string',
    },
    {
      from: 'investigating',
      to: 'idle',
      trigger: 'cancel',
      guard: () => true,
    },

    // ── Extended transitions — from suppressed_with_memory ──
    {
      from: 'suppressed_with_memory',
      to: 'complete',
      trigger: 'suppression_resolved',
      guard: () => true,
    },
    {
      from: 'suppressed_with_memory',
      to: 'learning_event_recorded',
      trigger: 'learning_action',
      guard: (ctx) => typeof ctx.feedbackType === 'string',
    },

    // ── Extended transitions — from researching ──
    {
      from: 'researching',
      to: 'complete',
      trigger: 'research_complete',
      guard: () => true,
      timeoutMs: 600_000, // 10 min
    },
    {
      from: 'researching',
      to: 'partial_complete',
      trigger: 'research_complete_low',
      guard: () => true,
    },
    {
      from: 'researching',
      to: 'investigating',
      trigger: 'investigate_action',
      guard: (ctx) =>
        !!ctx.signal &&
        Array.isArray(ctx.signal.evidence) &&
        ctx.signal.evidence.length > 0,
    },
    {
      from: 'researching',
      to: 'learning_event_recorded',
      trigger: 'learning_action',
      guard: (ctx) => typeof ctx.feedbackType === 'string',
    },
    {
      from: 'researching',
      to: 'idle',
      trigger: 'cancel',
      guard: () => true,
    },

    // ── Extended transitions — from learning_event_recorded ──
    {
      from: 'learning_event_recorded',
      to: 'idle',
      trigger: 'reset',
      guard: () => true,
    },

    // ── Extended transitions — from failed ──
    {
      from: 'failed',
      to: 'validating',
      trigger: 'retry',
      guard: (ctx) => !!ctx.signal,
    },
    {
      from: 'failed',
      to: 'investigating',
      trigger: 'investigate_action',
      guard: (ctx) =>
        !!ctx.signal &&
        Array.isArray(ctx.signal.evidence) &&
        ctx.signal.evidence.length > 0,
    },
    {
      from: 'failed',
      to: 'idle',
      trigger: 'reset',
      guard: () => true,
    },
  ];

  // ─── State machine core ─────────────────────────────────────────────────────

  getState(): IMSState {
    return this.currentState;
  }

  getContext(): Readonly<OrchestratorContext> {
    return { ...this.ctx };
  }

  setContext(updates: Partial<OrchestratorContext>): void {
    this.ctx = { ...this.ctx, ...updates };
  }

  // Sync orchestrator state from signal's IMS state.
  // Called at the start of each action method so the orchestrator's
  // state machine reflects where the signal currently is.
  loadSignal(signal: Signal): void {
    const base: IMSState[] = ['idle', 'validating', 'processing', 'complete', 'partial_complete', 'failed'];
    if (base.includes(signal.imsState) && this.currentState !== signal.imsState) {
      this.currentState = signal.imsState;
      this.ctx.stateEnteredAt = Date.now();
    }
  }

  canTransition(toState: IMSState, trigger: string): boolean {
    const t = this.transitions.find(
      (tr) => tr.from === this.currentState && tr.to === toState && tr.trigger === trigger
    );
    if (!t) return false;
    return t.guard(this.ctx);
  }

  private transition(toState: IMSState, trigger: string): boolean {
    const t = this.transitions.find(
      (tr) => tr.from === this.currentState && tr.to === toState && tr.trigger === trigger
    );
    if (!t || !t.guard(this.ctx)) {
      return false;
    }

    if (t.action) t.action(this.ctx);

    this.clearTimeout(this.currentState);
    this.ctx.previousState = this.currentState;
    this.ctx.stateEnteredAt = Date.now();
    this.currentState = toState;

    if (t.timeoutMs) {
      this.scheduleTimeout(toState, t.timeoutMs);
    }

    this.emit('state_changed', { from: this.ctx.previousState, to: toState, trigger });
    return true;
  }

  // ─── Operator action methods ────────────────────────────────────────────────

  async doEscalate(signal: Signal, operatorId: string): Promise<OrchestratorActionResult> {
    this.loadSignal(signal);
    const prev = this.currentState;

    // Governance pre-check
    const ethicsGates = signal.ethicsGates ?? { safety: false, delight: false, harmony: false };
    const ethicsResult = evaluateEthicsGates(ethicsGates);
    const govCheck = canEscalate(signal, ethicsGates);

    if (!govCheck.allowed) {
      return {
        success: false,
        previousState: prev,
        newState: prev,
        reason: govCheck.reason,
        operatorFeedback: `Escalation blocked: ${govCheck.reason}`,
      };
    }

    this.setContext({ signal, operatorId, ethicsGates, ethicsGateResult: ethicsResult });

    const result: EscalationResult = escalate(signal, operatorId);

    if (!result.allowed) {
      return {
        success: false,
        previousState: prev,
        newState: prev,
        reason: result.reason,
        operatorFeedback: result.operatorFeedback,
      };
    }

    this.transition('escalated_pending_approval', 'escalate_action');

    // Mirror governance event into central audit DB so getAuditTrail() finds it
    if (result.governanceEvent) {
      persistGovernanceEvent(result.governanceEvent);
    }

    // Persistence: store updated signal snapshot with governance event
    if (this.store && result.governanceEvent) {
      await this.persistSignalSnapshot(
        signal as unknown as NormalizedSignal,
        result.governanceEvent
      );
    }

    return {
      success: true,
      previousState: prev,
      newState: this.currentState,
      reason: result.reason,
      operatorFeedback: result.operatorFeedback,
      governanceEvent: result.governanceEvent,
      payload: result,
    };
  }

  async doInvestigate(signal: Signal, operatorId: string): Promise<OrchestratorActionResult> {
    this.loadSignal(signal);
    const prev = this.currentState;

    const govCheck = canInvestigate(signal, signal.evidence);
    if (!govCheck.allowed) {
      return {
        success: false,
        previousState: prev,
        newState: prev,
        reason: govCheck.reason,
        operatorFeedback: `Investigation blocked: ${govCheck.reason}`,
      };
    }

    this.setContext({ signal, operatorId });
    this.transition('investigating', 'investigate_action');

    const result: InvestigationResult = await investigate(signal, operatorId);

    if (!result.allowed) {
      this.transition(prev, 'investigation_complete');
      return {
        success: false,
        previousState: prev,
        newState: this.currentState,
        reason: result.reason,
      };
    }

    // Mirror governance event into central audit DB so getAuditTrail() finds it
    if (result.governanceEvent) {
      persistGovernanceEvent(result.governanceEvent);
    }

    return {
      success: true,
      previousState: prev,
      newState: this.currentState,
      reason: result.reason,
      governanceEvent: result.governanceEvent,
      operatorFeedback: 'Investigation complete. Review findings and select next action.',
      payload: result.report,
    };
  }

  doSuppress(
    signal: Signal,
    operatorId: string,
    rationaleText: string,
    rationaleCategory: SuppressionRationale = 'other',
    duration: SuppressionDuration = '24_hours'
  ): OrchestratorActionResult {
    this.loadSignal(signal);
    const prev = this.currentState;

    const govCheck = canSuppress(signal, rationaleText);
    if (!govCheck.allowed) {
      return {
        success: false,
        previousState: prev,
        newState: prev,
        reason: govCheck.reason,
        operatorFeedback: `Suppression blocked: ${govCheck.reason}`,
      };
    }

    this.setContext({ signal, operatorId, suppressionRationale: rationaleText, suppressionCategory: rationaleCategory, suppressionDuration: duration });

    const result: SuppressionResult = suppress(signal, operatorId, rationaleText, rationaleCategory, duration);

    if (!result.allowed) {
      return {
        success: false,
        previousState: prev,
        newState: prev,
        reason: result.reason,
        operatorFeedback: result.operatorFeedback,
      };
    }

    this.transition('suppressed_with_memory', 'suppress_action');

    // Persistence: fire-and-forget (doSuppress is sync)
    if (this.store && result.governanceEvent) {
      void this.persistSignalSnapshot(
        signal as unknown as NormalizedSignal,
        result.governanceEvent
      );
    }

    return {
      success: true,
      previousState: prev,
      newState: this.currentState,
      reason: result.reason,
      operatorFeedback: result.operatorFeedback,
      governanceEvent: result.governanceEvent,
      payload: result.suppressionEntry,
    };
  }

  async doTriggerResearch(
    signal: Signal,
    operatorId: string,
    capability?: ResearchCapability
  ): Promise<OrchestratorActionResult> {
    this.loadSignal(signal);
    const prev = this.currentState;

    const cap = capability ?? { deerflowActive: true, vectorStoreAvailable: true, externalSourcesAvailable: true };
    const govCheck = canTriggerResearch(signal, cap);
    if (!govCheck.allowed) {
      return {
        success: false,
        previousState: prev,
        newState: prev,
        reason: govCheck.reason,
        operatorFeedback: `Research blocked: ${govCheck.reason}`,
      };
    }

    this.setContext({ signal, operatorId, researchCapability: cap });
    this.transition('researching', 'research_action');

    const result: ResearchResult = await triggerResearch(signal, operatorId, cap);

    if (!result.allowed) {
      this.transition(prev, 'research_complete');
      return {
        success: false,
        previousState: prev,
        newState: this.currentState,
        reason: result.reason,
      };
    }

    this.setContext({ researchId: result.report?.researchId });

    return {
      success: true,
      previousState: prev,
      newState: this.currentState,
      reason: result.reason,
      operatorFeedback: `Research complete. Review findings. Suggested confidence: ${result.report?.confidenceRecalculation.cappedNewConfidence.toFixed(2)}`,
      governanceEvent: result.governanceEvent,
      payload: result.report,
    };
  }

  doMarkAsLearning(
    signal: Signal,
    operatorId: string,
    feedbackType: string
  ): OrchestratorActionResult {
    this.loadSignal(signal);
    const prev = this.currentState;

    const govCheck = canMarkAsLearning(signal, feedbackType);
    if (!govCheck.allowed) {
      return {
        success: false,
        previousState: prev,
        newState: prev,
        reason: govCheck.reason,
        operatorFeedback: `Mark As Learning blocked: ${govCheck.reason}`,
      };
    }

    this.setContext({ signal, operatorId, feedbackType });
    this.transition('learning_event_recorded', 'learning_action');

    const result: LearningResult = markAsLearning(signal, operatorId, feedbackType);

    if (!result.allowed) {
      this.transition(prev, 'reset');
      return {
        success: false,
        previousState: prev,
        newState: this.currentState,
        reason: result.reason,
        operatorFeedback: result.operatorFeedback,
      };
    }

    // Persistence: fire-and-forget (doMarkAsLearning is sync)
    if (this.store && result.governanceEvent) {
      void this.persistSignalSnapshot(
        signal as unknown as NormalizedSignal,
        result.governanceEvent
      );
    }

    return {
      success: true,
      previousState: prev,
      newState: this.currentState,
      reason: result.reason,
      operatorFeedback: result.operatorFeedback,
      governanceEvent: result.governanceEvent,
      payload: result.edgeEvent,
    };
  }

  // ─── Convenience wrappers ───────────────────────────────────────────────────

  doWithdrawEscalation(escalationId: string, operatorId: string, reason: string) {
    const result = withdrawEscalation(escalationId, operatorId, reason);
    if (result.success) {
      this.transition('complete', 'escalation_resolved');
    }
    return result;
  }

  doRevokeSuppress(suppressionId: string, operatorId: string, reason: string) {
    const result = revokeSuppress(suppressionId, operatorId, reason);
    if (result.success) {
      this.transition('complete', 'suppression_resolved');
    }
    return result;
  }

  doApplyResearchDecision(researchId: string, signal: Signal, operatorId: string, accept: boolean) {
    const result = applyResearchDecision(researchId, signal, operatorId, accept);
    const trigger = signal.confidence >= 0.75 ? 'research_complete' : 'research_complete_low';
    this.transition(signal.confidence >= 0.75 ? 'complete' : 'partial_complete', trigger);
    return result;
  }

  doRetractLearning(edgeEventId: string, operatorId: string) {
    return retractLearningEvent(edgeEventId, operatorId);
  }

  doReset(): void {
    this.clearAllTimeouts();
    this.transition('idle', 'reset');
    this.ctx = {};
  }

  // ─── Audit trail ────────────────────────────────────────────────────────────

  getAuditTrail(signalId: string) {
    return retrieveAuditTrail(signalId);
  }

  logGovernanceEvent(
    actionType: string,
    signal: Signal,
    operatorId: string,
    details: Record<string, unknown>
  ): GovernanceEvent {
    return createGovernanceEvent(actionType, signal, operatorId, details);
  }

  persistEvent(event: GovernanceEvent): void {
    persistGovernanceEvent(event);
  }

  // ─── Spec-required state machine API (CC_SCOUT_13 acceptance criteria) ───────

  /** getCurrentState — returns current IMS state. */
  getCurrentState(): IMSState {
    return this.currentState;
  }

  /**
   * canTransitionTo — check whether a transition is currently allowed.
   * Accepts optional trigger override; defaults to matching any trigger for toState.
   */
  canTransitionTo(toState: IMSState, trigger?: string): boolean {
    const candidates = this.transitions.filter(
      (tr) => tr.from === this.currentState && tr.to === toState && (!trigger || tr.trigger === trigger)
    );
    return candidates.some((tr) => tr.guard(this.ctx));
  }

  /** transitionTo — public wrapper to force a state transition (used by orchestration layer). */
  transitionTo(toState: IMSState, trigger: string): boolean {
    return this.transition(toState, trigger);
  }

  /**
   * getAvailableActions — return action types valid in the current state.
   * Based on state machine transition table; only returns actions the operator can take.
   */
  getAvailableActions(currentState?: IMSState): string[] {
    const state = currentState ?? this.currentState;
    const actionTriggerMap: Record<string, string> = {
      escalate_action: 'escalate',
      investigate_action: 'investigate',
      suppress_action: 'suppress',
      research_action: 'trigger_research',
      learning_action: 'mark_as_learning',
    };

    const available: string[] = [];
    for (const [trigger, actionName] of Object.entries(actionTriggerMap)) {
      const hasTransition = this.transitions.some(
        (tr) => tr.from === state && tr.trigger === trigger
      );
      if (hasTransition) {
        available.push(actionName);
      }
    }
    return available;
  }

  /**
   * handleTimeout — public timeout handler for a given state.
   * Transitions to idle on timeout, emits timeout event, creates governance event.
   */
  handleTimeout(currentState: IMSState, signal?: Signal): void {
    if (this.currentState !== currentState) return; // guard: only if still in that state
    this.emit('state_timeout', { state: currentState, signal });
    if (signal) {
      createGovernanceEvent('state_timeout', signal, 'system', {
        timedOutState: currentState,
        failClosedApplied: true,
        governanceGatesChecked: ['timeout_handled_gracefully'],
      });
    }
    this.doReset();
  }

  // ─── Async fire-and-return methods (polling pattern) ─────────────────────────

  /**
   * doInvestigateAsync — fire-and-return investigation.
   * Returns investigationId immediately; caller polls getInvestigationStatus().
   */
  doInvestigateAsync(
    signal: Signal,
    evidencePool: Array<{ source: string; weight: number }>
  ): { executing: boolean; investigationId?: string; reason?: string } {
    const govCheck = canInvestigate(signal, evidencePool);
    if (!govCheck.allowed) {
      return { executing: false, reason: govCheck.reason };
    }

    this.setContext({ signal });
    this.transition('investigating', 'investigate_action');

    const result = executeInvestigate(signal, evidencePool);
    return result;
  }

  /** getInvestigationStatus — poll investigation progress by ID. */
  getInvestigationStatus(investigationId: string) {
    return getInvestigationResults(investigationId);
  }

  /**
   * doResearchAsync — fire-and-return research.
   * Returns researchId immediately; caller polls getResearchStatus().
   */
  doResearchAsync(
    signal: Signal,
    operator: Operator,
    capability?: ResearchCapability
  ): { researching: boolean; researchId?: string; reason?: string } {
    const cap = capability ?? { deerflowActive: true, vectorStoreAvailable: true, externalSourcesAvailable: true };
    const govCheck = canTriggerResearch(signal, cap);
    if (!govCheck.allowed) {
      return { researching: false, reason: govCheck.reason };
    }

    this.setContext({ signal, operatorId: operator.id, researchCapability: cap });
    this.transition('researching', 'research_action');

    const result = executeResearch(signal, operator);
    return result;
  }

  /** getResearchStatus — poll research progress by ID. */
  getResearchStatus(researchId: string) {
    return getResearchResults(researchId);
  }

  // ─── Ethics gates ────────────────────────────────────────────────────────────

  evaluateAndSetEthicsGates(gates: EthicsGates): EthicsGateResult {
    const result = evaluateEthicsGates(gates);
    this.setContext({ ethicsGates: gates, ethicsGateResult: result });
    return result;
  }

  // ─── Confidence enforcement ──────────────────────────────────────────────────

  enforceConfidenceCap(value: number): number {
    return enforceConfidenceCap(value);
  }

  // ─── Events ─────────────────────────────────────────────────────────────────

  on(event: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }

  // ─── Timeout management ──────────────────────────────────────────────────────

  private scheduleTimeout(state: IMSState, ms: number): void {
    const handle = setTimeout(() => {
      this.emit('state_timeout', { state, timeoutMs: ms });
      // Transition to idle on timeout for most states
      if (this.currentState === state) {
        this.doReset();
      }
    }, ms);
    this.timeoutHandles.set(state, handle);
  }

  private clearTimeout(state: IMSState): void {
    const handle = this.timeoutHandles.get(state);
    if (handle) {
      clearTimeout(handle);
      this.timeoutHandles.delete(state);
    }
  }

  private clearAllTimeouts(): void {
    for (const handle of this.timeoutHandles.values()) {
      clearTimeout(handle);
    }
    this.timeoutHandles.clear();
  }
}
