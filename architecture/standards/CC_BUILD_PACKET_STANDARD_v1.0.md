# CC_BUILD_PACKET_STANDARD_v1.0
## Canonical Execution Format for Surface Implementation

**Owner:** DTC  
**For:** CC (Code Implementation)  
**Purpose:** Reusable standard for all surface builds  
**Status:** ACTIVE ARCHITECTURE  

---

## OVERVIEW

This document defines the REUSABLE standard for all CC surface implementations. Every surface built by CC follows this pattern. This is not surface-specific; it is the canonical template.

---

## 1. BUILD PACKET STRUCTURE (Standard Directory Layout)

```
[surface-name]/
├── 📄 README.md                    (overview + quick start)
├── 📄 MANIFEST.json                (UXC metadata + registry)
├── 📦 package.json                 (dependencies + scripts)
├── 🔧 tsconfig.json                (TypeScript config)
├── 🧪 jest.config.js               (test runner config)
│
├── 📁 src/
│   ├── index.tsx                   (React entry point)
│   ├── App.tsx                     (root component)
│   │
│   ├── 🎨 components/              (UI components)
│   │   ├── Header.tsx
│   │   ├── MainContent.tsx
│   │   ├── StateIndicator.tsx      (shows IMS state)
│   │   ├── ConfidenceDisplay.tsx   (shows confidence + band)
│   │   ├── EvidencePane.tsx        (shows evidence/reasoning)
│   │   ├── ActionPanel.tsx         (operator actions)
│   │   └── [Surface-Specific]
│   │
│   ├── ⚙️  logic/                   (business logic)
│   │   ├── ims-state-machine.ts
│   │   ├── confidence-gates.ts
│   │   ├── decision-model.ts
│   │   ├── evidence-model.ts
│   │   ├── trust-model.ts
│   │   ├── uxc-enforcement.ts
│   │   └── [Domain-Specific]
│   │
│   ├── 🎨 styles/
│   │   ├── main.css
│   │   ├── theme.css
│   │   ├── responsive.css
│   │   └── variables.css
│   │
│   ├── 📝 types/
│   │   ├── Surface.ts
│   │   ├── IMS.ts
│   │   ├── Evidence.ts
│   │   ├── Decision.ts
│   │   └── UXC.ts
│   │
│   ├── 🪝 hooks/
│   │   ├── useIMS.ts
│   │   ├── useConfidence.ts
│   │   ├── useEvidence.ts
│   │   └── [Custom]
│   │
│   ├── 🛠️  utils/
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   ├── api-client.ts
│   │   └── [Utilities]
│   │
│   ├── 💾 data/
│   │   ├── initial-state.json
│   │   ├── ims-config.json
│   │   └── [Domain Data]
│   │
│   └── 🧪 tests/
│       ├── ims-state-machine.test.ts
│       ├── confidence-gates.test.ts
│       ├── decision-model.test.ts
│       ├── integration.test.ts
│       ├── uxc-compliance.test.ts
│       ├── e2e.test.ts
│       └── [Custom Tests]
│
├── 🌐 public/
│   ├── index.html
│   ├── favicon.ico
│   └── [Static Assets]
│
├── 👁️  preview/
│   ├── preview.html                (standalone, no build)
│   ├── preview-states.json
│   ├── preview-scenarios.json
│   └── [Preview Assets]
│
├── 📚 docs/
│   ├── ARCHITECTURE.md
│   ├── IMS_STATE_MACHINE.md
│   ├── CONFIDENCE_GATES.md
│   ├── DECISION_HIERARCHY.md
│   ├── UXC_COMPLIANCE.md
│   └── [Implementation Guides]
│
└── ⚙️  scripts/
    ├── generate-preview.js
    ├── validate-uxc.js
    └── [Build Scripts]
```

---

## 2. CORE LOGIC MODULES (Standard Implementations)

### 2.1 logic/ims-state-machine.ts (REQUIRED)

```typescript
// Standard IMS state machine implementation
// Every surface has this file

export type IMSState = 
  | 'idle'
  | 'validating'
  | 'processing'
  | 'complete'
  | 'partial_complete'
  | 'failed';

export interface IMSTransition {
  from: IMSState;
  to: IMSState;
  condition: (context) => boolean;
  action?: (context) => void;
}

export class IMSStateMachine {
  currentState: IMSState = 'idle';
  transitions: IMSTransition[] = [ /* all 6 states */ ];
  
  canTransition(to: IMSState): boolean {
    // Fail-closed: default to false
    // Only transition if explicit rule exists and passes
  }
  
  transition(to: IMSState): boolean {
    // Attempt transition
    // Log history
    // Emit event
  }
}
```

