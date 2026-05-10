# D2: DTC EXECUTION PACKET TEMPLATE
## Phase 4 Gating Document | XAS Lifecycle v1.0

**Document ID:** D2  
**Owner:** DTC  
**Purpose:** Standardize executable build specifications for CC  
**Status:** ACTIVE GATE CONTROL  
**Lifecycle Phase:** Phase 4 (DTC Execution Translation)

---

## GATE ENTRY CONDITION

**Input:** PTC-Completed Surface Specification (from Phase 3 checklist)  
**Output Required:** CC Execution Packet (detailed build specification)  
**Gate Status:** MANDATORY - Cannot proceed to Phase 5 (CC Build) without passing all sections

---

## PACKET METADATA

```json
{
  "packet_id": "cc-exec-[surface-name]-[version]",
  "surface_name": "[e.g., SCOUT Signal Observatory]",
  "version": "1.0.0",
  "created_by": "DTC",
  "created_date": "YYYY-MM-DD",
  "ptc_completed_spec_reference": "[link or version]",
  "lifecycle_phase": 4,
  "next_phase": 5,
  "cc_lead_acknowledged": false,
  "build_start_date": null,
  "build_complete_date": null
}
```

---

## SECTION 1: FILE STRUCTURE & LAYOUT

### 1.1 Directory Tree (Complete)

```
[surface-name]/
├── README.md                           (surface description, overview)
├── MANIFEST.json                       (UXC metadata, registry info)
├── package.json                        (dependencies, build scripts)
├── tsconfig.json                       (TypeScript config, if needed)
├── jest.config.js                      (test configuration)
│
├── src/
│   ├── index.tsx                       (entry point)
│   ├── App.tsx                         (root component)
│   │
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── MainContent.tsx
│   │   ├── StateIndicator.tsx          (shows IMS state)
│   │   ├── ConfidenceDisplay.tsx       (shows confidence + bands)
│   │   ├── EvidencePane.tsx            (shows evidence/reasoning)
│   │   ├── ActionPanel.tsx             (operator actions)
│   │   └── [Surface-Specific Components]
│   │
│   ├── logic/
│   │   ├── ims-state-machine.ts        (6-state IMS implementation)
│   │   ├── confidence-gates.ts         (confidence logic + FLAG-B01)
│   │   ├── decision-model.ts           (3-question hierarchy)
│   │   ├── evidence-model.ts           (evidence synthesis)
│   │   ├── trust-model.ts              (trust calculation)
│   │   ├── [Domain-Specific Logic]     (SCOUT-specific, etc.)
│   │   └── uxc-enforcement.ts          (C0-C8 compliance checks)
│   │
│   ├── styles/
│   │   ├── main.css                    (global styles)
│   │   ├── theme.css                   (color, typography, spacing)
│   │   ├── responsive.css              (mobile-first responsive)
│   │   ├── components.css              (component-specific styles)
│   │   └── variables.css               (CSS custom properties)
│   │
│   ├── types/
│   │   ├── Surface.ts                  (surface state types)
│   │   ├── IMS.ts                      (IMS state + transitions)
│   │   ├── Evidence.ts                 (evidence + reasoning types)
│   │   ├── Decision.ts                 (decision types)
│   │   └── UXC.ts                      (UXC contract types)
│   │
│   ├── hooks/
│   │   ├── useIMS.ts                   (IMS state management)
│   │   ├── useConfidence.ts            (confidence calculation)
│   │   ├── useEvidence.ts              (evidence synthesis)
│   │   └── [Custom Hooks]
│   │
│   ├── utils/
│   │   ├── validators.ts               (input validation)
│   │   ├── formatters.ts               (UI formatting)
│   │   ├── api-client.ts               (API calls)
│   │   └── [Utility Functions]
│   │
│   ├── data/
│   │   ├── initial-state.json          (default surface state)
│   │   ├── ims-config.json             (IMS state definitions)
│   │   └── [Domain Data]
│   │
│   └── tests/
│       ├── ims-state-machine.test.ts   (state transitions)
│       ├── confidence-gates.test.ts    (confidence logic)
│       ├── decision-model.test.ts      (3-question hierarchy)
│       ├── integration.test.ts         (end-to-end flows)
│       ├── uxc-compliance.test.ts      (C0-C8 validation)
│       ├── e2e.test.ts                 (user scenarios)
│       └── [Custom Tests]
│
├── public/
│   ├── index.html                      (HTML entry point)
│   ├── favicon.ico
│   └── [Static Assets]
│
├── preview/
│   ├── preview.html                    (standalone preview, no build)
│   ├── preview-states.json             (all IMS states pre-rendered)
│   ├── preview-scenarios.json          (confidence scenarios)
│   └── [Preview Assets]
│
├── docs/
│   ├── ARCHITECTURE.md                 (system design overview)
│   ├── IMS_STATE_MACHINE.md            (state definitions + flows)
│   ├── CONFIDENCE_GATES.md             (confidence + FLAG-B01)
│   ├── DECISION_HIERARCHY.md           (3-question format)
│   ├── UXC_COMPLIANCE.md               (C0-C8 mapping)
│   └── [Implementation Guides]
│
├── scripts/
│   ├── generate-preview.js             (build preview HTML)
│   ├── validate-uxc.js                 (run compliance checks)
│   └── [Build Scripts]
│
├── .github/workflows/
│   ├── test.yml                        (run tests on push)
│   ├── build.yml                       (build on main)
│   └── validate.yml                    (UXC compliance check)
│
└── [Project Root Files]
    ├── .gitignore
    ├── .env.example
    ├── LICENSE
    └── CONTRIBUTING.md
```

