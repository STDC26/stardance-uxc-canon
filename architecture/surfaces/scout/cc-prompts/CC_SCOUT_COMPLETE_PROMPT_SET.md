# CC SCOUT PHASE 5: COMPLETE PROMPT SET
## 10 Executable Prompts in Execution Order

**Directive ID:** DTC_TO_CC_SCOUT_PHASE5_PROMPT_GENERATION_001  
**Status:** ALL 10 PROMPTS GENERATED ✓  
**Authority:** DRJ/PTC → DTC → CC  
**Governance:** FAIL_CLOSED, escalate unknowns, no reinterpretation  

---

## PROMPT EXECUTION SEQUENCE

All 10 prompts must be executed in order. Do not skip or reorder.

### ✓ Prompt 1: CC_SCOUT_01_REPO_SETUP
**File:** `/mnt/user-data/outputs/CC_SCOUT_01_REPO_SETUP.md`  
**Purpose:** Clone/update repo, create feature branch  
**Duration:** ~30 minutes  
**Output:** feature/scout-phase5 branch ready  
**Blocker:** None, proceed immediately  

**Acceptance Criteria:**
- [ ] Repository accessible
- [ ] Feature branch created
- [ ] Source documents readable
- [ ] Build tools verified

---

### ✓ Prompt 2: CC_SCOUT_02_DIRECTORY_AND_MANIFEST
**File:** `/mnt/user-data/outputs/CC_SCOUT_02_DIRECTORY_AND_MANIFEST.md`  
**Purpose:** Create directory structure, MANIFEST.json, package.json  
**Duration:** ~1 hour  
**Output:** Project scaffolding complete  
**Depends On:** CC_SCOUT_01 complete  

**Acceptance Criteria:**
- [ ] Directory structure created
- [ ] MANIFEST.json with UXC metadata
- [ ] package.json with build scripts
- [ ] Documentation shell ready

---

### ✓ Prompt 3: CC_SCOUT_03_IMS_STATE_MACHINE
**File:** `/mnt/user-data/outputs/CC_SCOUT_03_IMS_STATE_MACHINE.md`  
**Purpose:** Implement 6-state IMS fail-closed state machine  
**Duration:** ~3-4 hours  
**Output:** ims-state-machine.ts, IMS types, 8+ tests  
**Depends On:** CC_SCOUT_02 complete  
**Critical:** Foundation for all other features  

**Acceptance Criteria:**
- [ ] 6 states implemented (idle, validating, processing, complete, partial_complete, failed)
- [ ] All 8 transitions working
- [ ] Fail-closed rules enforced
- [ ] 8+ tests passing
- [ ] Type definitions complete

---

### ✓ Prompt 4: CC_SCOUT_04_COMPONENTS
**File:** `/mnt/user-data/outputs/CC_SCOUT_04_THROUGH_10_PROMPTS.md` (Section: CC_SCOUT_04)  
**Purpose:** Implement 10 mandatory SCOUT components  
**Duration:** ~4-5 hours  
**Output:** 10 React components, all rendering  
**Depends On:** CC_SCOUT_03 complete  
**Critical:** Core UI implementation  

**Components (All Required):**
- InterpretationBlock
- EvidencePanel
- ConfidenceBand
- TrustRail
- EthicsGate
- OrbitHeader
- StateIndicator
- ActionPanel
- OperatorActionBar
- SignalTimeline

**Acceptance Criteria:**
- [ ] All 10 components implemented
- [ ] Props typed with TypeScript
- [ ] Components render per IMS state
- [ ] No console errors

---

### ✓ Prompt 5: CC_SCOUT_05_CQX_RENDERING
**File:** `/mnt/user-data/outputs/CC_SCOUT_04_THROUGH_10_PROMPTS.md` (Section: CC_SCOUT_05)  
**Purpose:** Implement locked CQX 5-element sequence  
**Duration:** ~2-3 hours  
**Output:** CQXSequence component, locked rendering  
**Depends On:** CC_SCOUT_04 complete  
**Critical:** RC-02 Applied - Meaning ≠ Action (must be separate)  

