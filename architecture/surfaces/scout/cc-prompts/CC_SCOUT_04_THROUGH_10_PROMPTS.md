# CC PROMPT SET 04-10: COMPONENTS THROUGH VALIDATION
## Complete SCOUT Implementation Prompts

---

# CC_SCOUT_04: COMPONENT IMPLEMENTATION
## 10 Mandatory SCOUT Components

**Prompt ID:** CC_SCOUT_04_COMPONENTS  
**Purpose:** Implement 10 mandatory SCOUT components (categorized by RC-06)  
**Authority:** SCOUT_CC_EXECUTION_PACKET_v1.0_CORRECTED.md (Section 3, RC-06)  
**Execution Order:** FOURTH  

### Your Task

Implement all 10 components in `/src/components/` using React 18 functional components:

**Core Interpretation (2):**
```typescript
// src/components/InterpretationBlock.tsx
// What the signal means (DISTINCT from what to do about it)
// Props: signal, meaning, confidence, evidence
// State: Shows interpreted meaning, evidence, recommended actions
```

```typescript
// src/components/EvidencePanel.tsx
// Evidence sources and confidence factors
// Props: evidence[], sources[], confidenceFactors[]
// State: Lists evidence, shows contribution to confidence
```

**Trust & Confidence (3):**
```typescript
// src/components/ConfidenceBand.tsx
// Confidence display (HIGH/MEDIUM/LOW)
// Props: confidence (0.0-1.0, cap 0.92), factors[]
// State: Renders band color, percentage, contributing factors
```

```typescript
// src/components/TrustRail.tsx
// Trust model visualization
// Props: trust, trustFactors[]
// State: Shows trust accumulation, decay indicators
```

```typescript
// src/components/EthicsGate.tsx
// Safety, delight, harmony gates
// Props: safetyStatus, delightStatus, harmonyStatus, override?
// State: Shows gate status, allows override if permitted
```

**Orbit & State (2):**
```typescript
// src/components/OrbitHeader.tsx
// Orbit state visual (signal_sense)
// Props: imsState, orbitState
// State: Renders Orbit visual asset, aligned to state
```

```typescript
// src/components/StateIndicator.tsx
// IMS state display
// Props: imsState ('idle'|'validating'|'processing'|'complete'|'partial_complete'|'failed')
// State: Shows current IMS state with icon/color
```

**Operator Actions (2):**
```typescript
// src/components/ActionPanel.tsx
// Primary actions (escalate, suppress, investigate, export)
// Props: actions[], imsState, confidence
// State: Shows available actions based on state + confidence
```

```typescript
// src/components/OperatorActionBar.tsx
// Secondary actions and controls
// Props: enabled, onSubmit, onReset
// State: Reset, retry, help buttons
```

**Temporal Context (1):**
```typescript
// src/components/SignalTimeline.tsx
// Signal history and temporal context
// Props: signalHistory[], currentSignal
// State: Timeline display, allows navigation
```

### Component Requirements (All Mandatory)

✓ React 18 functional components (no class components)  
✓ TypeScript types for all props  
✓ Use IMS state from parent context  
✓ Use confidence from parent context  
✓ Respond to state changes (re-render on state change)  
✓ Follow CC_BUILD_PACKET_STANDARD component pattern  

### Acceptance Criteria

- [ ] All 10 components implemented
- [ ] Components in correct category directories
- [ ] Props typed with TypeScript
- [ ] Components render based on IMS state
- [ ] No console errors
- [ ] Ready for CC_SCOUT_05

---

# CC_SCOUT_05: CQX RENDERING SEQUENCE
## Locked 5-Element Conviction Equation Experience

**Prompt ID:** CC_SCOUT_05_CQX_RENDERING  
**Purpose:** Implement locked CQX rendering sequence  
**Authority:** SCOUT_CC_EXECUTION_PACKET_v1.0_CORRECTED.md (Section 5, RC-02)  
**Critical:** Meaning ≠ Action (separate cognitive operations)  
**Execution Order:** FIFTH  

