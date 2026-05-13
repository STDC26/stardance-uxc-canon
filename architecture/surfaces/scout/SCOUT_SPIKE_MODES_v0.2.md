# SCOUT SPIKE Modes — Multi-Tempo Runtime Specification v0.2

**Directive:** DRJ-AMEND-SCOUT-SPIKE-MODES-v0.2
**Authority:** DRJ
**Owner:** DTC
**Status:** APPROVED AND LOCKED
**Date:** 2026-05-13

---

## STRATEGIC SHIFT

**Old positioning:** Signal conviction within 1-2 days.
**New positioning:** Directional signal conviction within 1-2 minutes, compounding over hours, days, and weeks.

SCOUT is no longer a single-tempo monitoring system. It is a **multi-tempo SignalFirst intelligence runtime** supporting immediate reconnaissance and longitudinal strategic intelligence accumulation.

**Constitutional design principle:**
> SCOUT must never force operators to fly blind while waiting for intelligence maturity. SignalFirst systems must compress time-to-conviction without sacrificing governance or longitudinal intelligence.

---

## RUNTIME MODEL

**Classification:** Tempo-Orchestrated Runtime
**Architecture rule:** One intelligence runtime. Multiple execution tempos. No mode-specific architecture forks.

SCOUT operates as a single runtime with configurable execution depth. All modes share:
- The same signal ingestion pipeline
- The same CQX/OCS cognition layer
- The same confidence and ethics gates
- The same persistence model (where applicable)
- The same operator action surface

This maximises code reuse, preserves signal continuity across tempos, and allows progressive conviction maturation from Flash through Compound.

---

## SIGNALFIRST DOCTRINE

| Track | Purpose |
|-------|---------|
| **SPIKE** | Immediate reconnaissance and directional conviction |
| **COMPOUND** | Longitudinal intelligence maturation |

---

## OPERATOR COGNITION SEQUENCING (OCS) — MANDATORY

All SPIKE and SCOUT modes use OCS as the CQX application layer. The 7-layer question sequence is persistent across all tempos:

| Layer | Operator Question |
|-------|------------------|
| Intent | What am I trying to achieve? |
| Objective | What is my goal or objective? |
| Sensing | What am I scouting for? |
| Orientation | What is SCOUT seeing? |
| Interpretation | Why does this matter? |
| Action | What should I do next? |
| Learning | What should I teach the system? |

OCS is not optional. It is the cognition contract for every mode.

---

## SPIKE MODES

### Priority 1 — SPIKE_FLASH (Flash SPIKE)

**Runtime target:** 1-2 minutes
**Operator question:** Are we looking in the right places right now?
**Recommended UI:** Compressed OCS Lite

**Use cases:**
- Founder intuition validation
- Board prep
- Market curiosity
- Target qualification
- Rapid opportunity sensing
- Competitive pulse checks

**Execution behaviour:**

| Parameter | Value |
|-----------|-------|
| Source depth | Shallow, broad |
| Habitat expansion | Limited |
| LLM passes | Minimal |
| Parallelisation | High |
| Signal threshold | Lower |
| Persistence | Not required |

**Outputs:**
- Directional conviction
- Top 3-5 signals
- Rich vs weak source assessment
- Initial SYL score
- Continue / refine / kill recommendation

**Strengths:** Extremely fast. High founder utility. Rapid target correction. Excellent for board conversations.

**Limitations:** Weak recurrence confidence. Limited narrative maturity. High volatility. Not statistically durable.

---

### Priority 2 — SPIKE_DEEP (Deep SPIKE)

**Runtime target:** 1-2 hours
**Operator question:** Is this territory strategically rich enough to pursue seriously?
**Recommended UI:** Full OCS

**Use cases:**
- Market validation
- Signal habitat qualification
- Investment exploration
- Product appetite validation
- Vertical expansion analysis

**Execution behaviour:**

| Parameter | Value |
|-----------|-------|
| Source depth | Moderate |
| Habitat expansion | Active |
| LLM passes | Moderate |
| Parallelisation | Moderate |
| Signal threshold | Balanced |
| Persistence | Optional |

