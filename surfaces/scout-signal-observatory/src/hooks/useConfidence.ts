import { useMemo } from 'react';
import { ConfidenceGates, ConfidenceBandLevel } from '../logic/confidence-gates';

const gates = new ConfidenceGates();

export function useConfidence(confidence: number): {
  band: ConfidenceBandLevel;
  percent: string;
  color: string;
  canExecute: (action: string) => boolean;
} {
  return useMemo(() => ({
    band: gates.getBand(confidence),
    percent: gates.formatPercent(confidence),
    color: gates.getBandColor(gates.getBand(confidence)),
    canExecute: (action: string) => gates.canExecuteAction(action, confidence),
  }), [confidence]);
}