### Your Task

Implement CQX rendering component in `/src/components/CQXSequence.tsx`:

```typescript
// src/components/CQXSequence.tsx
// RC-02 Applied: Meaning and Action are SEPARATE elements

export const CQXSequence: React.FC<CQXProps> = (props) => {
  return (
    <div className="cqx-sequence">
      {/* 1. Context (situation framing) */}
      <div className="cqx-element cqx-context">
        <h3>Context</h3>
        <p>{props.context}</p>
      </div>

      {/* 2. Outcome (what happened) */}
      <div className="cqx-element cqx-outcome">
        <h3>What's Happening</h3>
        <p>{props.outcome}</p>
      </div>

      {/* 3. Meaning (interpretation) ← SEPARATE */}
      <div className="cqx-element cqx-meaning">
        <h3>What It Means</h3>
        <p>{props.meaning}</p>
      </div>

      {/* 4. Strength & Risk (confidence + risk) */}
      <div className="cqx-element cqx-strength">
        <h3>How Strong Is This</h3>
        <ConfidenceBand 
          confidence={props.confidence} 
          risks={props.risks} 
        />
      </div>

      {/* 5. Action (operator decides) ← DISTINCT FROM MEANING */}
      <div className="cqx-element cqx-action">
        <h3>What You Should Do</h3>
        <ActionPanel actions={props.recommendedActions} />
      </div>
    </div>
  );
};
```

### Critical Rules (RC-02)

✗ DO NOT collapse Meaning into Action  
✗ DO NOT skip any element  
✗ DO NOT change rendering order  
✗ DO NOT combine confidence with action  
✓ Meaning: "What does this signal mean?"  
✓ Action: "What should the operator do?"  

### Acceptance Criteria

- [ ] 5-element CQX sequence renders in order
- [ ] Meaning element distinct from Action
- [ ] All elements visible and readable
- [ ] Components integrate with IMS states
- [ ] Ready for CC_SCOUT_06

---

# CC_SCOUT_06: CONFIDENCE & TRUST GATES
## Confidence Cap 0.92, Bands, Ethics Gates

**Prompt ID:** CC_SCOUT_06_CONFIDENCE_TRUST  
**Purpose:** Implement confidence calculation, bands, gates  
**Authority:** SCOUT_CC_EXECUTION_PACKET_v1.0_CORRECTED.md (Section 6)  
**Execution Order:** SIXTH  

### Your Task

Implement `/src/logic/confidence-gates.ts`:

```typescript
// src/logic/confidence-gates.ts
// Hard cap 0.92 (non-negotiable)
// Confidence bands: HIGH (0.75-1.0), MEDIUM (0.45-0.74), LOW (0.0-0.44)

export type ConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW';

export class ConfidenceGates {
  // Calculate confidence from factors
  calculate(...factors: number[]): number {
    // Combine factors (implementation from PTC spec)
    const avg = factors.reduce((a, b) => a + b, 0) / factors.length;
    // CAP AT 0.92 (hard limit)
    return Math.min(avg, 0.92);
  }

  // Get confidence band
  getBand(confidence: number): ConfidenceBand {
    if (confidence >= 0.75) return 'HIGH';
    if (confidence >= 0.45) return 'MEDIUM';
    return 'LOW';
  }

  // Check if action allowed (gates)
  canExecuteAction(action: string, confidence: number): boolean {
    // Escalate requires 0.75+, suppress requires 0.45+, etc.
    // Implementation from PTC decision model
    return confidence >= this.getThresholdFor(action);
  }

  // Ethics gates
  passesEthicsGate(
    action: string,
    safetyCheck: boolean,
    delightCheck: boolean,
    harmonyCheck: boolean
  ): boolean {
    // All three must pass, or override allowed
    return safetyCheck && delightCheck && harmonyCheck;
  }
}
```

