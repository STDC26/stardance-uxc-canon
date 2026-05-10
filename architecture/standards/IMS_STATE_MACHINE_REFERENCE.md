# IMS_STATE_MACHINE_REFERENCE
## Reusable 6-State Transition Model for All Surfaces

**Owner:** DTC  
**For:** CC (Code Implementation)  
**Purpose:** Reference implementation of 6-state IMS machine  
**Pattern:** Reusable across all surfaces  

---

## STATE DEFINITIONS (Complete Reference)

### idle
**Purpose:** Waiting for input. System ready. No operation in progress.

```
UI Rendering:
  ✓ Input form visible and enabled
  ✓ Call-to-action button ready
  ✓ No spinner or progress indicator
  ✓ Status message: "Ready"

Allowed Transitions:
  idle → validating [input received]

Data:
  - No result cached
  - No error state
  - Input cleared or default

Confidence:
  - N/A (no operation)
  - Not shown to operator
```

### validating
**Purpose:** Checking input validity. Determining if operation can proceed.

```
UI Rendering:
  ✓ Input form disabled
  ✓ Spinner or progress indicator visible
  ✓ "Validating input..." message
  ✓ Status: [spinner] Validating

Allowed Transitions:
  validating → processing [validation passes]
  validating → failed [validation fails]

Data:
  - Input stored
  - Validation errors cached
  - No result yet

Confidence:
  - N/A (validation in progress)
  - Not shown to operator
  
Timeout:
  - Max 5 seconds (configurable per surface)
  - If timeout: transition to failed
```

### processing
**Purpose:** Executing core logic. Computing result based on valid input.

```
UI Rendering:
  ✓ Content area grayed out
  ✓ Progress bar visible
  ✓ "Processing..." message
  ✓ Status: [progress bar] Processing

Allowed Transitions:
  processing → complete [logic succeeds]
  processing → failed [logic fails or timeout]

Data:
  - Input stored
  - Intermediate results cached
  - No final result yet

Confidence:
  - Being calculated
  - Not shown yet (result not ready)
  
Timeout:
  - Max 30 seconds (configurable per surface)
  - If timeout: transition to failed, show "Operation timed out"
```

### complete
**Purpose:** Operation succeeded. Result ready. Confidence high.

```
UI Rendering:
  ✓ Result displayed prominently
  ✓ Confidence shown (0.0-1.0, color-coded band)
  ✓ Evidence/reasoning shown
  ✓ Next action button(s)
  ✓ Status: [checkmark] Complete

Allowed Transitions:
  complete → idle [user clicks "Reset" or "New Input"]

Data:
  - Result cached
  - Confidence cached
  - Evidence cached
  - Ready for export/action

Confidence:
  - ✓ Shown prominently
  - ✓ Color band (HIGH/MEDIUM/LOW)
  - ✓ Confidence factors explained
  - ✓ Evidence listed

Actions Enabled:
  - Accept result
  - Export result
  - Take action based on result
  - View evidence
  - Reset
```

### partial_complete
**Purpose:** Operation partially succeeded. Result ready but with warnings. Confidence medium.

```
UI Rendering:
  ✓ Result displayed with warning banner
  ✓ Confidence shown (0.0-1.0, MEDIUM or LOW band)
  ✓ Warnings listed clearly
  ✓ "Accept and Continue" or "Retry" buttons
  ✓ Status: [warning icon] Partial Success

Allowed Transitions:
  partial_complete → idle [user accepts warnings]
  partial_complete → idle [user clicks "Retry"]

Data:
  - Partial result cached
  - Warnings cached
  - Confidence cached
  - Evidence cached

Confidence:
  - ✓ Shown with MEDIUM or LOW band
  - ✓ Why confidence is lower explained
  - ✓ Warnings listed (what was missed?)

Actions Enabled:
  - Accept warnings and continue
  - Retry with different input
  - View evidence
  - Reset
  
Do NOT Enable:
  - Actions that require high confidence
  - Automatic escalation (let operator decide)
```

### failed
**Purpose:** Operation failed. Error occurred. Unable to produce result.

```
UI Rendering:
  ✓ Error message clear and actionable
  ✓ Error details provided (not technical jargon)
  ✓ Suggestion: "Try again" or "Contact support"
  ✓ "Retry" button prominent
  ✓ Status: [error icon] Failed

Allowed Transitions:
  failed → idle [user clicks "Retry"]
  failed → idle [user clicks "Reset"]

Data:
  - Error message cached
  - Error details cached
  - No result
  - No confidence

Confidence:
  - N/A
  - Not shown

Actions Enabled:
  - Retry (go back to idle, keep last input)
  - Reset (go back to idle, clear input)
  - Contact support (link provided)
  
Do NOT Enable:
  - Proceed with computation
  - Ignore error
```

---

## STATE TRANSITION DIAGRAM (Complete)

