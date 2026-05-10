#!/usr/bin/env node
// generate-preview.js
// Verifies the standalone preview HTML exists and is valid
// CC_SCOUT_08 — preview/scout-signal-observatory.html must be present

const fs = require('fs');
const path = require('path');

const PREVIEW_PATH = path.join(__dirname, '..', 'preview', 'scout-signal-observatory.html');
const REQUIRED_STATES = ['idle', 'validating', 'processing', 'complete', 'partial_complete', 'failed'];

if (!fs.existsSync(PREVIEW_PATH)) {
  console.error('ERROR: Preview file not found:', PREVIEW_PATH);
  process.exit(1);
}

const html = fs.readFileSync(PREVIEW_PATH, 'utf8');
const sizeKB = (fs.statSync(PREVIEW_PATH).size / 1024).toFixed(1);

let allStatesPresent = true;
for (const state of REQUIRED_STATES) {
  if (!html.includes(`showState('${state}')`)) {
    console.error(`ERROR: State '${state}' not found in preview`);
    allStatesPresent = false;
  }
}

if (!allStatesPresent) {
  process.exit(1);
}

// Verify CQX elements present
const CQX_CHECKS = ['cqx-el', '1 · Context', '3 · What It Means', '5 · What You Should Do'];
for (const check of CQX_CHECKS) {
  if (!html.includes(check)) {
    console.error(`ERROR: CQX element not found: ${check}`);
    process.exit(1);
  }
}

console.log(`✓ Preview valid — ${sizeKB} KB`);
console.log(`✓ All ${REQUIRED_STATES.length} IMS states present`);
console.log(`✓ CQX sequence elements verified`);
console.log(`  Path: ${PREVIEW_PATH}`);
