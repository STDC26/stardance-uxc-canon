// IMS State Type Definitions
// Source: IMS_STATE_MACHINE_REFERENCE.md

export type IMSState =
  | 'idle'
  | 'validating'
  | 'processing'
  | 'complete'
  | 'partial_complete'
  | 'failed';

export interface IMSContext {
  input?: Record<string, unknown>;
  result?: unknown;
  confidence?: number;
  error?: string;
  warnings?: string[];
  timestamp: number;
}

export interface IMSTransition {
  from: IMSState;
  to: IMSState;
  condition: (context: IMSContext) => boolean;
  action?: (context: IMSContext) => void;
}
