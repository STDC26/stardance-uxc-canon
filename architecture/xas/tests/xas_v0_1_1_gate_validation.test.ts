/**
 * XAS v0.1.1 Gate Validation Tests
 * 
 * Tests all four execution gates with positive and negative fixtures.
 * Ensures gates enforce requirements as designed.
 */

import validateXASSpec, { getGateStatusSummary } from '../validators/validate_xas_surface_spec';
import { isValidExtensionType } from '../registry/surface_extension_registry';

// ============================================================================
// POSITIVE TEST FIXTURES
// ============================================================================

const VALID_SCOUT_SPEC = {
  _uxc_schema: 'stardance-uxc-canon - system_spec - v1.0.1',
  system_name: 'SCOUT v2 Signal Observatory',
  product: 'SCOUT System',
  build_target: 'react_tailwind',
  uis_theme: 'vega',
  uis_mode_default: 'dark',
  design_doctrine:
    'The operator senses emerging signal intelligence through calm recursive orchestration, not dashboard noise.',
  surface_extension_required: true,
  surface_extension: {
    extension_type: 'SCOUT_SIGNAL_INTELLIGENCE',
    runtime_role: 'signal_observatory',
    orbit_state: 'signal_sense',
    data_objects: [
      'Signal',
      'SignalCluster',
      'InterpretationBlock',
      'EvidenceTrace',
      'ConfidenceBlock',
      'DecisionRecommendation',
      'ActionRoute',
    ],
    governed_actions: [
      'watch',
      'investigate',
      'escalate',
      'suppress',
      'export',
      'trigger_research',
      'route_to_interpretation',
      'mark_learning_signal',
    ],
    decision_model: {
      primary_hierarchy: ['decision', 'context', 'evidence'],
      operator_questions: [
        'What am I looking at?',
        'What does it mean?',
        'What should I do?',
      ],
    },
    confidence_model: {
      required: true,
      display: 'ConfidenceBlock',
      fields: ['confidence', 'risk', 'signal_strength', 'urgency', 'recommended_posture'],
    },
    evidence_model: {
      required: true,
      display: 'EvidenceTrace',
      fields: ['signals_used', 'source_count', 'canon_applied', 'decision_made', 'learning_signal'],
    },
    validation_rules: [
      'No dashboard-first layout',
      'No progress bars',
      'No workflow steps',
    ],
  },
  orbit_binding: {
    enabled: true,
    orbit_binding_required: true,
    orbit_state: 'signal_sense',
    orbitframe: 'OrbitFrame v0.1',
    visual_asset: 'stardance_orbit_evolving_spiral_v1',
  },
};

const VALID_DOCENTE_SPEC = {
  _uxc_schema: 'stardance-uxc-canon - system_spec - v1.0.1',
  system_name: 'Docente Hero',
  product: 'Docente',
  build_target: 'html_css_js',
  uis_theme: 'vega',
  uis_mode_default: 'vibe',
  surface_extension_required: true,
  surface_extension: {
    extension_type: 'DOCENTE_LEARNING_FORMATION',
    runtime_role: 'learning_formation',
    data_objects: ['LearningState', 'CapabilityFormation'],
    governed_actions: ['assess', 'recommend', 'overlay'],
    validation_rules: [
      'All content student-centered',
      'Adaptive to learning state',
    ],
  },
  orbit_binding: {
    enabled: true,
    orbit_binding_required: true,
  },
};

// ============================================================================
// NEGATIVE TEST FIXTURES (Should Fail)
// ============================================================================

const MISSING_SURFACE_EXTENSION = {
  _uxc_schema: 'stardance-uxc-canon - system_spec - v1.0.1',
  system_name: 'Test Surface',
  product: 'Test Product',
  // surface_extension_required: MISSING
  // surface_extension: MISSING
};

const MISSING_ORBIT_BINDING_STARDANCE = {
  _uxc_schema: 'stardance-uxc-canon - system_spec - v1.0.1',
  system_name: 'Docente Test',
  product: 'Docente',
  surface_extension_required: true,
  surface_extension: {
    extension_type: 'DOCENTE_LEARNING_FORMATION',
    data_objects: ['Test'],
    governed_actions: ['test'],
    validation_rules: ['test'],
  },
  // orbit_binding: MISSING
};

const INVALID_EXTENSION_TYPE = {
  _uxc_schema: 'stardance-uxc-canon - system_spec - v1.0.1',
  system_name: 'Test Surface',
  product: 'Test Product',
  surface_extension_required: true,
  surface_extension: {
    extension_type: 'INVALID_EXTENSION_TYPE_NOT_IN_REGISTRY',
    data_objects: ['Test'],
    governed_actions: ['test'],
    validation_rules: ['test'],
  },
  orbit_binding: {
    enabled: true,
  },
};

const INCOMPLETE_CODEX_CHECKLIST = {
  _uxc_schema: 'stardance-uxc-canon - system_spec - v1.0.1',
  system_name: 'Incomplete Surface',
  product: 'Test',
  surface_extension_required: true,
  surface_extension: {
    extension_type: 'SCOUT_SIGNAL_INTELLIGENCE',
    // data_objects: MISSING
    // governed_actions: MISSING
    // validation_rules: MISSING
  },
  orbit_binding: {
    enabled: true,
  },
};

// ============================================================================
// TEST SUITE
// ============================================================================