**Standard Export:** `new IMSStateMachine()`  
**Required Methods:** `canTransition()`, `transition()`, `getState()`  
**Required Events:** `on('state-change', callback)`  

### 2.2 logic/confidence-gates.ts (REQUIRED)

```typescript
// Standard confidence calculation and gating

export type ConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ConfidenceGate {
  calculate(...factors): Confidence;
  enforce(): boolean;  // blocks if confidence below threshold
  display(): ConfidenceBand;
}

export class ConfidenceGates {
  // Calculate confidence from factors
  calculate(...factors): number;
  
  // Cap at 0.92 (hard limit)
  private capAt092(value: number): number;
  
  // Get confidence band
  getBand(confidence: number): ConfidenceBand;
  
  // Check if action allowed
  canExecuteAction(action: string, confidence: number): boolean;
}
```

**Standard Export:** `new ConfidenceGates()`  
**Required Methods:** `calculate()`, `getBand()`, `canExecuteAction()`  
**Hard Cap:** 0.92 (non-negotiable)  

### 2.3 logic/decision-model.ts (REQUIRED)

```typescript
// Standard 3-question decision hierarchy

export interface DecisionHierarchy {
  question1: string;  // "What am I looking at?"
  question2: string;  // "What does it mean?"
  question3: string;  // "What should I do?"
}

export class DecisionModel {
  hierarchy: DecisionHierarchy;
  
  // Answer each question
  answer1(): string;
  answer2(): string;
  answer3(): string;
  
  // Show evidence for each
  getEvidence(): Evidence[];
  
  // Reasoning
  getReasoning(): string;
}
```

**Standard Export:** `new DecisionModel()`  
**Required Methods:** `answer1()`, `answer2()`, `answer3()`, `getEvidence()`  
**Pattern:** 3-question format always  

---

## 3. COMPONENT STANDARD (React Example)

```typescript
// Every surface component follows this pattern

import React, { useReducer, useEffect } from 'react';
import { IMSStateMachine, ConfidenceGates } from '../logic';

export const SurfaceComponent: React.FC = () => {
  // 1. State management
  const [imsState, setIMSState] = React.useState<IMSState>('idle');
  const [confidence, setConfidence] = React.useState<number>(0);
  const [result, setResult] = React.useState<any>(null);

  // 2. Effect: render based on IMS state
  useEffect(() => {
    switch (imsState) {
      case 'idle':
        return renderIdleUI();
      case 'validating':
        return renderValidatingUI();
      case 'processing':
        return renderProcessingUI();
      case 'complete':
        return renderCompleteUI();
      case 'partial_complete':
        return renderPartialUI();
      case 'failed':
        return renderFailedUI();
    }
  }, [imsState]);

  // 3. Action handlers
  const handleSubmit = async (input) => {
    setIMSState('validating');
    // ... validation logic
    setIMSState('processing');
    // ... processing logic
    setIMSState('complete');
    setConfidence(calculatedConfidence);
    setResult(output);
  };

  // 4. Render
  return (
    <div className="surface-root">
      <Header />
      <StateIndicator state={imsState} />
      <MainContent state={imsState} />
      {imsState === 'complete' && (
        <ConfidenceDisplay confidence={confidence} />
      )}
      <ActionPanel onAction={handleSubmit} disabled={imsState !== 'idle'} />
    </div>
  );
};
```

**Pattern:** Every component follows state → render lifecycle  
**Requirement:** IMS state must be visible  
**Requirement:** Confidence must be shown in complete state  

---

## 4. TEST STRUCTURE (Standard)

```
tests/

├── ims-state-machine.test.ts
│   ├── "All 6 states exist"
│   ├── "State transitions work"
│   ├── "Invalid transitions blocked"
│   ├── "State history logged"
│   └── (6-8 tests total)
│
├── confidence-gates.test.ts
│   ├── "Confidence calculates 0.0-1.0"
│   ├── "Hard cap at 0.92 enforced"
│   ├── "Confidence bands correct"
│   ├── "Gates block low confidence"
│   └── (6-8 tests total)
│
├── decision-model.test.ts
│   ├── "3 questions answered"
│   ├── "Evidence synthesized"
│   ├── "Reasoning shown"
│   └── (4-5 tests total)
│
├── integration.test.ts
│   ├── "Full flow: input → success"
│   ├── "Error flow: input → retry"
│   ├── "Confidence gates work with state machine"
│   ├── "All UXC layers present"
│   └── (6-8 tests total)
│
├── uxc-compliance.test.ts
│   ├── "C0: Operator control"
│   ├── "C1: IMS 6 states"
│   ├── "C7: Confidence shown"
│   ├── "C8: Metadata present"
│   └── (8 tests, one per layer)
│
└── e2e.test.ts
    ├── "User can input and get result"
    ├── "Errors are recoverable"
    ├── "Confidence affects action availability"
    └── (3-5 tests)

Total: 40-60 test cases minimum
Target: 90%+ code coverage
Critical paths: 100% coverage
```

