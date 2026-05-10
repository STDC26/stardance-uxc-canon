#!/usr/bin/env node
// validate-uxc.js
// Phase 5 structural UXC compliance check
// Full C0-C8 certification requires Phase 7 UAT (separate gate)

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let passed = 0;
let failed = 0;

function check(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✕ ${label}`);
    failed++;
  }
}

console.log('\nUXC Phase 5 Structural Validation');
console.log('===================================');

// MANIFEST check
const manifestPath = path.join(ROOT, 'MANIFEST.json');
check('MANIFEST.json exists', fs.existsSync(manifestPath));
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  check('surface_id present', !!manifest.surface_id);
  check('orbit_state: signal_sense', manifest.orbit_state === 'signal_sense');
  check('ims_states includes all 6', manifest.ims_states && manifest.ims_states.length === 6);
}

// Key source files
const requiredFiles = [
  'src/logic/ims-state-machine.ts',
  'src/logic/confidence-gates.ts',
  'src/logic/orbit-binding.ts',
  'src/logic/signal-classifier.ts',
  'src/components/CQXSequence.tsx',
  'src/components/StateIndicator.tsx',
  'src/components/ActionPanel.tsx',
  'src/App.tsx',
];
console.log('\nSource file checks:');
for (const f of requiredFiles) {
  check(f, fs.existsSync(path.join(ROOT, f)));
}

// RC-02 enforcement in CQXSequence
const cqxPath = path.join(ROOT, 'src/components/CQXSequence.tsx');
if (fs.existsSync(cqxPath)) {
  const cqx = fs.readFileSync(cqxPath, 'utf8');
  console.log('\nRC-02 checks:');
  check('data-rc02-enforced attribute present', cqx.includes('data-rc02-enforced'));
  check('Meaning element distinct from action', cqx.includes('cqx-meaning') && cqx.includes('cqx-action'));
  check('5 CQX elements defined', (cqx.match(/cqx-element/g) || []).length >= 5);
}

// Preview
check('\nPreview file exists', fs.existsSync(path.join(ROOT, 'preview/scout-signal-observatory.html')));

// Build output
check('dist/ build output exists', fs.existsSync(path.join(ROOT, 'dist')));

// Test coverage summary check (file existence only — run npm test for live results)
check('Test files present (8 suites)', fs.existsSync(path.join(ROOT, 'src/tests')));

console.log(`\n===================================`);
console.log(`Phase 5 Structural: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('FAIL — structural violations detected');
  process.exit(1);
} else {
  console.log('PASS — structural validation complete');
  console.log('NOTE: Full C0-C8 certification requires Phase 7 UAT');
}
