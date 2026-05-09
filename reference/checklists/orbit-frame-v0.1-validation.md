# OrbitFrame v0.1 — UXC Validation Checklist

**Status:** CHECKLIST — Use before production launch  
**Authority:** SD-ORBIT-SURFACE-ACCELERATION v0.1 / DTC  

---

## Pre-Launch Validation

### Component Build
- [ ] `OrbitFrame.tsx` compiles with TypeScript strict mode: 0 errors
- [ ] All 7 component files present in `/OrbitFrame/` directory
- [ ] No external animation library imports (Framer, GSAP, Rive, etc.)
- [ ] No motion engine imports
- [ ] Component accepts children slot
- [ ] Bundle size < 50 KB for OrbitFrame (excluding CSS)

### State Configuration
- [ ] `orbit-states.config.ts` defines all 5 canonical states
- [ ] State IDs are immutable: `signal_sense`, `interpret_intent`, `craft_refine`, `orchestrate_amplify`, `adapt_evolve`
- [ ] Color values match canonical spec (see SD-ORBIT-SYSTEM-CANON v1.0 §3)
- [ ] Descriptions reinforce recursive intelligence doctrine
- [ ] TypeScript types enforce state correctness — no raw string literals

### Visual Rendering
- [ ] `OrbitHeader` renders: state label, state meaning, recursive cue
- [ ] `OrbitVisual` renders: three concentric SVG rings, central anchor, state indicator
- [ ] Active state indicator shows correct `shortLabel` for current `orbit_state`
- [ ] State colors correctly map to canonical config
- [ ] Static fallback is visually acceptable (no animation required for pass)

### Surface Integration
- [ ] All 3 launch surfaces wrapped with `OrbitFrame`
- [ ] Signal Discovery Hub: `orbit_state="signal_sense"`
- [ ] Interpretation Canvas: `orbit_state="interpret_intent"`
- [ ] Creation Studio: `orbit_state="craft_refine"`
- [ ] `state_meaning` and `recursive_cue` filled in on all surfaces
- [ ] `uxc_status="verified"` on all 3 surfaces
- [ ] All surfaces render without console errors

### UXC Compliance Metadata
- [ ] `UXCMetadata` renders on all 3 surfaces
- [ ] Output is valid JSON-LD (`<script type="application/ld+json">`)
- [ ] Metadata includes: `surface_id`, `surface_name`, `orbit_state`, `uxc_status`
- [ ] `journey_canon_compliant: true`
- [ ] `no_infrastructure_names: true`
- [ ] `no_progress_bars: true`
- [ ] `no_linear_workflow: true`
- [ ] UXC tooling can extract metadata programmatically

---

## Launch-Blocking UXC Copy Checks

- [ ] No system names in primary navigation: SCOUT, BASE, CORTEX, EDGE, FORGE, PLA, HCTS
- [ ] No progress bars or percentage completion indicators visible anywhere
- [ ] No "Step 1 of X", "Step 2 of X", or numbered sequential UX patterns
- [ ] No "complete this phase to unlock" or sequential lock patterns
- [ ] No linear workflow UX (sequential navigation disabled)
- [ ] All copy uses approved Orbit terminology: Signal, Sense, Intent, Refine, Amplify, Evolve, Adapt
- [ ] Recursive intelligence language present on all 3 surfaces
- [ ] No external blocking dependencies (no animation libs, no Figma files, no motion engines)

---

## Accessibility

- [ ] Color contrast passes WCAG AA (minimum 4.5:1 for text)
- [ ] `prefers-reduced-motion` respected — pulse animation stops when reduced motion enabled
- [ ] Keyboard navigation works across all 3 surfaces
- [ ] `aria-hidden="true"` applied to decorative orbit visual elements

---

## Performance

- [ ] `npm run build` succeeds — 0 TypeScript errors
- [ ] No console errors or warnings
- [ ] No network requests initiated by `OrbitFrame` itself
- [ ] Lighthouse score ≥ 90 on desktop
- [ ] Mobile performance acceptable (Lighthouse mobile ≥ 85)

---

## Responsive

- [ ] Desktop (1920px): Full orbit visual, standard header
- [ ] Tablet (768px): Orbit visual present, compact header
- [ ] Mobile (375px): Orbit visual hidden (expected per spec), minimal header

---

## Sign-Off

| Role | Name | Date | Signature |
|---|---|---|---|
| DTC (Copy & Design) | | | |
| CC (Build Quality) | | | |
| QA (No Blockers) | | | |
| DRJ (Launch Approval) | | | |

**Launch status: BLOCKED until all boxes checked and all sign-offs obtained.**
