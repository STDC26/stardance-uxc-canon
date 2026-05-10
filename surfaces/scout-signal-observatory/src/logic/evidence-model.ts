// src/logic/evidence-model.ts

import { EvidenceTrace, EvidenceSource } from '../types/Evidence';

export class EvidenceModel {
  synthesize(sources: EvidenceSource[]): EvidenceTrace {
    return {
      sources,
      signalsUsed: sources.map((s) => s.id),
      sourceCount: sources.length,
      canonApplied: ['stardance-canon-v3.0'],
      learningSignal: false,
    };
  }

  combineConfidence(sources: EvidenceSource[]): number {
    if (sources.length === 0) return 0;
    const avg = sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length;
    return Math.min(avg, 0.92);
  }
}

export const evidenceModel = new EvidenceModel();
