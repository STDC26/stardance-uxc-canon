# SCOUT Signal Observatory — Architecture

**Surface:** scout-signal-observatory v1.0.0
**Phase:** 5 (Build Complete — Phase 7 UAT pending)
**Authority:** SCOUT_CC_EXECUTION_PACKET_v1.0_CORRECTED.md

## Overview

React 18 + TypeScript surface implementing SCOUT signal interpretation with a 6-state IMS,
CQX Conviction Equation Experience (RC-01/RC-02), and OrbitFrame v0.1 binding.

## Directory Layout

```
surfaces/scout-signal-observatory/
├── src/
│   ├── logic/          # Core state machine, confidence gates, orbit binding, classifiers
│   ├── components/     # 11 RC-compliant React components
│   ├── hooks/          # useIMS, useConfidence, useEvidence
│   ├── types/          # IMS, UXC, Evidence, Decision type definitions
│   ├── utils/          # formatters, validators
│   ├── data/           # JSON config: IMS states, signal types, initial state
│   ├── styles/         # Vega Dark theme CSS
│   └── tests/          # 8 test suites, 102 tests, 85%+ coverage
├── preview/            # Standalone HTML preview (no build required)
├── docs/               # Architecture docs (this directory)
├── scripts/            # generate-preview.js, validate-uxc.js
└── dist/               # Vite build output
```

## Core Logic Modules

| Module | Purpose |
|--------|---------|
| `ims-state-machine.ts` | 6-state fail-closed machine (9 transitions) |
| `confidence-gates.ts` | Confidence calculation, hard cap 0.92, action gates |
| `orbit-binding.ts` | IMS→Orbit mapping, OrbitFrame v0.1 |
| `signal-classifier.ts` | Keyword-based signal type classification |
| `interpretation-model.ts` | Signal meaning derivation per type |
| `decision-model.ts` | 3-question decision hierarchy |
| `evidence-model.ts` | Evidence synthesis and confidence combination |
| `trust-model.ts` | Trust score accumulation and decay |
| `uxc-enforcement.ts` | C0-C8 structural compliance checks |

## Key Standards

- **RC-01**: CQX = 5-element locked sequence (Context→Outcome→Meaning→Strength→Action)
- **RC-02**: Meaning and Action are separate cognitive operations — structural enforcement via `data-rc02-enforced="true"`
- **RC-06**: 10 mandatory features across 4 architectural categories
- **Fail-closed**: All guards default to FALSE; only explicitly permitted transitions with passing guards proceed