**CQX Elements (Locked Order):**
1. Context (situation)
2. Outcome (what happened)
3. Meaning (interpretation) ← **SEPARATE FROM ACTION**
4. Strength & Risk (confidence)
5. Action (operator decides) ← **DISTINCT FROM MEANING**

**Acceptance Criteria:**
- [ ] 5-element sequence renders in order
- [ ] Meaning and Action are separate
- [ ] No element skipped
- [ ] Rendering order cannot change

---

### ✓ Prompt 6: CC_SCOUT_06_CONFIDENCE_TRUST
**File:** `/mnt/user-data/outputs/CC_SCOUT_04_THROUGH_10_PROMPTS.md` (Section: CC_SCOUT_06)  
**Purpose:** Implement confidence gates, bands, ethics gates  
**Duration:** ~2-3 hours  
**Output:** confidence-gates.ts, confidence calculation + bands + ethics  
**Depends On:** CC_SCOUT_05 complete  
**Critical:** 0.92 hard cap enforced  

**Requirements:**
- Confidence scale 0.0-1.0 (hard cap 0.92)
- Bands: HIGH (0.75-1.0), MEDIUM (0.45-0.74), LOW (0.0-0.44)
- Ethics gates: Safety, Delight, Harmony
- Fail-closed: Gates block by default

**Acceptance Criteria:**
- [ ] Confidence calculation implemented
- [ ] Hard cap 0.92 enforced
- [ ] Bands display correctly
- [ ] Ethics gates work
- [ ] 6+ tests passing

---

### ✓ Prompt 7: CC_SCOUT_07_ORBIT_BINDING
**File:** `/mnt/user-data/outputs/CC_SCOUT_04_THROUGH_10_PROMPTS.md` (Section: CC_SCOUT_07)  
**Purpose:** Implement SCOUT Orbit state binding  
**Duration:** ~1-2 hours  
**Output:** orbit-binding.ts, IMS→Orbit mapping  
**Depends On:** CC_SCOUT_06 complete  

**Requirements:**
- Orbit state: signal_sense (not generic)
- OrbitFrame v0.1
- IMS → Orbit state mapping
- Visual asset integration

**Acceptance Criteria:**
- [ ] Orbit binding implemented
- [ ] State mapping correct
- [ ] Visual asset integrated
- [ ] OrbitHeader renders

---

### ✓ Prompt 8: CC_SCOUT_08_PREVIEW
**File:** `/mnt/user-data/outputs/CC_SCOUT_04_THROUGH_10_PROMPTS.md` (Section: CC_SCOUT_08)  
**Purpose:** Generate standalone preview (no build required)  
**Duration:** ~1-2 hours  
**Output:** preview.html, all 6 states clickable  
**Depends On:** CC_SCOUT_07 complete  

**Requirements:**
- No build needed (pure HTML)
- All 6 IMS states rendered
- CQX elements visible
- Confidence bands shown
- <500KB file

**Acceptance Criteria:**
- [ ] preview.html generated
- [ ] All 6 states clickable
- [ ] CQX sequence visible
- [ ] Opens in browser without build

---

### ✓ Prompt 9: CC_SCOUT_09_TESTS
**File:** `/mnt/user-data/outputs/CC_SCOUT_04_THROUGH_10_PROMPTS.md` (Section: CC_SCOUT_09)  
**Purpose:** Create test harness, achieve coverage  
**Duration:** ~3-4 hours  
**Output:** 40+ tests, 80%+ coverage, target 90%+  
**Depends On:** CC_SCOUT_08 complete  

**Test Categories:**
- IMS state machine (8 tests)
- CQX rendering (8 tests)
- Confidence gates (8 tests)
- Components (8 tests)
- Integration (6 tests)
- E2E (4 tests)

