// src/logic/confidence-gates.ts
// Hard cap: 0.92 (non-negotiable)
// Bands: HIGH (0.75-1.0), MEDIUM (0.45-0.74), LOW (0.0-0.44)

export type ConfidenceBandLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export const CONFIDENCE_HARD_CAP = 0.92;

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.75,
  MEDIUM: 0.45,
  LOW: 0.0,
} as const;

// Action confidence thresholds (fail-closed: gates block by default)
const ACTION_THRESHOLDS: Record<string, number> = {
  escalate: 0.75,
  investigate: 0.45,
  suppress: 0.75,
  export: 0.45,
  trigger_research: 0.45,
  route_to_interpretation: 0.60,
  mark_learning_signal: 0.45,
  watch: 0.0,
};

export class ConfidenceGates {
  // Combine factors and apply hard cap — never exceeds 0.92
  calculate(...factors: number[]): number {
    if (factors.length === 0) return 0;
    const avg = factors.reduce((a, b) => a + b, 0) / factors.length;
    return Math.min(avg, CONFIDENCE_HARD_CAP);
  }

  // Weighted calculation — factors with weights
  calculateWeighted(factors: Array<{ value: number; weight: number }>): number {
    if (factors.length === 0) return 0;
    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
    if (totalWeight === 0) return 0;
    const weighted = factors.reduce((sum, f) => sum + f.value * f.weight, 0);
    return Math.min(weighted / totalWeight, CONFIDENCE_HARD_CAP);
  }

  // Get confidence band
  getBand(confidence: number): ConfidenceBandLevel {
    if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'HIGH';
    if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'MEDIUM';
    return 'LOW';
  }

  // Fail-closed: block action unless confidence meets threshold
  canExecuteAction(action: string, confidence: number): boolean {
    const threshold = ACTION_THRESHOLDS[action];
    if (threshold === undefined) return false; // Unknown action → block
    return confidence >= threshold;
  }

  // Ethics gates — all three must pass (fail-closed)
  passesEthicsGate(
    safetyCheck: boolean,
    delightCheck: boolean,
    harmonyCheck: boolean
  ): boolean {
    return safetyCheck && delightCheck && harmonyCheck;
  }

  // Get band CSS color class
  getBandColor(band: ConfidenceBandLevel): string {
    const colors: Record<ConfidenceBandLevel, string> = {
      HIGH: '#10b981',
      MEDIUM: '#f59e0b',
      LOW: '#ef4444',
    };
    return colors[band];
  }

  // Format confidence as percentage string
  formatPercent(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }
}

export const confidenceGates = new ConfidenceGates();