export function runAllTests() {
  console.log('='.repeat(80));
  console.log('XAS v0.1.1 GATE VALIDATION TEST SUITE');
  console.log('='.repeat(80));
  console.log('');

  const results = {
    passed: 0,
    failed: 0,
    tests: [] as {
      name: string;
      passed: boolean;
      details: string;
    }[],
  };

  // TEST 1: SCOUT Valid Spec Should Pass All Gates
  {
    const result = validateXASSpec(VALID_SCOUT_SPEC);
    const passed = result.valid && result.codex_execution_allowed;
    results.tests.push({
      name: 'TEST 1: SCOUT Valid Spec - All Gates Pass',
      passed,
      details: passed
        ? '✓ SCOUT spec passes all 4 gates. Codex execution allowed.'
        : `✗ SCOUT spec failed gates. Errors: ${result.errors.join('; ')}`,
    });
    if (passed) results.passed++;
    else results.failed++;
  }

  // TEST 2: Docente Valid Spec Should Pass All Gates
  {
    const result = validateXASSpec(VALID_DOCENTE_SPEC);
    const passed = result.valid && result.codex_execution_allowed;
    results.tests.push({
      name: 'TEST 2: Docente Valid Spec - All Gates Pass',
      passed,
      details: passed
        ? '✓ Docente spec passes all 4 gates. Codex execution allowed.'
        : `✗ Docente spec failed gates. Errors: ${result.errors.join('; ')}`,
    });
    if (passed) results.passed++;
    else results.failed++;
  }

  // TEST 3: Missing Surface Extension Should Fail GATE-001
  {
    const result = validateXASSpec(MISSING_SURFACE_EXTENSION);
    const passed = !result.valid && !result.codex_execution_allowed;
    const hasGate1Error = result.errors.some((e) => e.includes('GATE-001'));
    results.tests.push({
      name: 'TEST 3: Missing Surface Extension - GATE-001 Fails',
      passed: passed && hasGate1Error,
      details: passed && hasGate1Error
        ? '✓ Correctly rejected for missing surface_extension'
        : `✗ Did not fail as expected. Errors: ${result.errors.join('; ')}`,
    });
    if (passed && hasGate1Error) results.passed++;
    else results.failed++;
  }

  // TEST 4: Missing Orbit Binding for Stardance Should Fail GATE-002
  {
    const result = validateXASSpec(MISSING_ORBIT_BINDING_STARDANCE);
    const passed = !result.valid && !result.codex_execution_allowed;
    const hasGate2Error = result.errors.some((e) => e.includes('GATE-002'));
    results.tests.push({
      name: 'TEST 4: Missing Orbit Binding (Stardance) - GATE-002 Fails',
      passed: passed && hasGate2Error,
      details: passed && hasGate2Error
        ? '✓ Correctly rejected for missing orbit_binding on Stardance product'
        : `✗ Did not fail as expected. Errors: ${result.errors.join('; ')}`,
    });
    if (passed && hasGate2Error) results.passed++;
    else results.failed++;
  }

  // TEST 5: Invalid Extension Type Should Fail GATE-004
  {
    const result = validateXASSpec(INVALID_EXTENSION_TYPE);
    const passed = !result.valid && !result.codex_execution_allowed;
    const hasGate4Error = result.errors.some((e) => e.includes('GATE-004'));
    results.tests.push({
      name: 'TEST 5: Invalid Extension Type - GATE-004 Fails',
      passed: passed && hasGate4Error,
      details: passed && hasGate4Error
        ? '✓ Correctly rejected for invalid extension_type'
        : `✗ Did not fail as expected. Errors: ${result.errors.join('; ')}`,
    });
    if (passed && hasGate4Error) results.passed++;
    else results.failed++;
  }

  // TEST 6: Incomplete Codex Checklist Should Fail GATE-003
  {
    const result = validateXASSpec(INCOMPLETE_CODEX_CHECKLIST);
    const passed = !result.codex_execution_allowed;
    const hasGate3Warning = result.warnings.some((w) => w.includes('GATE-003'));
    results.tests.push({
      name: 'TEST 6: Incomplete Codex Checklist - GATE-003 Blocks Full Execution',
      passed: passed && !result.codex_execution_allowed,
      details: passed && !result.codex_execution_allowed
        ? '✓ Codex full execution blocked. Pre-execution scaffolding allowed.'
        : `✗ Gate did not block as expected.`,
    });
    if (passed && !result.codex_execution_allowed) results.passed++;
    else results.failed++;
  }

  // TEST 7: Registry Validation Functions
  {
    const validType = isValidExtensionType('SCOUT_SIGNAL_INTELLIGENCE');
    const invalidType = isValidExtensionType('INVALID_TYPE');
    const passed = validType && !invalidType;
    results.tests.push({
      name: 'TEST 7: Extension Type Registry Functions',
      passed,
      details: passed
        ? '✓ Registry correctly identifies valid and invalid types'
        : `✗ Registry validation failed`,
    });
    if (passed) results.passed++;
    else results.failed++;
  }

  // Print Results
  console.log('TEST RESULTS:');
  console.log('-'.repeat(80));
  results.tests.forEach((test) => {
    const status = test.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} - ${test.name}`);
    console.log(`        ${test.details}`);
    console.log('');
  });

  console.log('-'.repeat(80));
  console.log(`Summary: ${results.passed} passed, ${results.failed} failed`);
  console.log('='.repeat(80));

  return {
    all_passed: results.failed === 0,
    summary: `${results.passed}/${results.passed + results.failed} tests passed`,
    results: results.tests,
  };
}

// Export test fixtures for use in other test suites
export {
  VALID_SCOUT_SPEC,
  VALID_DOCENTE_SPEC,
  MISSING_SURFACE_EXTENSION,
  MISSING_ORBIT_BINDING_STARDANCE,
  INVALID_EXTENSION_TYPE,
  INCOMPLETE_CODEX_CHECKLIST,
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}
