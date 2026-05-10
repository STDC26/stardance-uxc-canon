// src/logic/ims-state-machine.ts
// Source: IMS_STATE_MACHINE_REFERENCE.md
// 6-state fail-closed state machine for SCOUT Signal Observatory

import { IMSState, IMSContext } from '../types/IMS';

interface Transition {
  from: IMSState;
  to: IMSState;
  guard: (context: IMSContext) => boolean;
  timeout?: number;
  onEnter?: (context: IMSContext) => void;
}

export class IMSStateMachine {
  private currentState: IMSState = 'idle';
  private context: IMSContext = { timestamp: Date.now() };
  private listeners: Map<string, Array<(data: unknown) => void>> = new Map();

  // ALL 8 transitions — fail-closed (no transition allowed unless explicitly defined + guard passes)
  private transitions: Transition[] = [
    // idle → validating: input must be present and non-empty
    {
      from: 'idle',
      to: 'validating',
      guard: (ctx) =>
        ctx.input !== undefined && Object.keys(ctx.input).length > 0,
      onEnter: (_ctx) => console.log('[IMS] Entering validating'),
    },
    // validating → processing: input passes validation
    {
      from: 'validating',
      to: 'processing',
      guard: (ctx) => this.validateInput(ctx.input),
      timeout: 5000,
      onEnter: (_ctx) => console.log('[IMS] Entering processing'),
    },
    // validating → failed: input fails validation
    {
      from: 'validating',
      to: 'failed',
      guard: (ctx) => !this.validateInput(ctx.input),
      onEnter: (ctx) => {
        ctx.error = ctx.error ?? 'Validation failed';
      },
    },
    // processing → complete: result present + confidence >= 0.75
    {
      from: 'processing',
      to: 'complete',
      guard: (ctx) =>
        ctx.result !== undefined &&
        ctx.confidence !== undefined &&
        ctx.confidence >= 0.75,
      timeout: 30000,
      onEnter: (_ctx) => console.log('[IMS] Entering complete'),
    },
    // processing → partial_complete: result present + confidence 0.45-0.74 + warnings
    {
      from: 'processing',
      to: 'partial_complete',
      guard: (ctx) =>
        ctx.result !== undefined &&
        ctx.confidence !== undefined &&
        ctx.confidence >= 0.45 &&
        ctx.confidence < 0.75 &&
        ctx.warnings !== undefined &&
        ctx.warnings.length > 0,
      timeout: 30000,
      onEnter: (_ctx) => console.log('[IMS] Entering partial_complete'),
    },
    // processing → failed: no result or explicit error
    {
      from: 'processing',
      to: 'failed',
      guard: (ctx) =>
        ctx.result === undefined || ctx.error !== undefined,
      onEnter: (ctx) => {
        ctx.error = ctx.error ?? 'Processing failed';
      },
    },
    // complete → idle: always allowed (operator control)
    {
      from: 'complete',
      to: 'idle',
      guard: () => true,
      onEnter: (ctx) => {
        ctx.result = undefined;
        ctx.error = undefined;
        ctx.warnings = [];
      },
    },
    // partial_complete → idle: always allowed (operator control)
    {
      from: 'partial_complete',
      to: 'idle',
      guard: () => true,
      onEnter: (ctx) => {
        ctx.result = undefined;
        ctx.error = undefined;
        ctx.warnings = [];
      },
    },
    // failed → idle: always allowed (operator control)
    {
      from: 'failed',
      to: 'idle',
      guard: () => true,
      onEnter: (ctx) => {
        ctx.result = undefined;
        ctx.error = undefined;
      },
    },
  ];

  constructor() {
    this.on('state-change', (state) => {
      console.log(`[IMS] State changed to: ${String(state)}`);
    });
  }

  // FAIL-CLOSED: default to FALSE — only allow if explicit transition + guard pass
  canTransition(toState: IMSState): boolean {
    const transition = this.transitions.find(
      (t) => t.from === this.currentState && t.to === toState
    );
    if (!transition) return false;
    if (!transition.guard(this.context)) return false;
    return true;
  }

  // FAIL-CLOSED: block invalid transitions silently returning false
  transition(toState: IMSState): boolean {
    if (!this.canTransition(toState)) {
      console.warn(`[IMS] Blocked: ${this.currentState} → ${toState}`);
      return false;
    }

    const transition = this.transitions.find(
      (t) => t.from === this.currentState && t.to === toState
    )!;

    if (transition.onEnter) {
      transition.onEnter(this.context);
    }

    const oldState = this.currentState;
    this.currentState = toState;
    this.emit('state-change', toState);
    console.log(`[IMS] ${oldState} → ${toState}`);
    return true;
  }

  getState(): IMSState {
    return this.currentState;
  }

  setContext(updates: Partial<IMSContext>): void {
    this.context = { ...this.context, ...updates };
  }

  getContext(): IMSContext {
    return this.context;
  }

  on(event: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }

  // SCOUT-specific: input valid if non-null object with at least one key
  private validateInput(input: Record<string, unknown> | undefined): boolean {
    return input !== undefined && Object.keys(input).length > 0;
  }
}
