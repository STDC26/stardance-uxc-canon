// src/logic/interpretation-model.ts
// SCOUT-specific: derives interpretation from classification

import { SignalType } from './signal-classifier';

export interface InterpretationResult {
  meaning: string;
  recommendedAction: string;
  urgency: 'high' | 'medium' | 'low';
  riskLevel: string;
}

export class InterpretationModel {
  interpret(type: SignalType, confidence: number): InterpretationResult {
    switch (type) {
      case 'anomaly':
        return {
          meaning: 'An unusual pattern was detected that deviates from baseline operational behaviour.',
          recommendedAction: confidence >= 0.75 ? 'Escalate for immediate investigation' : 'Collect additional evidence',
          urgency: confidence >= 0.75 ? 'high' : 'medium',
          riskLevel: 'Elevated — deviation may indicate system or environmental change',
        };
      case 'threshold_breach':
        return {
          meaning: 'A defined operational threshold has been exceeded.',
          recommendedAction: 'Escalate to operations team with evidence trace',
          urgency: 'high',
          riskLevel: 'High — threshold breach requires immediate review',
        };
      case 'pattern':
        return {
          meaning: 'A recurring signal pattern was identified across multiple observations.',
          recommendedAction: 'Route to interpretation canvas for contextual analysis',
          urgency: 'medium',
          riskLevel: 'Moderate — pattern may indicate systemic behaviour',
        };
      case 'event':
        return {
          meaning: 'A discrete operational event was detected and logged.',
          recommendedAction: 'Mark for learning signal and archive',
          urgency: 'low',
          riskLevel: 'Low — single event, monitor for recurrence',
        };
      case 'novel':
        return {
          meaning: 'A previously unseen signal type was detected — no historical baseline available.',
          recommendedAction: 'Trigger research workflow before acting',
          urgency: 'medium',
          riskLevel: 'Unknown — novel signal, treat with caution until classified',
        };
      default:
        return {
          meaning: 'Signal could not be classified with available evidence.',
          recommendedAction: 'Collect more evidence or retry with additional context',
          urgency: 'low',
          riskLevel: 'Indeterminate — classification failed',
        };
    }
  }
}

export const interpretationModel = new InterpretationModel();
