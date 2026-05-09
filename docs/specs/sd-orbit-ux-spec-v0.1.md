# SD-ORBIT-UX-SPEC v0.1

**Status:** SPECIFICATION — Normative for implementation  
**Authority:** DRJ  
**Version:** 0.1  
**Effective:** 2026-05-08  
**Parent Canon:** SD-ORBIT-SYSTEM-CANON v1.0  

---

## 1. OrbitFrame Component Overview

OrbitFrame is the canonical wrapper component for all Orbit-governed surfaces.
It embeds Journey Canon doctrine, declares the active orbit state, and provides
UXC compliance metadata automatically.

**What it does:**
- Declares the active orbit state to the operator
- Renders a static orbit visual (rings + state indicator)
- Wraps any surface content in a UXC-compliant container
- Embeds JSON-LD compliance metadata (invisible to operator)
- Provides the canonical visual language for orbit state

**What it does NOT do:**
- Manage application state
- Handle routing
- Animate (v0.1 — post-launch enhancement)
- Connect to external APIs

---

## 2. Props Interface

```typescript
interface OrbitFrameProps {
  // Required
  surface_id: string;          // Canonical surface identifier (e.g., "signal-discovery-hub")
  surface_name: string;        // Human-readable surface name
  orbit_state: OrbitState;     // Which of the 5 canonical states is currently dominant
  state_meaning: string;       // One-line meaning of the current state
  recursive_cue: string;       // Doctrine-aligned cue for the operator

  // Optional with defaults
  uxc_status?: UXCStatus;      // default: "draft" | "review" | "verified" | "blocked"
  show_orbit_visual?: boolean; // default: true
  motion_mode?: MotionMode;    // default: "subtle" | "none" | "reduced"
  variant?: Variant;           // default: "desktop" | "tablet" | "mobile"

  // Content slot
  children: React.ReactNode;
}
```

---

## 3. Type Definitions

```typescript
type OrbitState =
  | "signal_sense"
  | "interpret_intent"
  | "craft_refine"
  | "orchestrate_amplify"
  | "adapt_evolve";

type MotionMode = "none" | "subtle" | "reduced";
type Variant    = "desktop" | "tablet" | "mobile";
type UXCStatus  = "draft" | "review" | "verified" | "blocked";
```

---

## 4. Component Responsibilities

### OrbitFrame (root)
- Applies `data-orbit-state`, `data-surface-id`, `data-uxc-status` attributes
- Applies responsive variant class
- Composes OrbitHeader, OrbitVisual, content slot, UXCMetadata

### OrbitHeader
- Renders the Stardance logo mark (mini)
- Renders state label in canonical state color
- Renders `state_meaning` (one line)
- Renders `recursive_cue` (doctrine-aligned)

### OrbitVisual
- Renders three concentric SVG ring circles
- Renders central anchor point
- Renders active state indicator dot with `shortLabel`
- Applies CSS pulse animation when `motion_mode="subtle"`
- No animation library imports

### UXCMetadata
- Renders `<script type="application/ld+json">` tag
- Invisible in the operator UI
- Machine-readable compliance record
- Consumed by UXC compliance tooling

---

## 5. State Config Schema

```typescript
interface OrbitStateConfig {
  id:              OrbitState;   // LOCKED — do not change
  label:           string;       // e.g., "SIGNAL & SENSE"
  shortLabel:      string;       // e.g., "SIGNAL"
  meaning:         string;       // e.g., "Detect meaningful movement"
  emotion:         string;       // e.g., "calm perception"
  color:           string;       // Hex — LOCKED
  backgroundColor: string;       // Hex — LOCKED
  description:     string;       // Full doctrine-aligned description
}
```

---

## 6. Color & Emotion Mapping

| State | Color | Background | Emotion |
|---|---|---|---|
| signal_sense | `#0891B2` | `#164e63` | calm perception |
| interpret_intent | `#0EA5E9` | `#0c4a6e` | focused clarity |
| craft_refine | `#A855F7` | `#581c87` | controlled sophistication |
| orchestrate_amplify | `#FBBF24` | `#78350f` | synchronized expansion |
| adapt_evolve | `#10B981` | `#064e3b` | recursive maturation |

---

## 7. Motion Modes

| Mode | Behavior | Implementation |
|---|---|---|
| `none` | No animation | No CSS animation applied |
| `subtle` | 3s ease-in-out pulse on state dot | CSS `@keyframes orbit-pulse` injected inline |
| `reduced` | Respects `prefers-reduced-motion` | Component checks media query; falls back to `none` |

**v0.1 constraint:** No external animation libraries. Pure CSS only.

---

## 8. Responsive Variants

| Variant | Max Width | Layout Adjustments |
|---|---|---|
| `desktop` | 1440px | Full orbit visual, standard header padding |
| `tablet` | 768px | Reduced orbit visual, compact header |
| `mobile` | 375px | Orbit visual hidden by default, minimal header |

---

## 9. UXC Metadata Structure

```json
{
  "@context": "https://stardance.io/uxc",
  "type": "OrbitFrame",
  "version": "0.1",
  "surface_id": "signal-discovery-hub",
  "surface_name": "Signal Discovery Hub",
  "orbit_state": "signal_sense",
  "uxc_status": "verified",
  "journey_canon_compliant": true,
  "no_infrastructure_names": true,
  "no_progress_bars": true,
  "no_linear_workflow": true,
  "timestamp": "2026-05-08T00:00:00.000Z"
}
```

---

## 10. Integration Pattern

```typescript
import OrbitFrame from "@/components/OrbitFrame";

export const MyOrbitSurface = () => (
  <OrbitFrame
    surface_id="my-surface"
    surface_name="My Surface Name"
    orbit_state="signal_sense"
    state_meaning="Detect meaningful movement"
    recursive_cue="Part of your continuous intelligence evolution"
    uxc_status="verified"
  >
    {/* Your surface content here */}
  </OrbitFrame>
);
```

---

*Status: SPECIFICATION. Normative for all OrbitFrame v0.1 implementations.*
