# CC_SCOUT_01: REPOSITORY SETUP & FEATURE BRANCH
## Phase 5 Build Initialization

**Prompt ID:** CC_SCOUT_01_REPO_SETUP  
**Purpose:** Clone/update repo, create feature branch, verify structure  
**Authority:** SCOUT_CC_EXECUTION_PACKET_v1.0_CORRECTED.md (Sections 1-2)  
**Execution Order:** FIRST (before any code implementation)  

---

## SOURCE OF TRUTH

Primary: `SCOUT_CC_EXECUTION_PACKET_v1.0_CORRECTED.md`  
Standard: `CC_BUILD_PACKET_STANDARD_v1.0.md`  
Reference: `IMS_STATE_MACHINE_REFERENCE.md`  

---

## YOUR TASK

### Step 1: Verify Repository Access
```bash
# Verify you can access stardance-uxc-canon
cd ~/Downloads/stardance-uxc-canon
git status

# Confirm you see existing:
#   architecture/xas/
#   architecture/standards/
#   architecture/surfaces/scout/
```

**Acceptance Criterion:** Repository is accessible, `git status` shows clean working tree

### Step 2: Create Feature Branch
```bash
# Create feature branch for SCOUT Phase 5
git checkout -b feature/scout-phase5

# Verify branch created
git branch -v
```

**Acceptance Criterion:** Branch `feature/scout-phase5` created and checked out

### Step 3: Verify Source Documents Present
Before writing any code, confirm all three source documents exist:

```bash
# Check for SCOUT packet
ls -la architecture/surfaces/scout/SCOUT_CC_EXECUTION_PACKET_v1.0_CORRECTED.md

# Check for CC build standard
ls -la architecture/standards/CC_BUILD_PACKET_STANDARD_v1.0.md

# Check for IMS reference
ls -la architecture/standards/IMS_STATE_MACHINE_REFERENCE.md
```

**Acceptance Criterion:** All three documents present and readable

### Step 4: Read the Corrected SCOUT Packet
Open and read the entire corrected SCOUT packet:

```
SCOUT_CC_EXECUTION_PACKET_v1.0_CORRECTED.md
  Sections 1-4: Architecture (already read)
  Sections 5-8: Domain specifications (confidence, CQX, orbit, preview)
  Sections 9-15: Implementation requirements
```

**Acceptance Criterion:** You have read and understand:
- [ ] Section 2: Directory structure (4 SCOUT + 30-40 standard files)
- [ ] Section 3: 10 mandatory components (5 categories)
- [ ] Section 4: 6 IMS states (idle, validating, processing, complete, partial_complete, failed)
- [ ] Section 5: CQX sequence (5 elements: context → outcome → meaning → strength → action)
- [ ] Section 12: Escalation rule (unknowns escalate to DTC, no inference)

### Step 5: Confirm Build Environment
Verify build tools are ready:

```bash
# Check Node.js version (need 16+)
node --version

# Check npm version
npm --version

# Check TypeScript (will install in next phase)
# tsc --version

# Check your editor/IDE ready for React/TypeScript
# (no action needed, just confirm)
```

**Acceptance Criterion:** Node.js 16+ and npm 8+ available

---

## FAIL-CLOSED RULES (Mandatory)

✓ **Do not create any production code yet**  
✓ **Do not modify existing files**  
✓ **Do not change any architecture decisions**  
✓ **Do not skip reading source documents**  
✓ **Do not assume directory structure**  

---

## ESCALATION RULE

**If:** You cannot access repo, create branch, or read documents  
**Then:** Stop and escalate to DTC immediately  
**Do not:** Attempt workarounds, assume structures, or proceed without clarity  

---

## ACCEPTANCE CRITERIA (All Must Pass)

- [ ] Repository accessible
- [ ] Feature branch `feature/scout-phase5` created
- [ ] All three source documents present
- [ ] SCOUT packet read and understood
- [ ] Build tools verified (Node.js, npm)
- [ ] Ready to proceed to CC_SCOUT_02

---

## NEXT PROMPT

Once you confirm all acceptance criteria met, you are ready for:

**CC_SCOUT_02_DIRECTORY_AND_MANIFEST**
- Create directory structure
- Create MANIFEST.json
- Create package.json
- Create initial documentation shell

---

## GOVERNANCE CHECKPOINT

**Phase:** 5 (CC Build)  
**Status:** Initialization (no production code yet)  
**Blocker Escalation:** To DTC immediately  
**Proceed Criterion:** All acceptance criteria ✓