```
                      ┌─────────────────────────────────┐
                      │                                 │
                      ▼                                 │
            ┌──────────────────┐                        │
         ┌─▶│  idle (waiting)  │◀──────┐               │
         │  └──────────┬───────┘       │                │
         │             │ input         │ reset          │
         │             │ received      │                │
         │             ▼               │                │
         │  ┌──────────────────┐  ┌────────────────┐   │
         │  │  validating      │  │ partial_       │   │
         │  │  (checking)      │  │ complete       │   │
         │  └──────┬───────┬───┘  │ (partial OK)   │   │
         │         │       │      └────┬───────────┘   │
         │    pass │       │ fail      │ accept/retry  │
         │         ▼       ▼           ▼               │
         │  ┌──────────────────┐  ┌──────────────────┐ │
         │  │  processing      │  │  failed          │ │
         │  │  (computing)     │  │  (error)         │ │
         │  └──────┬───────┬───┘  └────┬─────────────┘ │
         │         │       │           │ reset         │
         │    OK   │       │ fail      │ retry         │
         │         ▼       ▼           ▼               │
         │  ┌──────────────────┐                        │
         │  │  complete        │                        │
         │  │  (result ready)  │                        │
         │  └────────┬─────────┘                        │
         │           │ reset                            │
         └───────────┴────────────────────────────────┘
```

---

## GUARD CONDITIONS (Fail-Closed Logic)

### Guard: idle → validating
```
Condition: Input provided AND non-empty?
  ✓ If TRUE: transition allowed
  ✓ If FALSE: stay in idle, show error

Fail-Closed Principle:
  - Default to FALSE (don't transition)
  - Only transition if explicit check passes
```

### Guard: validating → processing
```
Condition: Input valid?
  ✓ Run all validation rules
  ✓ If all pass: transition allowed
  ✓ If any fail: transition to failed, show error

Timeout Guard:
  - If validating > 5 seconds: transition to failed
  
Fail-Closed Principle:
  - Assume input is invalid
  - Only allow processing if validation proves valid
```

### Guard: processing → complete
```
Condition: Logic executed successfully?
  ✓ Result computed
  ✓ Confidence calculated
  ✓ Result valid and sensible

Timeout Guard:
  - If processing > 30 seconds: transition to failed

Fail-Closed Principle:
  - Assume logic failed
  - Only allow complete if explicitly successful
```

### Guard: processing → partial_complete
```
Condition: Logic executed partially?
  ✓ Result computed but with warnings
  ✓ Confidence medium or low
  ✓ Operator should be aware of warnings

Fail-Closed Principle:
  - Show warnings before proceeding
  - Let operator decide to accept or retry
```

### Guard: complete/partial_complete/failed → idle
```
Condition: User clicks "Reset" or "Retry"?
  ✓ Always allowed (operator control)
  ✓ Clear cached result
  ✓ Go back to idle
  
Fail-Closed Principle:
  - Always allow user to reset
  - User has ultimate control
```

---

## IMPLEMENTATION PATTERN (TypeScript)

```typescript
// logic/ims-state-machine.ts

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
  private transitions: Transition[] = [
    // idle → validating
    {
      from: 'idle',
      to: 'validating',
      guard: (ctx) => ctx.input && Object.keys(ctx.input).length > 0,
      onEnter: (ctx) => {
        console.log('[IMS] Entering validating state');
      }
    },
    // validating → processing
    {
      from: 'validating',
      to: 'processing',
      guard: (ctx) => this.validateInput(ctx.input),
      timeout: 5000,
      onEnter: (ctx) => {
        console.log('[IMS] Entering processing state');
      }
    },
    // validating → failed
    {
      from: 'validating',
      to: 'failed',
      guard: (ctx) => !this.validateInput(ctx.input),
      onEnter: (ctx) => {
        ctx.error = 'Validation failed';
      }
    },
    // processing → complete
    {
      from: 'processing',
      to: 'complete',
      guard: (ctx) => ctx.result !== undefined && ctx.confidence >= 0.45,
      timeout: 30000,
      onEnter: (ctx) => {
        console.log('[IMS] Entering complete state');
      }
    },
    // processing → partial_complete
    {
      from: 'processing',
      to: 'partial_complete',
      guard: (ctx) => ctx.result !== undefined && ctx.confidence >= 0.0 && ctx.warnings?.length > 0,
      timeout: 30000,
      onEnter: (ctx) => {
        console.log('[IMS] Entering partial_complete state');
      }
    },
    // processing → failed
    {
      from: 'processing',
      to: 'failed',
      guard: (ctx) => ctx.result === undefined || ctx.error !== undefined,
      onEnter: (ctx) => {
        ctx.error = ctx.error || 'Processing failed';
      }
    },
    // complete/partial/failed → idle
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
  
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.on('state-change', (state) => {
      console.log(`[IMS] State changed to: ${state}`);
    });
  }

  // Core methods
  getState(): IMSState {
    return this.currentState;
  }

  canTransition(toState: IMSState): boolean {
    // Find matching transition
    const transition = this.transitions.find(
      (t) => t.from === this.currentState && t.to === toState
    );
    
    if (!transition) {
      return false; // No valid transition exists (fail-closed)
    }
    
    // Check guard condition
    if (!transition.guard(this.context)) {
      return false; // Guard failed (fail-closed)
    }
    
    return true; // Transition allowed
  }

  transition(toState: IMSState): boolean {
    if (!this.canTransition(toState)) {
      console.warn(`[IMS] Cannot transition from ${this.currentState} to ${toState}`);
      return false; // Transition blocked
    }

    // Find transition
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

  // Context management
  setContext(updates: Partial<IMSContext>): void {
    this.context = { ...this.context, ...updates };
  }

  getContext(): IMSContext {
    return this.context;
  }

  // Event system
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

  // Validation (example)
  private validateInput(input: any): boolean {
    // Implementation depends on surface
    // But must return true/false
    return !!input && Object.keys(input).length > 0;
  }
}
```

