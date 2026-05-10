// src/logic/orbit-binding.ts
// SCOUT Orbit binding — signal_sense state
// Authority: SCOUT_CC_EXECUTION_PACKET_v1.0_CORRECTED.md Section 8

import { IMSState } from '../types/IMS';

export type OrbitState =
  | 'idle'
  | 'validating'
  | 'processing'
  | 'signal_sense'
  | 'failed';

export const ORBIT_VISUAL_ASSET = 'stardance_orbit_signal_sense_v1';
export const ORBITFRAME_VERSION = 'OrbitFrame v0.1';
export const SCOUT_ORBIT_STATE = 'signal_sense';

// Locked IMS → Orbit state mapping
export function mapIMSToOrbit(imsState: IMSState): OrbitState {
  switch (imsState) {
    case 'idle':             return 'idle';
    case 'validating':       return 'validating';
    case 'processing':       return 'processing';
    case 'complete':         return 'signal_sense'; // Active signal sensing
    case 'partial_complete': return 'signal_sense'; // Uncertain sensing
    case 'failed':           return 'failed';
  }
}

export function getOrbitLabel(orbitState: OrbitState): string {
  const labels: Record<OrbitState, string> = {
    idle:         'Signal Observatory',
    validating:   'Validating Signal',
    processing:   'Processing Signal',
    signal_sense: 'Signal Sense Active',
    failed:       'Signal Failed',
  };
  return labels[orbitState];
}

export function isOrbitActive(imsState: IMSState): boolean {
  return imsState === 'complete' || imsState === 'partial_complete';
}
