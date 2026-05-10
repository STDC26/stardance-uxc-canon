/**
 * XAS Surface Spec Architecture v0.1.1 Validator
 * 
 * Enforces the four approved execution gates:
 * 1. surface_extension_required
 * 2. orbit_binding_required (for Stardance products)
 * 3. codex_execution_readiness
 * 4. surface_extension_type_registry validation
 */

import { SURFACE_EXTENSION_REGISTRY } from '../registry/surface_extension_registry';

interface UniversalSpec {
  _uxc_schema?: string;
  system_name?: string;
  product?: string;
  surface_extension_required?: boolean;
  surface_extension?: {
    extension_type?: string;
    [key: string]: any;
  };
  orbit_binding?: {
    enabled?: boolean;
    orbit_binding_required?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  gate_status: {
    surface_extension_required: boolean;
    orbit_binding_required: boolean;
    codex_execution_readiness: boolean;
    extension_type_valid: boolean;
  };
  codex_execution_allowed: boolean;
}

/**
 * GATE 1: Surface Extension Required
 * Rule: If building an executable surface, surface_extension_required must be true
 * and a complete surface_extension object must be present.
 */
function validateSurfaceExtensionRequired(spec: UniversalSpec): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // If the spec has UXC schema and system_name, it's an executable surface
  if (spec._uxc_schema && spec.system_name) {
    if (spec.surface_extension_required !== true) {
      errors.push(
        'GATE-001 FAILED: surface_extension_required must be true for executable surfaces'
      );
    }

    if (!spec.surface_extension || typeof spec.surface_extension !== 'object') {
      errors.push(
        'GATE-001 FAILED: surface_extension object must be provided for executable surfaces'
      );
    }

    if (
      spec.surface_extension &&
      !spec.surface_extension.extension_type
    ) {
      errors.push(
        'GATE-001 FAILED: surface_extension.extension_type must be specified'
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * GATE 2: Orbit Binding Required (for Stardance products)
 * Rule: If product is Stardance-owned, orbit_binding must be present and enabled.
 */
function validateOrbitBindingRequired(spec: UniversalSpec): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const stardanceProducts = [
    'Stardance Platform',
    'SCOUT System',
    'Docente',
    'Docente Hero',
    'Stardance Hero',
  ];

  const isStardanceProduct = stardanceProducts.some((p) =>
    spec.product?.includes(p)
  );

  if (isStardanceProduct) {
    if (!spec.orbit_binding) {
      errors.push(
        'GATE-002 FAILED: orbit_binding is required for Stardance products'
      );
    } else if (spec.orbit_binding.enabled !== true) {
      errors.push(
        'GATE-002 FAILED: orbit_binding.enabled must be true for Stardance products'
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * GATE 3: Codex Execution Readiness
 * Rule: Codex full execution is blocked until 6 conditions are met.
 * Codex pre-execution (scaffolding) is allowed.
 */
function validateCodexExecutionReadiness(spec: UniversalSpec): {
  valid: boolean;
  errors: string[];
  codex_pre_execution_allowed: boolean;
  codex_full_execution_allowed: boolean;
} {
  const errors: string[] = [];
  const checklist = {
    universal_spec_complete: !!spec.system_name && !!spec._uxc_schema,
    surface_extension_complete: !!(
      spec.surface_extension && spec.surface_extension.extension_type
    ),
    orbit_binding_present: !!(
      spec.orbit_binding &&
      Object.keys(spec.orbit_binding).length > 0
    ),
    data_objects_defined: !!(
      spec.surface_extension?.data_objects &&
      Array.isArray(spec.surface_extension.data_objects) &&
      spec.surface_extension.data_objects.length > 0
    ),
    governed_actions_defined: !!(
      spec.surface_extension?.governed_actions &&
      Array.isArray(spec.surface_extension.governed_actions) &&
      spec.surface_extension.governed_actions.length > 0
    ),
    validation_rules_present: !!(
      spec.surface_extension?.validation_rules &&
      Array.isArray(spec.surface_extension.validation_rules) &&
      spec.surface_extension.validation_rules.length > 0
    ),
  };

  const allChecklistItemsMet = Object.values(checklist).every((v) => v);

  if (!checklist.universal_spec_complete) {
    errors.push(
      'GATE-003 FAILED: Universal spec must be complete (system_name, _uxc_schema)'
    );
  }
  if (!checklist.surface_extension_complete) {
    errors.push(
      'GATE-003 FAILED: Surface extension must be complete with extension_type'
    );
  }
  if (!checklist.orbit_binding_present) {
    errors.push('GATE-003 FAILED: Orbit binding must be present');
  }
  if (!checklist.data_objects_defined) {
    errors.push(
      'GATE-003 FAILED: Data objects must be defined in surface extension'
    );
  }
  if (!checklist.governed_actions_defined) {
    errors.push(
      'GATE-003 FAILED: Governed actions must be defined in surface extension'
    );
  }
  if (!checklist.validation_rules_present) {
    errors.push(
      'GATE-003 FAILED: Validation rules must be present in surface extension'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    // Codex can always scaffold infrastructure, validators, etc.
    codex_pre_execution_allowed: true,
    // Codex can only execute full implementation if all checklist items pass
    codex_full_execution_allowed: allChecklistItemsMet,
  };
}

/**
 * GATE 4: Surface Extension Type Validation
 * Rule: extension_type must be in the official registry.
 */
function validateExtensionType(spec: UniversalSpec): {
  valid: boolean;
  errors: string[];
  extension_type: string | null;
} {
  const errors: string[] = [];
  const extensionType = spec.surface_extension?.extension_type;

  if (!extensionType) {
    return {
      valid: false,
      errors: ['GATE-004 FAILED: extension_type not found'],
      extension_type: null,
    };
  }

  const registeredTypes = SURFACE_EXTENSION_REGISTRY.map((r) => r.extension_type);

  if (!registeredTypes.includes(extensionType)) {
    errors.push(
      `GATE-004 FAILED: extension_type "${extensionType}" is not in the registry. ` +
      `Supported types: ${registeredTypes.join(', ')}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    extension_type: extensionType,
  };
}

/**
 * Main XAS Validator
 * Runs all four gates and returns comprehensive validation result.
 */
export function validateXASSpec(spec: UniversalSpec): ValidationResult {
  const gate1 = validateSurfaceExtensionRequired(spec);
  const gate2 = validateOrbitBindingRequired(spec);
  const gate3 = validateCodexExecutionReadiness(spec);
  const gate4 = validateExtensionType(spec);

  const allErrorsFatal = [gate1, gate2, gate4].every((g) => g.valid);
  const codexExecutionAllowed =
    allErrorsFatal && gate3.codex_full_execution_allowed;

  return {
    valid: allErrorsFatal && gate3.valid,
    errors: [
      ...gate1.errors,
      ...gate2.errors,
      ...gate3.errors,
      ...gate4.errors,
    ],
    warnings: !codexExecutionAllowed && allErrorsFatal
      ? [
          'Codex pre-execution (scaffolding) is allowed. Full execution is blocked until GATE-003 passes.',
        ]
      : [],
    gate_status: {
      surface_extension_required: gate1.valid,
      orbit_binding_required: gate2.valid,
      codex_execution_readiness: gate3.valid,
      extension_type_valid: gate4.valid,
    },
    codex_execution_allowed: codexExecutionAllowed,
  };
}

/**
 * Utility: Get gate status summary for logging
 */
export function getGateStatusSummary(result: ValidationResult): string {
  const statuses = result.gate_status;
  return (
    `[GATE-001] Surface Extension Required: ${statuses.surface_extension_required ? '✓ PASS' : '✗ FAIL'}\n` +
    `[GATE-002] Orbit Binding Required: ${statuses.orbit_binding_required ? '✓ PASS' : '✗ FAIL'}\n` +
    `[GATE-003] Codex Execution Readiness: ${statuses.codex_execution_readiness ? '✓ PASS' : '✗ FAIL'}\n` +
    `[GATE-004] Extension Type Valid: ${statuses.extension_type_valid ? '✓ PASS' : '✗ FAIL'}\n` +
    `\nCodex Full Execution Allowed: ${result.codex_execution_allowed ? '✓ YES' : '✗ NO (pre-execution scaffolding only)'}`
  );
}

export default validateXASSpec;
