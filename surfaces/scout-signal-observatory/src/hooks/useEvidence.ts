import { useMemo } from 'react';
import { EvidenceModel } from '../logic/evidence-model';
import { EvidenceSource } from '../types/Evidence';

const model = new EvidenceModel();

export function useEvidence(sources: EvidenceSource[]) {
  return useMemo(() => ({
    trace: model.synthesize(sources),
    combinedConfidence: model.combineConfidence(sources),
  }), [sources]);
}