**Outputs:**
- Narrative clusters
- Pressure visibility
- Signal contradictions
- Adjacent habitat recommendations
- Stronger SYL scoring
- Early trend visibility

**Strengths:** Strong directional conviction. Better source quality assessment. Better narrative understanding. Higher strategic value.

**Limitations:** Still weak on recurrence durability. Limited longitudinal insight.

---

### Priority 3 — SCOUT_DAY (Daily SCOUT)

**Runtime target:** Same-day, multiple scouts
**Operator question:** What is moving today?
**Recommended UI:** SCOUT Reporting Surface

**Use cases:**
- Competitive monitoring
- Operational pressure sensing
- Campaign monitoring
- AI ecosystem movement
- Market narrative tracking

**Execution behaviour:**

| Parameter | Value |
|-----------|-------|
| Source depth | Moderate |
| Habitat expansion | Targeted |
| LLM passes | Moderate |
| Parallelisation | High |
| Signal threshold | Moderate |
| Persistence | Required |

**Outputs:**
- Daily signal digest
- Signal acceleration
- Narrative movement
- Priority alerts
- Operator action recommendations

**Strengths:** Strong operational awareness. Good pressure visibility. Strong narrative tracking.

**Limitations:** Limited long-term recurrence quality.

---

### Priority 4 — SCOUT_COMPOUND (Compound SCOUT)

**Runtime target:** Multi-day to multi-week
**Operator question:** What patterns are hardening over time?
**Recommended UI:** Advanced SCOUT Runtime Surface

**Use cases:**
- Board intelligence
- Investment conviction
- PMF validation
- Market timing
- Enterprise intelligence
- SignalFirst strategic guidance

**Execution behaviour:**

| Parameter | Value |
|-----------|-------|
| Source depth | Deep |
| Habitat expansion | Adaptive |
| LLM passes | High |
| Parallelisation | Controlled |
| Signal threshold | Strict |
| Persistence | Required |

**Outputs:**
- Recurrence patterns
- Trend durability
- Narrative hardening
- Signal acceleration
- Compound confidence
- Board-grade intelligence

**Strengths:** Highest strategic value. Strongest conviction. Best board and enterprise utility.

**Limitations:** Slower feedback loop. Requires persistence systems.

---

## BUILD PRIORITY

| Priority | Mode | Reason |
|----------|------|--------|
| 1 | SPIKE_FLASH | Highest immediate business and board value. Lowest implementation cost. |
| 2 | SPIKE_DEEP | Creates meaningful signal qualification and market appetite validation. |
| 3 | SCOUT_DAY | Operational awareness layer. |
| 4 | SCOUT_COMPOUND | Longitudinal intelligence maturity layer. |

---

## BOARD POSITIONING

**Statement:** SCOUT delivers immediate directional conviction in minutes and compounds strategic intelligence over time.

**Key message:** The system reduces time-to-conviction while increasing long-term intelligence quality.

**Board relevance:**
- Faster strategic sensing
- Faster market adaptation
- Faster signal validation
- Faster target correction
- Higher intelligence leverage

---

## DESIGN CONSTRAINTS

**Build bias:** Speed. Signal visibility. Founder utility. Board utility. Runtime simplicity. Reusability.

**Avoid:**
- Over-engineering
- Premature enterprise abstractions
- Deep orchestration frameworks
- Runtime fragmentation
- Mode-specific architecture forks

---

## RELATIONSHIP TO EXISTING SPEC

This document amends `SCOUT_CC_EXECUTION_PACKET_v1.0.md`. All RC-01 through RC-07 corrections in that packet remain in force. The multi-tempo model extends Section 1 (Surface Purpose) and Section 7 (Operator Questions). No existing architectural constraints are relaxed.

Phase 5 (Signal Observatory) maps to **SCOUT_DAY** tempo. SPIKE_FLASH and SPIKE_DEEP are the next build targets.

---

**SCOUT_SPIKE_MODES_v0.2**
**Status:** APPROVED AND LOCKED
**Authority:** DRJ
