// Evidence Type Definitions

export interface EvidenceSource {
  id: string;
  name: string;
  confidence: number;
  description: string;
}

export interface EvidenceTrace {
  sources: EvidenceSource[];
  signalsUsed: string[];
  sourceCount: number;
  canonApplied: string[];
  decisionMade?: string;
  learningSignal?: boolean;
}
