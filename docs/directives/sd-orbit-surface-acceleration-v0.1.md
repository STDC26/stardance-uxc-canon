# SD-ORBIT-SURFACE-ACCELERATION v0.1

**Status:** DIRECTIVE — Execution Authority  
**Authority:** DRJ  
**Executor:** CC  
**Verifier:** DTC  
**Version:** 0.1  
**Effective:** 2026-05-08  

---

## 1. Executive Summary

Build OrbitFrame v0.1 as a canonical reference implementation in `stardance-uxc-canon`.
Timeline: 2 weeks. This does not block the 3-surface live launch.
The reference package provides the authoritative spec for production integration.

---

## 2. Build Posture

**Thin layer only.**

- No SDK
- No motion engine
- No Figma dependency
- No runtime architecture complexity
- No external animation libraries

---

## 3. CC Execution Tasks

| Task | Deliverable | Status |
|---|---|---|
| CC-ORBIT-001 | `OrbitFrame.types.ts` — TypeScript interfaces | Required |
| CC-ORBIT-002 | `orbit-states.config.ts` — Canonical state config | Required |
| CC-ORBIT-003 | `OrbitFrame.tsx` — Main wrapper component | Required |
| CC-ORBIT-004 | `OrbitHeader.tsx` + `OrbitVisual.tsx` + `UXCMetadata.tsx` | Required |
| CC-ORBIT-005 | 3 sample surface wrappers | Required |

---

## 4. DTC Responsibilities

- Approve copy in all markdown docs before merge
- Gate launch checklist before production ship
- Verify no forbidden terms in component code
- Sign off on UXC compliance metadata structure

---

## 5. Acceptance Criteria

All of the following must be true before this directive is closed:

**Component Build:**
- OrbitFrame.tsx compiles (TypeScript strict mode)
- All 7 files created in `/reference/components/OrbitFrame/`
- No external animation dependencies
- Component accepts children slot

**State Configuration:**
- All 5 canonical states defined
- State IDs immutable
- Color values match canon
- TypeScript enforces state correctness

**Surface Samples:**
- 3 sample wrappers created
- Integration pattern is clear and copy-pasteable
- No assumptions about production file paths

---

## 6. Launch-Blocking Validation Checklist

See `/reference/checklists/orbit-frame-v0.1-validation.md` for the full pre-launch checklist.

**Summary launch blockers:**
- No system names in primary navigation (SCOUT, BASE, CORTEX, EDGE, FORGE, PLA, HCTS)
- No progress bars or percentage indicators
- No Step X of Y sequential UX
- No linear workflow patterns
- Recursive intelligence language present
- No external blocking dependencies

---

## 7. Post-Launch Backlog (Deferred — Do Not Build in Week 1-2)

### Week 3-4
- `SD-ORBIT-MOTION-ENGINE-v0.1`: Continuous rotation, state transition glow, spiral acceleration
- `SD-ORBIT-GLYPH-SYSTEM-v0.1`: 5 canonical glyphs, 4 size variants, animation variations

### Week 5-6
- `SD-ORBIT-SDK-ARCHITECTURE`: React hooks, state management, compliance utilities, telemetry
- `SD-ORBIT-COMPLIANCE-VALIDATOR`: Automated scanning, copy validation, color contrast checking

### Week 6-7+
- `SD-ORBIT-FIGMA-SYSTEM-COMPLETION`: Full Figma file, design tokens, motion spec
- `SD-ORBIT-MOTION-PROTOTYPE-EXPLORATION`: Rive vs. Framer vs. Three.js evaluation

**BLOCKING RULE:** Any PR related to these items that merges before launch automatically blocks the 3-surface launch. DTC gates this.

---

## 8. Immutable Constraints

1. Launch in 2 weeks. Do not delay for any Orbit feature.
2. OrbitFrame v0.1 only. No SDK, no motion engine, no Figma, no runtime complexity.
3. All 3 surfaces must ship together. No partial launches.
4. Preserve doctrine. Journey Canon embedded from day 1.
5. Hide infrastructure. No internal system names in primary operator UX.
6. No linear workflow. No progress bars, no step counting, no pipeline language.

---

## 9. Decision Authority

| Role | Authority |
|---|---|
| DRJ | Final scope, timeline, priorities. No appeal. |
| DTC | Copy, design, UXC compliance gates. Launch blocking authority. |
| CC | Build quality, TypeScript, performance. Merge authority. |

---

*Status: DIRECTIVE. Execution authority is DRJ. No re-architecting without DRJ approval.*