### 1.2 File Count & Expectations
- **Components:** 6-10 (surface-specific)
- **Logic Files:** 6-8 (core + domain)
- **Test Files:** 5-8 (test each logic file + integration)
- **Total Source Files:** 30-50
- **Total Tests:** 40-80 test cases

---

## SECTION 2: FRAMEWORK & TECHNOLOGY CONSTRAINTS

### 2.1 Frontend Framework

Choose ONE:

- [ ] **React 18+** (preferred)
  - Use functional components + hooks
  - State management: `useState`, `useReducer`, or Context
  - No class components
  - No prop drilling (use Context for global state)

- [ ] **Vue 3+**
  - Use Composition API
  - State management: `ref`, `reactive`, or Pinia
  - Template syntax required

- [ ] **Static HTML + Vanilla JS** (if no framework needed)
  - No frameworks
  - ES6+ JavaScript required
  - DOM manipulation only

**Selected Framework:** ________________ **CC Confirmation:** _______

### 2.2 Styling Approach

Choose ONE:

- [ ] **Tailwind CSS** (preferred)
  - Core utilities only (no compiler)
  - CSS custom properties for theme
  - No new class definitions
  - Mobile-first responsive design

- [ ] **CSS Modules** (if custom CSS needed)
  - One .module.css per component
  - CSS variables for theming
  - No global class names except theme

- [ ] **Plain CSS** (if minimal styling)
  - Single stylesheet per component
  - CSS variables for theming
  - Mobile-first approach

**Selected Approach:** ________________ **CC Confirmation:** _______

### 2.3 Build & Tooling

- [ ] Build tool: Vite (recommended) | Webpack | esbuild
- [ ] Package manager: npm | yarn
- [ ] TypeScript: YES (required) | NO (if vanilla JS)
- [ ] Linter: ESLint
- [ ] Formatter: Prettier
- [ ] Test framework: Jest

**Build Configuration Confirmed by CC:** _______

### 2.4 Browser Targets

- [ ] Modern browsers only (Chrome, Firefox, Safari, Edge latest)
- [ ] Legacy support needed (IE11, older Safari)? NO (recommended)
- [ ] Mobile-first responsive (required)
- [ ] Accessibility (WCAG 2.1 AA minimum)

