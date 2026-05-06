# stardance-sd-ui-canon

**SD UI Canon — Single Source of Truth for Stardance and Docente**

Version: 1.0.0 · 2026-05-05 · UIS v1.0 · UXC v1.3  
**Full specification:** [SPEC.md](./SPEC.md)

---

## Quick Start

```html
<!-- 1. Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap" rel="stylesheet">
<!-- 2. Tokens -->
<link rel="stylesheet" href="tokens/sd-tokens.css">
<!-- 3. Tooltip + hover -->
<link rel="stylesheet" href="components/tooltip-system.css">
<!-- 4. Switcher -->
<script src="components/theme-switcher.js"></script>
```

```html
<!-- 5. Switcher markup -->
<button data-palette="vega"  onclick="SD.handlePalette(this)" data-tooltip="Fifth brightest star in the night sky">Vega</button>
<button data-palette="nova"  onclick="SD.handlePalette(this)" data-tooltip="A stellar explosion from a white dwarf star">Nova</button>
<button data-palette="hydra" onclick="SD.handlePalette(this)" data-tooltip="The outermost moon of Pluto">Hydra</button>
<button data-mode="dark"    onclick="SD.handleMode(this)" data-tooltip="Night sky · pure signal">Dark</button>
<button data-mode="light"   onclick="SD.handleMode(this)" data-tooltip="Full spectrum · nothing hidden">Light</button>
<button data-mode="classic" onclick="SD.handleMode(this)" data-tooltip="Amber glow · ideas first">Vibe</button>
```

## Structure

```
tokens/sd-tokens.css                          ← All 9 theme×mode CSS variables
components/theme-switcher.js                  ← Drop-in switcher · window.SD API
components/tooltip-system.css                 ← Tooltip + hover preview
registry/canon.json                           ← Version manifest
surfaces/approved/docente-cinematic-hero.html ← Tier 3A · locked
surfaces/in-progress/stardance-cinematic-hero.html
tools/uat-relay.html                          ← Theme switcher UAT
SPEC.md                                       ← Full specification (PTC reads this)
```

## UIS Rules

| Rule | Value |
|---|---|
| Grid | 3×3 canonical (theme count = mode count) |
| Default | Vega · Vibe |
| Vanilla | Vanilla is a UXC violation |
| Creative mandate | 3 of 4: Motion · Depth · Character · Memory |

*sd-ui-canon v1.0.0 · DTC authored · PTC governed · DRJ executed*
