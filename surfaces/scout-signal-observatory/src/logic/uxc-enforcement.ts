// src/logic/uxc-enforcement.ts
// C0-C8 compliance checks

import { IMSState } from '../types/IMS';
import { UXCMetadata } from '../types/UXC';

export interface UXCCheckResult {
  passed: boolean;
  violations: string[];
}

export function checkUXCCompliance(
  imsState: IMSState,
  metadata: Partial<UXCMetadata>
): UXCCheckResult {
  const violations: string[] = [];

  // C0: Operator control preserved
  if (!metadata.operatorControlPreserved) {
    violations.push('C0: operatorControlPreserved must be true');
  }

  // C1: IMS state must be valid
  const validStates: IMSState[] = ['idle', 'validating', 'processing', 'complete', 'partial_complete', 'failed'];
  if (!validStates.includes(imsState)) {
    violations.push(`C1: Invalid IMS state: ${imsState}`);
  }

  // C7: Confidence visible in complete states
  if ((imsState === 'complete' || imsState === 'partial_complete') && !metadata.confidenceVisible) {
    violations.push('C7: confidenceVisible must be true in complete/partial_complete states');
  }

  // C8: CQX present in complete states
  if ((imsState === 'complete' || imsState === 'partial_complete') && !metadata.cqxPresent) {
    violations.push('C8: cqxPresent must be true in complete/partial_complete states');
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