### Critical Rules

✓ Hard cap at 0.92 (no exceptions)  
✓ Confidence bands: HIGH/MEDIUM/LOW (colors match)  
✓ Ethics gates: Safety, Delight, Harmony  
✓ Fail-closed: Gates block by default  

### Acceptance Criteria

- [ ] Confidence calculation implemented
- [ ] Hard cap 0.92 enforced
- [ ] Bands display with colors
- [ ] Ethics gates work
- [ ] 6+ confidence tests passing
- [ ] Ready for CC_SCOUT_07

---

# CC_SCOUT_07: ORBIT BINDING
## SCOUT Orbit State & Visual Integration

**Prompt ID:** CC_SCOUT_07_ORBIT_BINDING  
**Purpose:** Implement SCOUT Orbit binding  
**Authority:** SCOUT_CC_EXECUTION_PACKET_v1.0_CORRECTED.md (Section 8)  
**Execution Order:** SEVENTH  

### Your Task

Implement `/src/logic/orbit-binding.ts`:

```typescript
// src/logic/orbit-binding.ts
// SCOUT operates in signal_sense Orbit state

export type OrbitState = 'idle' | 'validating' | 'processing' | 'signal_sense' | 'failed';

export function mapIMSToOrbit(imsState: IMSState): OrbitState {
  switch (imsState) {
    case 'idle': return 'idle';
    case 'validating': return 'validating';
    case 'processing': return 'processing';
    case 'complete': return 'signal_sense'; // Active signal sensing
    case 'partial_complete': return 'signal_sense'; // Uncertain sensing
    case 'failed': return 'failed';
  }
}

export const ORBIT_VISUAL_ASSET = 'stardance_orbit_signal_sense_v1';
export const ORBITFRAME_VERSION = 'OrbitFrame v0.1';
```

### Critical Rules

✓ SCOUT Orbit state: signal_sense (not generic)  
✓ State mapping defined and locked  
✓ Visual asset assigned (from canon)  
✓ No decorative behavior  

### Acceptance Criteria

- [ ] Orbit binding implemented
- [ ] IMS → Orbit state mapping correct
- [ ] Visual asset integrated
- [ ] OrbitHeader renders correctly
- [ ] Ready for CC_SCOUT_08

---

# CC_SCOUT_08: PREVIEW GENERATION
## Standalone Preview (No Build Required)

**Prompt ID:** CC_SCOUT_08_PREVIEW  
**Purpose:** Generate standalone preview for all 6 IMS states  
**Authority:** SCOUT_CC_EXECUTION_PACKET_v1.0_CORRECTED.md (Section 9)  
**Execution Order:** EIGHTH  

### Your Task

