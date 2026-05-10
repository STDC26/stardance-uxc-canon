// src/logic/signal-classifier.ts
// SCOUT-specific signal classification

export type SignalType =
  | 'anomaly'
  | 'pattern'
  | 'event'
  | 'threshold_breach'
  | 'novel'
  | 'unknown';

export interface ClassificationResult {
  type: SignalType;
  label: string;
  confidence: number;
  factors: string[];
  isNovel: boolean;
}

const SIGNAL_PATTERNS: Record<string, SignalType> = {
  anomaly: 'anomaly',
  pattern: 'pattern',
  event: 'event',
  breach: 'threshold_breach',
  novel: 'novel',
};

export class SignalClassifier {
  classify(raw: string): ClassificationResult {
    const lower = raw.toLowerCase();

    for (const [key, type] of Object.entries(SIGNAL_PATTERNS)) {
      if (lower.includes(key)) {
        return {
          type,
          label: this.labelFor(type),
          confidence: this.baseConfidence(type),
          factors: [`Keyword match: ${key}`],
          isNovel: type === 'novel',
        };
      }
    }

    return {
      type: 'unknown',
      label: 'Unclassified Signal',
      confidence: 0.20,
      factors: ['No matching pattern'],
      isNovel: false,
    };
  }

  private labelFor(type: SignalType): string {
    const labels: Record<SignalType, string> = {
      anomaly: 'Anomalous Signal',
      pattern: 'Pattern Signal',
      event: 'Event Signal',
      threshold_breach: 'Threshold Breach',
      novel: 'Novel Signal',
      unknown: 'Unknown Signal',
    };
    return labels[type];
  }

  private baseConfidence(type: SignalType): number {
    const base: Record<SignalType, number> = {
      anomaly: 0.82,
      pattern: 0.88,
      event: 0.85,
      threshold_breach: 0.90,
      novel: 0.55,
      unknown: 0.20,
    };
    return base[type];
  }
}

export const signalClassifier = new SignalClassifier();