**Acceptance Criteria:**
- [ ] 40+ tests written
- [ ] All tests passing
- [ ] 80%+ coverage minimum
- [ ] npm test returns green

---

### ✓ Prompt 10: CC_SCOUT_10_FINAL_VALIDATION
**File:** `/mnt/user-data/outputs/CC_SCOUT_04_THROUGH_10_PROMPTS.md` (Section: CC_SCOUT_10)  
**Purpose:** Final build, validation, handoff to Phase 6  
**Duration:** ~1-2 hours  
**Output:** Build successful, Phase 5 completion report, code pushed  
**Depends On:** CC_SCOUT_09 complete  

**Steps:**
1. npm test (all passing)
2. npm run build (succeeds)
3. Preview verification
4. Handoff package creation
5. Git commit + push

**Acceptance Criteria:**
- [ ] npm test passes
- [ ] npm run build succeeds
- [ ] Coverage 80%+ (target 90%+)
- [ ] Preview renders all states
- [ ] No console errors
- [ ] Code committed and pushed
- [ ] Ready for Phase 6 (UAT)

---

## TOTAL IMPLEMENTATION TIMELINE

| Prompt | Duration | Cumulative |
|--------|----------|-----------|
| CC_SCOUT_01 | 0.5h | 0.5h |
| CC_SCOUT_02 | 1h | 1.5h |
| CC_SCOUT_03 | 3-4h | 4.5-5.5h |
| CC_SCOUT_04 | 4-5h | 8.5-10.5h |
| CC_SCOUT_05 | 2-3h | 10.5-13.5h |
| CC_SCOUT_06 | 2-3h | 12.5-16.5h |
| CC_SCOUT_07 | 1-2h | 13.5-18.5h |
| CC_SCOUT_08 | 1-2h | 14.5-20.5h |
| CC_SCOUT_09 | 3-4h | 17.5-24.5h |
| CC_SCOUT_10 | 1-2h | 18.5-26.5h |

**Total: 18.5-26.5 hours (roughly 2-3 working days)**

---

## GOVERNANCE DURING IMPLEMENTATION

### Escalation Rule (RC-03 Applied)

**If:** Any implementation detail is ambiguous, blocked, or contradictory  
**Then:** Stop that portion and escalate to DTC immediately  
**Do Not:** Infer specifications, simplify logic, or reinterpret canon  

### Phase Boundary (RC-04 Applied)

**Important:** Completion of Phase 5 does NOT certify the surface.
- Phase 6 (UAT by DRJ+PTC) is mandatory
- Phase 7 (UXC Certification by DTC+PTC) is mandatory
- Phase 5 build ≠ production certification

### Fail-Closed Governance

All gates, state transitions, confidence calculations:
- Default to NO (blocks unless explicitly allowed)
- No silent fallbacks
- No inference behavior
- Strict type checking

---

## SUCCESS CHECKLIST (Phase 5 Complete)

- [ ] All 10 prompts executed in order
- [ ] 40+ tests passing (80%+ coverage minimum, 90%+ target)
- [ ] 10 mandatory components implemented
- [ ] 6 IMS states working
- [ ] CQX 5-element sequence locked (Meaning ≠ Action)
- [ ] Confidence gates working (0.92 cap)
- [ ] Orbit binding integrated
- [ ] Preview generates without build
- [ ] npm test passes
- [ ] npm run build succeeds
- [ ] No console errors
- [ ] Code committed to feature/scout-phase5
- [ ] Ready for Phase 6 (UAT)

---

## NEXT PHASE (Phase 6 UAT)

Once Phase 5 complete:

1. **Merge** feature/scout-phase5 to main
2. **Handoff** to DRJ + PTC for Phase 6 (UAT)
3. **DRJ+PTC** validates against 30-second insight test
4. **DTC** begins Phase 7 prep (UXC certification framework)

---

**CC SCOUT PHASE 5: COMPLETE PROMPT SET ✓**

**All 10 prompts generated. Authority chain complete. Governance locked.**

**Ready to execute immediately.**

