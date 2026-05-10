# Confidence Gates Reference — SCOUT

**Implementation:** src/logic/confidence-gates.ts

## Bands

| Band | Range | Color |
|------|-------|-------|
| HIGH | ≥ 0.75 | `#10b981` |
| MEDIUM | 0.45 – 0.74 | `#f59e0b` |
| LOW | < 0.45 | `#ef4444` |

**Hard cap: 0.92** — confidence never exceeds 0.92 regardless of input values.

## Action Gates (Fail-Closed)

| Action | Minimum Confidence |
|--------|-------------------|
| escalate | 0.75 (HIGH) |
| suppress | 0.75 (HIGH) |
| route_to_interpretation | 0.60 |
| investigate | 0.45 (MEDIUM) |
| export | 0.45 (MEDIUM) |
| trigger_research | 0.45 (MEDIUM) |
| mark_learning_signal | 0.45 (MEDIUM) |
| watch | 0.0 (always allowed) |
| unknown action | BLOCKED |

## Ethics Gates

All three must pass (fail-closed):
- **Safety**: Signal interpretation safe to surface
- **Delight**: Result contributes to operator confidence
- **Harmony**: No conflicting signals or contradictions
