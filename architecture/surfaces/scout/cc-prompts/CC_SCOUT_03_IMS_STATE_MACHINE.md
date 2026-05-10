# CC_SCOUT_03: IMS STATE MACHINE IMPLEMENTATION
## 6-State Fail-Closed State Machine

**Prompt ID:** CC_SCOUT_03_IMS_STATE_MACHINE  
**Purpose:** Implement six-state IMS fail-closed state machine  
**Authority:** IMS_STATE_MACHINE_REFERENCE.md (complete reference)  
**Standard:** CC_BUILD_PACKET_STANDARD_v1.0.md (Section 3.1)  
**Execution Order:** THIRD (core logic foundation)  

---

## REQUIRED 6 STATES (All Mandatory)

```
idle          → Ready, waiting for input
validating    → Checking signal validity (timeout: 5s)
processing    → Computing result (timeout: 30s)
complete      → Success (confidence ≥ 0.75)
partial_complete → Success with warnings (confidence 0.45-0.74)
failed        → Error state
```

---

## YOUR TASK

### Step 1: Implement IMS State Machine (src/logic/ims-state-machine.ts)

Create `/src/logic/ims-state-machine.ts` with complete implementation:

```typescript
// src/logic/ims-state-machine.ts
// Source: IMS_STATE_MACHINE_REFERENCE.md (complete reference implementation)

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
  private listeners: Map<string, Function[]> = new Map();
  
  // ALL 8 transitions required (from IMS_STATE_MACHINE_REFERENCE.md)
  private transitions: Transition[] = [
    // idle → validating
    {
      from: 'idle',
      to: 'validating',
      guard: (ctx) => ctx.input !== undefined && Object.keys(ctx.input).length > 0,
      onEnter: (ctx) => console.log('[IMS] Entering validating')
    },
    // validating → processing
    {
      from: 'validating',
      to: 'processing',
      guard: (ctx) => this.validateInput(ctx.input),
      timeout: 5000,
      onEnter: (ctx) => console.log('[IMS] Entering processing')
    },
    // validating → failed
    {
      from: 'validating',
      to: 'failed',
      guard: (ctx) => !this.validateInput(ctx.input),
      onEnter: (ctx) => { ctx.error = 'Validation failed'; }
    },
    // processing → complete
    {
      from: 'processing',
      to: 'complete',
      guard: (ctx) => ctx.result !== undefined && ctx.confidence !== undefined && ctx.confidence >= 0.75,
      timeout: 30000,
      onEnter: (ctx) => console.log('[IMS] Entering complete')
    },
    // processing → partial_complete
    {
      from: 'processing',
      to: 'partial_complete',
      guard: (ctx) => ctx.result !== undefined && ctx.confidence !== undefined && ctx.confidence >= 0.45 && ctx.warnings && ctx.warnings.length > 0,
      timeout: 30000,
      onEnter: (ctx) => console.log('[IMS] Entering partial_complete')
    },
    // processing → failed
    {
      from: 'processing',
      to: 'failed',
      guard: (ctx) => ctx.result === undefined || ctx.error !== undefined,
      onEnter: (ctx) => { ctx.error = ctx.error || 'Processing failed'; }
    },
    // complete → idle
    {
      from: 'complete',
      to: 'idle',
      guard: () => true, // Always allowed (user control)
      onEnter: (ctx) => {
        ctx.result = undefined;
        ctx.error = undefined;
        ctx.warnings = [];
      }
    },
    // partial_complete → idle
    {
      from: 'partial_complete',
      to: 'idle',
      guard: () => true,
      onEnter: (ctx) => {
        ctx.result = undefined;
        ctx.error = undefined;
        ctx.warnings = [];
      }
    },
    // failed → idle
    {
      from: 'failed',
      to: 'idle',
      guard: () => true,
      onEnter: (ctx) => {
        ctx.result = undefined;
        ctx.error = undefined;
      }
    }
  ];

  constructor() {
    this.on('state-change', (state) => {
      console.log(`[IMS] State changed to: ${state}`);
    });
  }

  // FAIL-CLOSED: Default to FALSE
  canTransition(toState: IMSState): boolean {
    const transition = this.transitions.find(
      (t) => t.from === this.currentState && t.to === toState
    );
    
    if (!transition) {
      return false; // No valid transition exists (fail-closed)
    }
    
    if (!transition.guard(this.context)) {
      return false; // Guard failed (fail-closed)
    }
    
    return true;
  }

  // FAIL-CLOSED: Block invalid transitions
  transition(toState: IMSState): boolean {
    if (!this.canTransition(toState)) {
      console.warn(`[IMS] Cannot transition from ${this.currentState} to ${toState}`);
      return false; // Transition blocked
    }

    const transition = this.transitions.find(
      (t) => t.from === this.currentState && t.to === toState
    );

    if (!transition) {
      return false;
    }

    // Execute onEnter hook
    if (transition.onEnter) {
      transition.onEnter(this.context);
    }

    // Update state
    const oldState = this.currentState;
    this.currentState = toState;
    this.emit('state-change', toState);

    console.log(`[IMS] Transitioned from ${oldState} to ${toState}`);
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

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  private emit(event: string, data: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((cb) => cb(data));
    }
  }

  private validateInput(input: any): boolean {
    // SCOUT-specific validation
    // Check if input has required properties
    return !!input && Object.keys(input).length > 0;
  }
}
```

**Acceptance Criterion:** File exists, all 8 transitions implemented, fail-closed rules enforced