**Browser Targets Confirmed by CC:** _______

---

## SECTION 3: IMS STATE MACHINE IMPLEMENTATION

### 3.1 Required States (All 6 Must Be Implemented)

```typescript
type IMSState = 
  | 'idle'
  | 'validating'
  | 'processing'
  | 'complete'
  | 'partial_complete'
  | 'failed';
```

### 3.2 State Definitions & Rendering

**idle** — Waiting for input
```
- UI: Input form visible, call-to-action button
- Allowed actions: Submit input
- Confidence: N/A
- Rendering: Ready state, no spinner
```

**validating** — Checking input validity
```
- UI: Input disabled, progress indicator
- Allowed actions: None (or Cancel)
- Confidence: N/A (validation in progress)
- Rendering: Loading state, "Validating input..."
```

**processing** — Executing logic
```
- UI: Content grayed out, progress bar
- Allowed actions: None (or Cancel)
- Confidence: N/A (processing in progress)
- Rendering: Loading state, "Processing..."
```

**complete** — Success
```
- UI: Result displayed, confidence shown, next action offered
- Allowed actions: View result, export, next step
- Confidence: Shown (0.0-1.0)
- Rendering: Success state, green indicator
```

**partial_complete** — Partial success
```
- UI: Result displayed with warnings, confidence shown
- Allowed actions: View result, accept warnings, retry
- Confidence: Shown (0.0-1.0) with warning band highlighted
- Rendering: Warning state, orange indicator
```

**failed** — Error
```
- UI: Error message, suggestion to retry or contact support
- Allowed actions: Retry, reset, contact support
- Confidence: N/A
- Rendering: Error state, red indicator, error details
```

### 3.3 State Transitions

Implement ALL transitions (from logic/ims-state-machine.ts):

```
idle → validating        [input received]
validating → processing  [validation passes]
validating → failed      [validation fails]
processing → complete    [logic succeeds]
processing → failed      [logic fails or timeout]
complete → idle          [user clicks reset/next]
partial_complete → idle  [user accepts warnings]
failed → idle            [user clicks retry/reset]
```

### 3.4 State Management

- [ ] IMS state stored in component state (useState)
- [ ] State updates trigger re-renders
- [ ] State history logged (for debugging)
- [ ] State serialized for preview mode
- [ ] Invalid state transitions prevented (fail-closed)

### 3.5 Component Integration

- [ ] Main component wraps in IMS state provider
- [ ] All sub-components aware of current state
- [ ] State changes update UI immediately
- [ ] Loading states shown during transitions

**IMS Implementation Confirmed by CC:** _______

---

## SECTION 4: CONFIDENCE GATE IMPLEMENTATION

### 4.1 Confidence Calculation

```typescript
type Confidence = number; // 0.0 - 1.0 (max 0.92)
type ConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW';

function calculateConfidence(...factors): Confidence {
  // Implementation from PTC decision model
  // Return value capped at 0.92
  return Math.min(result, 0.92);
}

function getConfidenceBand(confidence: Confidence): ConfidenceBand {
  if (confidence >= 0.75) return 'HIGH';
  if (confidence >= 0.45) return 'MEDIUM';
  return 'LOW';
}
```

### 4.2 FLAG-B01 Compliance

- [ ] Signal type determined (Discovery / Validation / Insight)
- [ ] FLAG-B01 confidence bands applied
- [ ] Escalation to PTC if confidence below threshold
- [ ] Confidence displayed to operator with band color

### 4.3 Ethics Gates (SD+H Framework)

- [ ] Safety gate: Dangerous output blocked? (if applicable)
- [ ] Delight gate: UX impact assessed?
- [ ] Harmony gate: User intent preserved?
- [ ] Override logic: Can operator bypass gates?
  - [ ] If YES: What approval required?
  - [ ] If NO: Hard-coded refusal

