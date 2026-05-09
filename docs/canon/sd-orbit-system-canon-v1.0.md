# SD-ORBIT-SYSTEM-CANON v1.0

**Status:** CANONICAL · LOCKED · BINDING  
**Authority:** DRJ  
**Version:** 1.0  
**Effective:** 2026-05-08  
**Governed By:** stardance-uxc-canon  

---

## 1. Authority Statement

This document is the canonical source of truth for the Orbit Intelligence System.  
All implementation, copy, design, and engineering decisions defer to this document.  
Conflicts are resolved by DRJ. No appeal.

---

## 2. Relationship to Parent Canons

| Canon | Relationship |
|---|---|
| Journey Canon v1.0 | Orbit is the operator-facing embodiment of Journey Canon doctrine |
| Brand Canon v3.0 | Orbit expresses the Stardance brand through state-driven visual language |
| UXC v2.0 (C0–C7) | Orbit surfaces are governed by all 8 UXC contract layers |

---

## 3. The Five Canonical Intelligence States

Intelligence is not a pipeline. It is a continuous, recursive cycle. These five states
represent how intelligence operates — not in sequence, but in ongoing interaction.

### 3.1 SIGNAL & SENSE
- **ID:** `signal_sense`
- **Meaning:** Detect meaningful movement
- **Emotion:** Calm perception
- **Color:** `#0891B2` (Teal/Cyan)
- **Background:** `#164e63`
- **Doctrine:** You are always sensing. Signal & Sense never turns off. It feeds every
  other state continuously, not as a "first step."

### 3.2 INTERPRET & INTENT
- **ID:** `interpret_intent`
- **Meaning:** Form directional intelligence
- **Emotion:** Focused clarity
- **Color:** `#0EA5E9` (Blue)
- **Background:** `#0c4a6e`
- **Doctrine:** Interpretation transforms raw signal into directional hypothesis. Intent
  is the will behind the interpretation — the "what to do about it."

### 3.3 CRAFT & REFINE
- **ID:** `craft_refine`
- **Meaning:** Structure and improve intelligence
- **Emotion:** Controlled sophistication
- **Color:** `#A855F7` (Purple)
- **Background:** `#581c87`
- **Doctrine:** Craft is the act of building. Refinement is continuous — the surface
  always has room to improve. No output is final on first pass.

### 3.4 ORCHESTRATE & AMPLIFY
- **ID:** `orchestrate_amplify`
- **Meaning:** Coordinate and scale outcomes
- **Emotion:** Synchronized expansion
- **Color:** `#FBBF24` (Gold)
- **Background:** `#78350f`
- **Doctrine:** Orchestration is multi-dimensional coordination. Amplification means
  the intelligence reaches further — more people, more contexts, more impact.

### 3.5 ADAPT & EVOLVE
- **ID:** `adapt_evolve`
- **Meaning:** Continuously learn and optimize
- **Emotion:** Recursive maturation
- **Color:** `#10B981` (Teal/Green)
- **Background:** `#064e3b`
- **Doctrine:** Adaptation is not recovery from failure. It is the normal state of a
  healthy intelligence system. Every cycle makes it smarter.

---

## 4. Recursive Doctrine (Not Linear)

**Orbit is not a pipeline. It is not a funnel. It is not a workflow.**

Intelligence does not move Signal → Interpret → Craft → Orchestrate → Adapt
in a straight line and stop. It orbits. At any given moment, a system is
simultaneously sensing, interpreting, crafting, orchestrating, and adapting.

**Forbidden linear patterns:**
- Progress bars showing "Step 1 of 5"
- Numbered sequential navigation (Step 1 → Step 2 → Step 3)
- "Complete this phase to unlock the next"
- Percentage completion indicators
- Pipeline metaphors in copy or UX

**Required recursive patterns:**
- State indicators that show which mode is *currently dominant*
- Language that positions the operator as always in the cycle, not progressing through it
- Visual language that suggests orbit, cycle, or resonance — not progress
- Copy: "Part of your continuous intelligence evolution" (not "you are 40% complete")

---

## 5. Infrastructure Abstraction Rules

The following system names are **forbidden in operator-facing UX**:

| System Name | Why Forbidden |
|---|---|
| SCOUT | Internal intelligence system name |
| BASE | Internal analysis engine name |
| CORTEX | Internal processing architecture |
| EDGE | Internal distribution layer |
| FORGE | Internal build infrastructure |
| PLA | Internal scoring framework |
| HCTS | Internal trait scoring model |

**What operators see instead:**
Orbit state names, surface function names, and Journey Canon language.

---

## 6. Motion Doctrine

Motion in Orbit surfaces must serve doctrine, not demonstrate capability.

| Mode | Behavior | When to Use |
|---|---|---|
| `none` | No animation | Performance-critical or accessibility-required contexts |
| `subtle` | Gentle 3s pulse on active state indicator | Default for all surfaces |
| `reduced` | System-respects `prefers-reduced-motion` | Always check before applying subtle |

**Forbidden motion patterns:**
- Continuous spinning rings (v0.1 — post-launch enhancement only)
- State transition animations with external animation libraries (Framer, Rive, GSAP)
- Motion that does not have a functional purpose
- Animation that blocks rendering or increases bundle size in v0.1

---

## 7. Six Core System Principles

1. **Intelligence is recursive, not linear.** The orbit never completes — it evolves.
2. **The operator is the subject, the system is the instrument.** Copy always positions
   the human as the active agent.
3. **State is visible, not hidden.** The current orbit state is always declared and surfaced.
4. **Infrastructure is abstracted.** System names never appear in primary operator UX.
5. **Doctrine is embedded, not documented separately.** Every surface carries its own
   compliance metadata.
6. **Evolution is continuous.** "Part of your continuous intelligence evolution" is a
   live statement, not a tagline.

---

## 8. Emotional Experience Requirements

Each orbit state must evoke a specific emotional response in the operator. These are
not aspirational — they are binding requirements.

| State | Required Emotion | Forbidden Emotions |
|---|---|---|
| Signal & Sense | Calm perception | Anxiety, urgency, overwhelm |
| Interpret & Intent | Focused clarity | Confusion, hesitation |
| Craft & Refine | Controlled sophistication | Chaos, incompleteness |
| Orchestrate & Amplify | Synchronized expansion | Fragmentation, isolation |
| Adapt & Evolve | Recursive maturation | Regression, finality |

---

## 9. Forbidden vs. Approved UX Patterns

### Forbidden
- Progress bars or percentage indicators
- "Step X of Y" navigation
- Sequential unlock patterns ("complete this to continue")
- System infrastructure names in navigation or headings
- Linear workflow metaphors
- Completion language ("you have finished", "process complete")

### Approved
- State indicators (which orbit mode is dominant now)
- Recursive cue language ("your intelligence is continuously evolving")
- Non-sequential navigation between orbit states
- Operator-as-subject copy ("you are sensing", "your hypothesis is forming")
- Visual orbit rings suggesting cyclic motion (static in v0.1)

---

*This document is CANONICAL. Modifications require DRJ approval and a version bump.*