### Step 2: Update IMS Type Definitions

Update `/src/types/IMS.ts` with full type definitions:

```typescript
// src/types/IMS.ts

export type IMSState = 
  | 'idle'
  | 'validating'
  | 'processing'
  | 'complete'
  | 'partial_complete'
  | 'failed';

export interface IMSContext {
  input?: any;
  result?: any;
  confidence?: number;
  error?: string;
  warnings?: string[];
  timestamp: number;
}

// Transition type
export interface IMSTransition {
  from: IMSState;
  to: IMSState;
  condition: (context: IMSContext) => boolean;
  action?: (context: IMSContext) => void;
}
```

**Acceptance Criterion:** Type definitions complete and match implementation

### Step 3: Write IMS State Machine Tests

Create `/src/tests/ims-state-machine.test.ts` with minimum 8 tests:

```typescript
// src/tests/ims-state-machine.test.ts

import { IMSStateMachine } from '../logic/ims-state-machine';

describe('IMS State Machine', () => {
  let machine: IMSStateMachine;

  beforeEach(() => {
    machine = new IMSStateMachine();
  });

  test('Starts in idle state', () => {
    expect(machine.getState()).toBe('idle');
  });

  test('idle → validating works with input', () => {
    machine.setContext({ input: { test: 'data' } });
    expect(machine.canTransition('validating')).toBe(true);
    expect(machine.transition('validating')).toBe(true);
    expect(machine.getState()).toBe('validating');
  });

  test('validating → processing works with valid input', () => {
    machine.setContext({ input: { test: 'data' } });
    machine.transition('validating');
    expect(machine.canTransition('processing')).toBe(true);
    expect(machine.transition('processing')).toBe(true);
    expect(machine.getState()).toBe('processing');
  });

  test('processing → complete works with result + confidence >= 0.75', () => {
    machine.setContext({ 
      input: { test: 'data' },
      result: { type: 'signal' },
      confidence: 0.85
    });
    machine.transition('validating');
    machine.transition('processing');
    expect(machine.canTransition('complete')).toBe(true);
    expect(machine.transition('complete')).toBe(true);
    expect(machine.getState()).toBe('complete');
  });

  test('processing → partial_complete works with result + confidence 0.45-0.74 + warnings', () => {
    machine.setContext({ 
      input: { test: 'data' },
      result: { type: 'signal' },
      confidence: 0.60,
      warnings: ['Warning 1']
    });
    machine.transition('validating');
    machine.transition('processing');
    expect(machine.canTransition('partial_complete')).toBe(true);
    expect(machine.transition('partial_complete')).toBe(true);
    expect(machine.getState()).toBe('partial_complete');
  });

  test('Invalid transitions blocked (fail-closed)', () => {
    // In idle, cannot transition directly to processing (invalid)
    expect(machine.canTransition('processing')).toBe(false);
    expect(machine.transition('processing')).toBe(false);
    expect(machine.getState()).toBe('idle'); // State unchanged
  });

  test('complete → idle resets context', () => {
    machine.setContext({ result: { data: 'test' }, error: null });
    machine.transition('validating');
    machine.transition('processing');
    machine.setContext({ result: { type: 'signal' }, confidence: 0.85 });
    machine.transition('complete');
    
    expect(machine.transition('idle')).toBe(true);
    const ctx = machine.getContext();
    expect(ctx.result).toBeUndefined();
    expect(ctx.error).toBeUndefined();
    expect(ctx.warnings).toEqual([]);
  });

  test('failed → idle allowed (user control)', () => {
    machine.transition('validating');
    machine.setContext({ error: 'Validation failed' });
    machine.transition('failed');
    expect(machine.canTransition('idle')).toBe(true);
    expect(machine.transition('idle')).toBe(true);
    expect(machine.getState()).toBe('idle');
  });
});
```

**Acceptance Criterion:** 8+ IMS tests present, all passing

---

## FAIL-CLOSED RULES (Mandatory)

✓ Unknown state → ERROR (no silent fallback)  
✓ Missing confidence → ERROR (in complete/partial states)  
✓ Missing next_action → ERROR (blocked)  
✓ Invalid transition → ERROR (blocked)  
✓ Missing trust metadata → ERROR (blocked)  
✓ Default to NO (only allow if explicitly valid)  

---

## ESCALATION RULE

**If:** State transitions fail, guards don't work, or timeouts cause issues  
**Then:** Stop and escalate to DTC with code + error context  
**Do not:** Add fallback behavior, remove guards, or "simplify" logic  

---

## ACCEPTANCE CRITERIA (All Must Pass)

- [ ] ims-state-machine.ts implemented (8 transitions, fail-closed)
- [ ] All 6 states present and working
- [ ] Guard conditions implemented and enforced
- [ ] onEnter hooks execute correctly
- [ ] State events emit on change
- [ ] IMS type definitions complete
- [ ] 8+ IMS state machine tests passing
- [ ] npm test passes IMS tests
- [ ] Ready to proceed to CC_SCOUT_04

---

## NEXT PROMPT

Once you confirm all acceptance criteria met, you are ready for:

**CC_SCOUT_04_COMPONENTS**
- Implement 10 mandatory SCOUT components
- Implement component patterns (from CC standard)
- Begin CQX component foundation

---

## GOVERNANCE CHECKPOINT

**Phase:** 5 (CC Build)  
**Status:** Core logic implementation  
**Critical Path:** IMS state machine is foundation for all other components  
**Proceed Criterion:** All acceptance criteria ✓, tests passing

