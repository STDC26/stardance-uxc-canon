# SPIKE_FLASH Operational Mode Specification v0.1

**Directive:** DRJ-AUTH-SPIKE_FLASH-IMMEDIATE-BUILD-v1.0
**Authority:** DRJ
**Owner:** DTC
**Status:** APPROVED AND LOCKED — IMMEDIATE BUILD AUTHORIZED
**Date:** 2026-05-13
**Runtime:** `tools/spike-flash/`

---

## PURPOSE

SPIKE_FLASH is the reconnaissance intelligence layer of SCOUT.

Operators receive directional signal conviction within 1-2 minutes — before intelligence maturity is required. It answers one question:

> **Are we looking in the right places right now?**

---

## POSITIONING

- **SignalFirst starts with SPIKE.**
- SPIKE_FLASH compresses time-to-conviction without sacrificing governance.
- Operators must never fly blind while waiting for intelligence maturity.

---

## RUNTIME CLASSIFICATION

| Property | Value |
|----------|-------|
| Mode ID | SPIKE_FLASH |
| Class | rapid_reconnaissance_signal_mode |
| Runtime target | 1-2 minutes |
| Cognition layer | OCS_Lite |
| Runtime goal | Immediate directional conviction |

---

## OPERATOR COGNITION SEQUENCE (OCS Lite — 4 layers)

| Layer | Question |
|-------|---------|
| Intent | What am I trying to achieve? |
| Sensing | What am I scouting for? |
| Orientation | What is SCOUT seeing? |
| Action | What should I do next? |

---

## REQUIRED INPUTS

| Input | Description |
|-------|-------------|
| `objective` | What the operator wants to learn or validate |
| `signal_thesis` | The hypothesis being tested |
| `target_keywords` | Primary search terms |
| `source_types` | Habitats to sweep |
| `market_or_domain` | Target market or domain context |
| `desired_decision` | The decision this SPIKE must inform |

---

## REQUIRED OUTPUTS

### top_signals (3-10)
Each signal carries: title, source, source_quality, excerpt, relevance_score, signal_category.

### source_quality classifications
- `rich` — strong signal density, credible source
- `moderate` — useful signals, some noise
- `weak` — low signal density or credibility concerns
- `failed` — no usable signal retrieved

### signal_yield_likelihood (SYL)
- `LOW` — weak habitat, limited signal, consider redirect
- `MEDIUM` — some signal present, territory warrants monitoring
- `HIGH` — clear signal habitat, pursue with confidence
- `CRITICAL` — urgent signal density, immediate action warranted

### recommendation
One of: `CONTINUE` | `REFINE` | `EXPAND` | `REDIRECT` | `KILL`

### founder_summary
Compressed signal brief (≤200 words). Fast, directional, decision-ready.

### board_summary
Executive signal summary (≤150 words). Conviction-grade, board-readable.

---

## SIGNAL CATEGORIES

1. AI operational adaptation
2. SignalFirst demand
3. Enterprise AI friction
4. Operator overload
5. Workflow intelligence gaps
6. Decision latency pain
7. Competitive intelligence demand
8. AI governance pressure
9. Organizational adaptation pressure
10. Runtime cognition pain

---

## SOURCE HABITATS

Reddit, LinkedIn, careers pages, review sites, AI communities, operator discussions,
founder discussions, workflow forums, enterprise AI discourse, creative signal sources.

---

## EXECUTION FLOW

| Step | Name | Purpose |
|------|------|---------|
| 1 | rapid_target_load | Load operator SPIKE config |
| 2 | broad_habitat_sweep | Sweep configured habitats |
| 3 | signal_extraction | Extract signals, classify source quality |
| 4 | SYL_scoring | Score signal yield likelihood |
| 5 | signal_compression | Generate founder and board summaries |
| 6 | recommendation_generation | Generate directional recommendation |

---

## OUTPUT FILES (per run)

```
outputs/spike_flash/<run_id>/
  SPIKE_FLASH_BRIEF.md     — Founder + board brief (human-readable)
  spike_payload.json        — Structured signal payload
  source_quality.csv        — Source quality ranking
```

---

## PERFORMANCE TARGETS

| Metric | Target |
|--------|--------|
| Time to first signal | ≤30 seconds |
| Time to directional conviction | ≤2 minutes |
| Time to founder readability | ≤60 seconds |
| Time to board summary | ≤90 seconds |

---

## ACCEPTANCE CRITERIA

- Founder can run SPIKE_FLASH immediately from CLI
- Directional conviction delivered in ≤2 minutes
- Rich and weak habitats are explicitly surfaced
- Meaningful recommendation generated
- Board-readable brief generated automatically
- Runs independently of scheduled SCOUT cadence

---

## FAILURE CONDITIONS

- Requires multi-hour waiting period
- Outputs are only raw logs
- Weak sources invisible
- No directional recommendation generated
- Runtime too cognitively dense
- Blocked by enterprise architecture concerns

---

## DESIGN CONSTRAINTS

- No over-engineering
- No enterprise abstractions
- No runtime fragmentation
- No governance recursion
- Not blocked by DeerFlow or persistence rewrites
- Optimise for immediate operational value

**Accepted tradeoffs:** Lower recurrence confidence. Limited longitudinal insight.
Lighter governance. Simplified UI. Partial persistence.

---

## NOT REQUIRED IN v0.1

- Full SCOUTv2 runtime
- Multi-workspace isolation
- Advanced orchestration
- Full memory system
- Advanced recurrence tracking
- Production hardening

---

## RELATIONSHIP TO SCOUT ARCHITECTURE

SPIKE_FLASH is the entry point of the tempo-orchestrated SCOUT runtime.
Signals discovered in a SPIKE_FLASH run can seed the SCOUT_DAY and
SCOUT_COMPOUND pipelines without re-ingestion.

Governed by: `SCOUT_SPIKE_MODES_v0.2.md`
Build standard: `CC_BUILD_PACKET_STANDARD_v1.0.md`

---

**SPIKE_FLASH_v0.1**
**Status:** APPROVED AND LOCKED
**Authority:** DRJ
