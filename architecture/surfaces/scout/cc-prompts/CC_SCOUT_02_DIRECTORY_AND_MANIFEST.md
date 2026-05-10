# CC_SCOUT_02: DIRECTORY STRUCTURE & MANIFEST
## Project Scaffolding and Metadata

**Prompt ID:** CC_SCOUT_02_DIRECTORY_AND_MANIFEST  
**Purpose:** Create SCOUT surface directory, MANIFEST.json, package.json, docs shell  
**Authority:** SCOUT_CC_EXECUTION_PACKET_v1.0_CORRECTED.md (Section 2)  
**Standard:** CC_BUILD_PACKET_STANDARD_v1.0.md (Section 1)  
**Execution Order:** SECOND (after repo setup)  

---

## YOUR TASK

### Step 1: Create Directory Structure

Create the exact directory tree from CC_BUILD_PACKET_STANDARD (Section 1).

```bash
# From repo root
mkdir -p src/components
mkdir -p src/logic
mkdir -p src/types
mkdir -p src/hooks
mkdir -p src/utils
mkdir -p src/data
mkdir -p src/tests
mkdir -p src/styles
mkdir -p public
mkdir -p preview
mkdir -p docs
mkdir -p scripts
mkdir -p .github/workflows
```

**Acceptance Criterion:** All directories created, `tree -L 2` shows structure matches CC_BUILD_PACKET_STANDARD

### Step 2: Create MANIFEST.json

Create `/MANIFEST.json` at project root with UXC metadata:

```json
{
  "surface_id": "scout-signal-observatory-v1.0.0",
  "name": "SCOUT Signal Observatory",
  "version": "1.0.0",
  "product": "SCOUT",
  "owner": "SCOUT Product Team",
  "description": "Signal analysis and operator decision support surface.",

  "uxc_certification": {
    "c0": false,
    "c1": false,
    "c2": false,
    "c3": false,
    "c4": false,
    "c5": false,
    "c6": false,
    "c7": false,
    "c8": false,
    "certified_by": "pending_phase_7",
    "certified_date": null
  },

  "status": "phase_5_build_in_progress",
  "ims_states": ["idle", "validating", "processing", "complete", "partial_complete", "failed"],
  "dominant_object": "Signal",
  "canonical_bindings": ["stardance-canon-v3.0"],
  "uri": "/surfaces/scout-signal-observatory/v1.0.0",

  "known_gaps": [
    "Advanced analytics dashboard (v1.1)",
    "LLM interpretation layer (v1.1)",
    "Real-time feed integration (v1.1)"
  ],

  "created_date": "2026-05-09",
  "modified_date": "2026-05-09"
}
```

**Acceptance Criterion:** MANIFEST.json present, readable, contains all fields above, C0-C8 set to `false`

### Step 3: Create package.json

Create `/package.json` with build scripts:

```json
{
  "name": "scout-signal-observatory",
  "version": "1.0.0",
  "description": "SCOUT Signal Observatory v1.0.0",
  "main": "src/index.tsx",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "validate:uxc": "echo 'UXC validation pending Phase 7'",
    "generate:preview": "node scripts/generate-preview.js",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^4.3.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

**Acceptance Criterion:** package.json present, scripts section includes all required scripts

### Step 4: Create Documentation Shell

Create empty documentation files (content filled later):

```bash
# Create documentation files
touch docs/ARCHITECTURE.md
touch docs/IMS_STATE_MACHINE.md
touch docs/CONFIDENCE_GATES.md
touch docs/DECISION_HIERARCHY.md
touch docs/UXC_COMPLIANCE.md
touch README.md
```

Add minimal README content:

```markdown
# SCOUT Signal Observatory v1.0.0

Signal analysis and operator decision support surface.

## Status
Phase 5 Build in Progress

## Quick Start
\`\`\`bash
npm install
npm run dev
\`\`\`

## Documentation
- ARCHITECTURE.md - System design
- IMS_STATE_MACHINE.md - State definitions
- CONFIDENCE_GATES.md - Confidence logic
- DECISION_HIERARCHY.md - 3-question format
- UXC_COMPLIANCE.md - C0-C8 mapping

## Known Gaps
- Advanced analytics (v1.1)
- LLM layer (v1.1)
- Real-time feed (v1.1)
```

**Acceptance Criterion:** README.md and docs shell present

### Step 5: Create Configuration Files

Create TypeScript and Jest configuration:

```bash
# tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

# jest.config.js
cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
EOF
```

**Acceptance Criterion:** tsconfig.json and jest.config.js present and valid

### Step 6: Create Initial Type Files (Empty Shells)

```bash
touch src/types/Surface.ts
touch src/types/IMS.ts
touch src/types/Evidence.ts
touch src/types/Decision.ts
touch src/types/UXC.ts

# Add minimal IMS types to get started
cat > src/types/IMS.ts << 'EOF'
// IMS State Type Definitions
// Source: IMS_STATE_MACHINE_REFERENCE.md

export type IMSState = 
  | 'idle'
  | 'validating'
  | 'processing'
  | 'complete'
  | 'partial_complete'
  | 'failed';

export interface IMSContext {
  input?: any;
  result?: any;
  confidence?: number;
  error?: string;
  warnings?: string[];
  timestamp: number;
}
EOF
```

**Acceptance Criterion:** Type definition files present, IMS.ts has state type definitions

---

## FAIL-CLOSED RULES

✓ All directory creation must use exact structure from CC_BUILD_PACKET_STANDARD  
✓ MANIFEST.json must have all UXC fields (even if false/null)  
✓ package.json must include all build scripts  
✓ Known gaps must match SCOUT packet (Section 11)  
✓ No production code in this step, only scaffolding  

---

## ESCALATION RULE

**If:** Directory creation fails, MANIFEST fields conflict, or configuration syntax errors  
**Then:** Stop and escalate to DTC with error details  
**Do not:** Attempt workarounds or skip configuration  

---

## ACCEPTANCE CRITERIA (All Must Pass)

- [ ] Directory structure matches CC_BUILD_PACKET_STANDARD
- [ ] MANIFEST.json present with UXC metadata
- [ ] package.json present with all build scripts
- [ ] README.md and docs shell present
- [ ] tsconfig.json and jest.config.js present
- [ ] Type definition files created
- [ ] Ready to proceed to CC_SCOUT_03

---

## NEXT PROMPT

Once you confirm all acceptance criteria met, you are ready for:

**CC_SCOUT_03_IMS_STATE_MACHINE**
- Implement 6-state IMS fail-closed state machine
- Implement state transitions and guard conditions
- Implement state change events

---

## GOVERNANCE CHECKPOINT

**Phase:** 5 (CC Build)  
**Status:** Scaffolding complete  
**Files Created:** 0 production code (structure only)  
**Proceed Criterion:** All acceptance criteria ✓