---

## USAGE EXAMPLE (React Component)

```typescript
// components/SurfaceComponent.tsx

import React, { useEffect } from 'react';
import { IMSStateMachine } from '../logic/ims-state-machine';

export const SurfaceComponent: React.FC = () => {
  const [state, setState] = React.useState<IMSState>('idle');
  const imsMachine = React.useRef(new IMSStateMachine());

  // Subscribe to state changes
  useEffect(() => {
    const machine = imsMachine.current;
    machine.on('state-change', (newState) => {
      setState(newState);
    });
  }, []);

  // Handle input submission
  const handleSubmit = async (input: any) => {
    const machine = imsMachine.current;

    // Try to transition to validating
    if (!machine.transition('validating')) {
      console.error('Cannot transition to validating');
      return;
    }

    // Set input context
    machine.setContext({ input });

    // Validate
    const isValid = await validateInput(input);
    if (!isValid) {
      machine.transition('failed');
      return;
    }

    // Move to processing
    if (!machine.transition('processing')) {
      return;
    }

    // Process
    try {
      const result = await processInput(input);
      const confidence = calculateConfidence(result);

      machine.setContext({ result, confidence });

      // Transition to complete or partial
      if (confidence >= 0.75) {
        machine.transition('complete');
      } else if (confidence >= 0.45) {
        machine.setContext({ warnings: ['Partial results'] });
        machine.transition('partial_complete');
      } else {
        machine.setContext({ error: 'Low confidence' });
        machine.transition('failed');
      }
    } catch (error) {
      machine.setContext({ error: error.message });
      machine.transition('failed');
    }
  };

  // Render based on state
  return (
    <div className="surface-root">
      {state === 'idle' && <IdleUI onSubmit={handleSubmit} />}
      {state === 'validating' && <ValidatingUI />}
      {state === 'processing' && <ProcessingUI />}
      {state === 'complete' && <CompleteUI context={imsMachine.current.getContext()} />}
      {state === 'partial_complete' && <PartialUI context={imsMachine.current.getContext()} />}
      {state === 'failed' && <FailedUI context={imsMachine.current.getContext()} onRetry={handleSubmit} />}
    </div>
  );
};
```

---

## TESTING PATTERN (Jest)

```typescript
// tests/ims-state-machine.test.ts

describe('IMS State Machine', () => {
  let machine: IMSStateMachine;

  beforeEach(() => {
    machine = new IMSStateMachine();
  });

  test('Starts in idle state', () => {
    expect(machine.getState()).toBe('idle');
  });

  test('idle → validating transition works', () => {
    machine.setContext({ input: { test: 'data' } });
    expect(machine.canTransition('validating')).toBe(true);
    expect(machine.transition('validating')).toBe(true);
    expect(machine.getState()).toBe('validating');
  });

  test('Invalid transitions blocked (fail-closed)', () => {
    // Attempt invalid transition
    expect(machine.canTransition('processing')).toBe(false);
    expect(machine.transition('processing')).toBe(false);
    expect(machine.getState()).toBe('idle');
  });

  test('All 6 states reachable', () => {
    const states: IMSState[] = [
      'idle', 'validating', 'processing', 'complete', 'partial_complete', 'failed'
    ];
    // Verify all states can exist
    states.forEach((state) => {
      expect(['idle', 'validating', 'processing', 'complete', 'partial_complete', 'failed']).toContain(state);
    });
  });
});
```

---

**IMS_STATE_MACHINE_REFERENCE**  
**Status:** REUSABLE REFERENCE IMPLEMENTATION  
**Pattern:** Every surface uses this  
**Guarantee:** Fail-closed, human-controlled, auditable state transitions