### 4.4 Confidence Display

```
Component: <ConfidenceDisplay confidence={0.87} />

Renders:
┌─────────────────────────────────┐
│ Confidence: 87% (HIGH)          │
│ ████████████░░░░░░░░░░░░░░░░░░ │
│                                 │
│ Based on:                       │
│ • Source 1: 95%                 │
│ • Source 2: 82%                 │
│ • Source 3: 78%                 │
│                                 │
│ ⚠ 0.92 hard cap enforced        │
└─────────────────────────────────┘
```

- [ ] Confidence band color-coded (HIGH=green, MED=yellow, LOW=red)
- [ ] Confidence sources listed
- [ ] Confidence uncertainty shown (if applicable)
- [ ] Hard cap at 0.92 enforced

**Confidence Gate Implementation Confirmed by CC:** _______

---

## SECTION 5: PREVIEW REQUIREMENTS

### 5.1 Preview Mode (Standalone, No Build Required)

The preview must work WITHOUT building/running the project:

```bash
# User opens preview-states.html in browser
# All IMS states shown statically
# User can click to switch between states
# No npm install, no build step required
```

### 5.2 Preview HTML Structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Preview: [Surface Name]</title>
  <style>
    /* All CSS embedded */
    /* No external stylesheets */
  </style>
</head>
<body>
  <div id="nav">
    <button onclick="setState('idle')">Idle</button>
    <button onclick="setState('validating')">Validating</button>
    <button onclick="setState('processing')">Processing</button>
    <button onclick="setState('complete')">Complete</button>
    <button onclick="setState('partial_complete')">Partial</button>
    <button onclick="setState('failed')">Failed</button>
  </div>
  
  <div id="preview">
    <!-- Surface rendered for current state -->
  </div>
  
  <script>
    /* All JavaScript embedded */
    /* No external scripts */
  </script>
