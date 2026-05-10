// UXC Contract Type Definitions — C0-C8

export interface UXCMetadata {
  surfaceId: string;
  version: string;
  orbitState: string;
  imsState: string;
  cqxPresent: boolean;
  confidenceVisible: boolean;
  operatorControlPreserved: boolean;
  timestamp: number;
}

export interface CQXElement {
  context: string;
  outcome: string;
  meaning: string;     // RC-02: SEPARATE from action
  strengthRisk: {
    confidence: number;
    risk: string;
  };
  action: string;      // RC-02: DISTINCT from meaning
}
