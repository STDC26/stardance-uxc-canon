/**
 * Surface Extension Type Registry v0.1.1
 * 
 * Official registry of supported Surface Extension types for XAS.
 * All surface_extension_type values must be in this registry.
 * 
 * New types require PTC approval before being added.
 */

export interface SurfaceExtensionType {
  extension_type: string;
  purpose: string;
  owner: string;
  example_provided: boolean;
  status: 'approved' | 'proposed' | 'deprecated';
}

export const SURFACE_EXTENSION_REGISTRY: SurfaceExtensionType[] = [
  {
    extension_type: 'SCOUT_SIGNAL_INTELLIGENCE',
    purpose:
      'Signal observatory, interpretation, evidence, confidence, and governed action routing. ' +
      'Enables operators to sense emerging signal intelligence through calm recursive orchestration.',
    owner: 'SCOUT Product Team (DTC)',
    example_provided: true,
    status: 'approved',
  },
  {
    extension_type: 'MO_BASE_ONTOLOGY_ASSESSMENT',
    purpose:
      'Ontology-specific assessment, scoring, gap detection, and recommendation rendering. ' +
      'Enables evaluation and navigation of knowledge domains and capability models.',
    owner: 'MO Product Team (DTC)',
    example_provided: false,
    status: 'approved',
  },
  {
    extension_type: 'DOCENTE_LEARNING_FORMATION',
    purpose:
      'Learning-state, capability-formation, overlay, and instructional surface behavior. ' +
      'Enables learner-centered surfaces that adapt to learning progress and capability development.',
    owner: 'Docente Product Team (DTC)',
    example_provided: false,
    status: 'approved',
  },
  {
    extension_type: 'UXC_ACTIVATION_SURFACE',
    purpose:
      'Generic UXC activation, specification-generation, and surface-initiation flow. ' +
      'Enables core UXC surfaces and specification generation workflows.',
    owner: 'Core UXC Team (DTC)',
    example_provided: false,
    status: 'approved',
  },
];

/**
 * Get registry entry by extension_type
 */
export function getExtensionTypeDefinition(
  extension_type: string
): SurfaceExtensionType | undefined {
  return SURFACE_EXTENSION_REGISTRY.find(
    (r) => r.extension_type === extension_type
  );
}

/**
 * Validate if extension_type is in registry
 */
export function isValidExtensionType(extension_type: string): boolean {
  return SURFACE_EXTENSION_REGISTRY.some(
    (r) => r.extension_type === extension_type
  );
}

/**
 * Get all approved extension types
 */
export function getApprovedExtensionTypes(): string[] {
  return SURFACE_EXTENSION_REGISTRY.filter(
    (r) => r.status === 'approved'
  ).map((r) => r.extension_type);
}

/**
 * List all extension types with their purposes
 */
export function listExtensionTypes(): { type: string; purpose: string }[] {
  return SURFACE_EXTENSION_REGISTRY.map((r) => ({
    type: r.extension_type,
    purpose: r.purpose,
  }));
}

export default SURFACE_EXTENSION_REGISTRY;