</body>
</html>
```

### 5.3 Preview States

Generate preview for EACH state:

- [ ] `idle` — Initial UI state
- [ ] `validating` — Validation spinner + UI
- [ ] `processing` — Processing spinner + UI
- [ ] `complete` — Result + confidence display
- [ ] `partial_complete` — Result + warnings
- [ ] `failed` — Error message + retry option

### 5.4 Preview Interactivity

- [ ] Click buttons to switch between states
- [ ] Each state renders correctly
- [ ] Confidence values shown in `complete` state
- [ ] Evidence/reasoning shown (if applicable)

### 5.5 Preview Packaging

```
/preview/
├── preview.html          (standalone HTML + CSS + JS)
├── preview-states.json   (state definitions)
└── preview-scenarios.json (confidence scenarios)
```

**Preview Confirmed by CC:** _______

---

## SECTION 6: KNOWN GAPS & DEFERRED WORK

### 6.1 Intentional Gaps (Known Limitations)

```
Gap 1: [Feature/Capability]
  Reason: [Why not included in v1.0?]
  Impact: [What doesn't work? Workaround?]
  Timeline: v1.1 (when?)

Gap 2: [Feature/Capability]
  ...
```

### 6.2 Pending Dependencies

- [ ] External service not ready? Which one? ETA?
- [ ] API contract not finalized? Which API? ETA?
- [ ] LLM integration pending? (Phase 2 work?)

### 6.3 Phase 2 Work (After v1.0)

What features are intentionally deferred to later phases?

- [ ] Advanced analytics dashboard (v1.1)
- [ ] LLM interpretation layer (v1.1)
- [ ] Mobile app version (v2.0)
- [ ] Etc.

### 6.4 Maintainability Notes

- [ ] Code documentation needed: ___________
- [ ] Architecture diagram needed: __________
- [ ] API documentation needed: ___________
- [ ] Deployment procedure needed: __________

---

## SECTION 7: TESTING REQUIREMENTS

### 7.1 Unit Tests (40-60 tests)

**logic/ims-state-machine.ts:**
```
Test: State transitions
  ✓ idle → validating works
  ✓ validating → processing works
  ✓ processing → complete works
  ✓ All 6 states valid
  ✓ Invalid transitions blocked
  ✓ State history logged

Test: Edge cases
  ✓ Rapid state changes handled
  ✓ Timeout handling
  ✓ Reset after error works
```

**logic/confidence-gates.ts:**
```
Test: Confidence calculation
  ✓ Confidence 0.0-1.0
  ✓ Hard cap at 0.92 enforced
  ✓ Confidence band calculation
  ✓ FLAG-B01 mapping

Test: Ethics gates
  ✓ Safety gate blocks if needed
  ✓ Delight gate impact shown
  ✓ Override logic (if applicable)
```

**logic/decision-model.ts:**
```
Test: 3-question hierarchy
  ✓ Question 1 answered
  ✓ Question 2 answered
  ✓ Question 3 answered
  ✓ Evidence synthesized
```

### 7.2 Integration Tests (10-20 tests)

```
Test: Full user flow
  ✓ Input validation → processing → result
  ✓ Error handling → retry works
  ✓ Confidence display + gates work together
  ✓ State persistence across reloads

Test: UXC compliance
  ✓ C0: Operator has control
  ✓ C1: IMS states work
  ✓ C7: Confidence shown
  ✓ All layers present
```

### 7.3 E2E Tests (5-10 tests)

```
Test: User scenarios
  ✓ Happy path: input → success
  ✓ Error path: input → validation fails → retry
  ✓ Partial success path: input → warnings
  ✓ Confidence below threshold → blocked
```

### 7.4 Test Coverage Target

- [ ] **Minimum:** 80% code coverage
- [ ] **Target:** 90%+ code coverage
- [ ] **Critical paths:** 100% coverage

**Testing Confirmed by CC:** _______

---

## SECTION 8: DTC SIGN-OFF & GATE DECISION

### 8.1 DTC Execution Packet Completion

All sections above have been completed.

**Completed by:** _________________ (DTC Lead)  
**Date:** _______  
**Status:** [ ] COMPLETE [ ] INCOMPLETE (note gaps below)

### 8.2 CC Readiness Assessment

**Can CC proceed with build (Phase 5)?**

- [ ] Framework specified and confirmed
- [ ] Directory structure clear
- [ ] IMS state machine defined
- [ ] Confidence gates defined
- [ ] Preview requirements clear
- [ ] Test requirements defined
- [ ] Known gaps documented

### 8.3 Gate Decision

**Can Phase 5 (CC Build) proceed?**

[ ] **YES** — Execution packet is complete, CC can build  
[ ] **NO** — Gaps remain (see Section 8.2), revise before handoff

**DTC Lead Signature:** _________________ **Date:** _______

**CC Lead Acknowledgment:** _________________ **Date:** _______

---

## USAGE INSTRUCTIONS

### For DTC
1. Receive PTC-Completed Spec (from Phase 3 gate)
2. Complete all 8 sections of this template
3. Review with CC for technical feasibility
4. Confirm Section 8: Gateway decision = YES
5. Provide to CC to begin Phase 5

### For CC
1. Receive Execution Packet from DTC
2. Review all sections
3. Confirm you understand the build requirements
4. Sign Section 8.3 (CC Acknowledgment)
5. Begin Phase 5 build immediately
6. Report blockers if found

---

## GATE STATUS

```
Phase 4: DTC Execution Translation
Input:  PTC-Completed Surface Specification (from Phase 3)
Gate:   This Template (all 8 sections complete + signed)
Output: CC begins build (Phase 5)
Owner:  DTC
Action: CC waits for DTC handoff before Phase 5
```

---

**D2: DTC_EXECUTION_PACKET_TEMPLATE.md**  
**Status:** ACTIVE GATE  
**Blocking:** Phase 5 (CC cannot begin build until GATE PASSES)