Generate `/preview/scout-signal-observatory.html` with:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SCOUT Signal Observatory - Preview</title>
  <style>
    /* All CSS inline */
    body { font-family: DM Sans; background: #0a0e27; color: #e5e7eb; }
    .preview-nav { display: flex; gap: 10px; margin-bottom: 20px; }
    .preview-nav button { padding: 8px 16px; cursor: pointer; }
    .preview-state { padding: 20px; border: 1px solid #30abca; margin-bottom: 20px; }
    .cqx-element { margin: 10px 0; padding: 10px; border-left: 3px solid #30abca; }
    .confidence-band { padding: 10px; margin: 10px 0; }
    .confidence-high { background: #10b981; }
    .confidence-medium { background: #f59e0b; }
    .confidence-low { background: #ef4444; }
  </style>
</head>
<body>
  <h1>SCOUT Signal Observatory - Preview</h1>
  
  <div class="preview-nav">
    <button onclick="setState('idle')">Idle</button>
    <button onclick="setState('validating')">Validating</button>
    <button onclick="setState('processing')">Processing</button>
    <button onclick="setState('complete')">Complete</button>
    <button onclick="setState('partial_complete')">Partial</button>
    <button onclick="setState('failed')">Failed</button>
  </div>

  <div id="preview"></div>

  <script>
    let currentState = 'idle';

    function setState(state) {
      currentState = state;
      renderPreview();
    }

    function renderPreview() {
      const preview = document.getElementById('preview');
      
      switch (currentState) {
        case 'idle':
          preview.innerHTML = `
            <div class="preview-state">
              <h2>Idle</h2>
              <p>Ready for input</p>
              <input type="text" placeholder="Load signal">
            </div>
          `;
          break;
        case 'validating':
          preview.innerHTML = `
            <div class="preview-state">
              <h2>Validating</h2>
              <p>Checking signal format...</p>
              <div>Spinner: ⟳</div>
            </div>
          `;
          break;
        case 'processing':
          preview.innerHTML = `
            <div class="preview-state">
              <h2>Processing</h2>
              <p>Classifying signal...</p>
              <div>Progress: ████████░░</div>
            </div>
          `;
          break;
        case 'complete':
          preview.innerHTML = `
            <div class="preview-state">
              <h2>Complete (High Confidence)</h2>
              <div class="cqx-element">Context: Operational signal detected</div>
              <div class="cqx-element">Outcome: Signal type = anomaly</div>
              <div class="cqx-element">Meaning: Unusual pattern detected</div>
              <div class="cqx-element">
                <div class="confidence-band confidence-high">
                  Confidence: 87% (HIGH)
                </div>
              </div>
              <div class="cqx-element">
                <button>Escalate</button>
                <button>Investigate</button>
                <button>Export</button>
              </div>
            </div>
          `;
          break;
        case 'partial_complete':
          preview.innerHTML = `
            <div class="preview-state">
              <h2>Partial Success</h2>
              <div class="cqx-element">Context: Signal detected</div>
              <div class="cqx-element">Outcome: Signal type = uncertain</div>
              <div class="cqx-element">Meaning: More evidence needed</div>
              <div class="cqx-element">
                <div class="confidence-band confidence-medium">
                  Confidence: 58% (MEDIUM) - ⚠ Warning
                </div>
              </div>
              <div class="cqx-element">
                <button>Collect More Evidence</button>
                <button>Accept and Continue</button>
              </div>
            </div>
          `;
          break;
        case 'failed':
          preview.innerHTML = `
            <div class="preview-state">
              <h2>Failed</h2>
              <p>Signal unclassifiable</p>
              <p style="color: #ef4444;">Error: Classification failed</p>
              <button>Retry</button>
              <button>Reset</button>
            </div>
          `;
          break;
      }
    }

    renderPreview();
  </script>
</body>
</html>
```

### Requirements

✓ Standalone HTML (no build needed)  
✓ All 6 states clickable  
✓ CQX elements visible  
✓ Confidence bands with colors  
✓ <500KB file size  

### Acceptance Criteria

- [ ] preview.html generated in /preview/
- [ ] All 6 states render
- [ ] CQX sequence visible
- [ ] Confidence bands show correctly
- [ ] Can be opened in browser without build
- [ ] Ready for CC_SCOUT_09

---

# CC_SCOUT_09: TESTING & COVERAGE
## 40+ Tests, 80%+ Coverage, 90%+ Target

**Prompt ID:** CC_SCOUT_09_TESTS  
**Purpose:** Create test harness and achieve coverage  
**Authority:** SCOUT_CC_EXECUTION_PACKET_v1.0_CORRECTED.md (Section 10)  
**Execution Order:** NINTH  

### Your Task

Write comprehensive tests:

**Test Categories:**

1. **IMS State Machine (8 tests)** — Already created in CC_SCOUT_03
   
2. **CQX Rendering (8 tests)**
   - All 5 elements render
   - Meaning distinct from Action
   - Elements in correct order
   
3. **Confidence Gates (8 tests)**
   - Confidence 0.0-1.0
   - Hard cap 0.92
   - Bands correct
   - Gates block/allow correctly
   
4. **Components (8 tests)**
   - Each component renders
   - Props typed correctly
   - State changes trigger re-renders
   
5. **Integration (6 tests)**
   - Full flow: input → success
   - Error flow: input → retry
   - Confidence gates work with state machine
   - All UXC layers present
   
6. **E2E (4 tests)**
   - User can input and get result
   - Errors are recoverable
   - Preview renders all states

**Total: 40+ tests minimum, 90%+ target coverage**

### Acceptance Criteria

- [ ] 40+ tests written
- [ ] All tests passing
- [ ] 80%+ coverage minimum
- [ ] 90%+ coverage target
- [ ] npm test returns green
- [ ] Ready for CC_SCOUT_10

---

# CC_SCOUT_10: FINAL VALIDATION & HANDOFF
## Build, Test, Validate, Handoff Package

**Prompt ID:** CC_SCOUT_10_FINAL_VALIDATION  
**Purpose:** Run final build, validation, create handoff for Phase 6 UAT  
**Authority:** SCOUT_CC_EXECUTION_PACKET_v1.0_CORRECTED.md (Section 14)  
**Execution Order:** TENTH (final)  

### Your Task

### Step 1: Run Tests and Coverage
```bash
npm test
npm run test:coverage
```

**Acceptance:** All tests pass, 80%+ coverage

### Step 2: Build Project
```bash
npm run build
```

**Acceptance:** Build succeeds, no errors

### Step 3: Verify Preview
```bash
# Open in browser
open preview/scout-signal-observatory.html
```

**Acceptance:** All 6 states render correctly

### Step 4: Prepare Phase 6 Handoff Package

Create `/PHASE5_COMPLETION_REPORT.md`:

```markdown
# SCOUT Phase 5 Completion Report

## Build Summary
- Status: COMPLETE ✓
- Build Date: [date]
- Version: 1.0.0
- Branch: feature/scout-phase5

## Implementation Summary
- [x] 10 mandatory components implemented
- [x] 6 IMS states working
- [x] CQX 5-element sequence
- [x] Confidence gates (0.92 cap)
- [x] Orbit binding (signal_sense)
- [x] 40+ tests passing
- [x] 80%+ coverage achieved
- [x] Preview generated

## Test Results
- Total tests: [number]
- Passing: [number]
- Coverage: [percentage]%
- Critical paths: 100%

## Known Gaps (From Phase 5)
- Advanced analytics (v1.1)
- LLM interpretation (v1.1)
- Real-time feed (v1.1)

## Ready for Phase 6 (UAT)
- [x] All acceptance criteria met
- [x] No known blockers
- [x] Handed off to DRJ + PTC for validation

## Phase Boundary Statement
Completion of Phase 5 does NOT certify this surface.
Phase 6 (UAT) and Phase 7 (UXC Certification) remain mandatory.
```

### Step 5: Commit and Push

```bash
git add .
git commit -m "feat: SCOUT Phase 5 complete - all features, tests, preview ready for UAT"
git push origin feature/scout-phase5
```

### Acceptance Criteria (All Must Pass)

- [ ] npm test passes (all tests green)
- [ ] npm run build succeeds
- [ ] Coverage 80%+ (target 90%+)
- [ ] Preview renders all states
- [ ] No console errors
- [ ] Phase 5 Completion Report created
- [ ] Code committed and pushed
- [ ] Ready for Phase 6 (UAT)

---

## GOVERNANCE CHECKPOINT

**Phase:** 5 (CC Build) COMPLETE  
**Status:** All features implemented, tested, validated  
**Timeline:** 2 weeks from start  
**Next Phase:** Phase 6 (UAT) by DRJ + PTC  
**Phase Boundary:** Phase 5 complete ≠ Certified  