---

## 5. PACKAGE.JSON STANDARD (Scripts)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:xas": "jest architecture/xas/tests/",
    
    "validate:uxc": "node scripts/validate-uxc.js",
    "generate:preview": "node scripts/generate-preview.js",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    
    "ci": "npm run lint && npm run test && npm run build && npm run validate:uxc"
  }
}
```

---

## 6. PREVIEW MODE STANDARD (Standalone HTML)

Every surface must generate a preview that works WITHOUT building:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>[Surface Name] - Preview</title>
  <style>
    /* All CSS inline */
    [Theme CSS, Responsive CSS, Component CSS]
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
    // All JavaScript inline
    let currentState = 'idle';
    function setState(state) {
      currentState = state;
      renderPreview();
    }
    function renderPreview() {
      // Render surface for currentState
    }
    // Initialize
    renderPreview();
  </script>
</body>
</html>
```

**Requirement:** No build, no npm install, just open in browser  
**Requirement:** All 6 states clickable  
**Requirement:** Confidence shown in complete/partial states  

---

## 7. MANIFEST.JSON STANDARD (Registry Metadata)

```json
{
  "surface_id": "scout-signal-observatory-v1.0.0",
  "name": "SCOUT Signal Observatory",
  "version": "1.0.0",
  "product": "SCOUT",
  "owner": "SCOUT Product Team",
  "description": "[Brief description]",
  
  "uxc_certification": {
    "c0": true,
    "c1": true,
    "c2": true,
    "c3": true,
    "c4": true,
    "c5": true,
    "c6": true,
    "c7": true,
    "c8": true,
    "certified_by": "DTC + PTC",
    "certified_date": "YYYY-MM-DD"
  },
  
  "status": "production_ready",
  "ims_states": ["idle", "validating", "processing", "complete", "partial_complete", "failed"],
  "dominant_object": "Signal",
  "canonical_bindings": ["stardance-canon-v3.0"],
  "uri": "/surfaces/scout-signal-observatory/v1.0.0",
  
  "known_gaps": [
    "[Feature deferred to v1.1]"
  ],
  
  "created_date": "2026-05-XX",
  "modified_date": "2026-05-XX"
}
```

---

## 8. DOCUMENTATION STANDARD (Required Docs)

Every surface must include:

1. **README.md** — Overview + quick start
2. **ARCHITECTURE.md** — System design
3. **IMS_STATE_MACHINE.md** — State definitions
4. **CONFIDENCE_GATES.md** — Confidence logic
5. **DECISION_HIERARCHY.md** — 3-question format
6. **UXC_COMPLIANCE.md** — C0-C8 mapping

---

## 9. BUILD CHECKLIST (Before CC Completes)

- [ ] All 6 IMS states implemented
- [ ] Confidence gates working (0.0-1.0, capped 0.92)
- [ ] 40-60 unit tests passing
- [ ] 80%+ code coverage
- [ ] Preview mode works (standalone HTML)
- [ ] All documentation complete
- [ ] MANIFEST.json generated
- [ ] Tests pass: `npm run test`
- [ ] Build succeeds: `npm run build`
- [ ] UXC validation passes: `npm run validate:uxc`

---

## 10. HANDOFF CHECKLIST (CC → UAT)

Before Surface Enters Phase 6 (UAT):

- [ ] All source code committed
- [ ] All tests passing (40-60 tests, 80%+ coverage)
- [ ] Preview mode working
- [ ] Documentation complete
- [ ] MANIFEST.json created and signed
- [ ] Build verified: `npm run build` succeeds
- [ ] No console errors or warnings
- [ ] Responsive design verified (mobile-first)
- [ ] Known gaps documented
- [ ] Ready for DRJ + PTC UAT

---

**CC_BUILD_PACKET_STANDARD_v1.0**  
**Status:** ACTIVE REUSABLE ARCHITECTURE  
**Used By:** Every surface build (CC)  
**Next Phase:** UAT (Phase 6)

