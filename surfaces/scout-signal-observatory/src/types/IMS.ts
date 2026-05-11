// IMS State Type Definitions
// Source: IMS_STATE_MACHINE_REFERENCE.md + Phase 5.6 State Machine Extension

// Phase 5 base states
export type IMSBaseState =
  | 'idle'
  | 'validating'
  | 'processing'
  | 'complete'
  | 'partial_complete'
  | 'failed';

// Phase 5.6 extended operator action states
export type IMSExtendedState =
  | 'escalated_pending_approval'
  | 'investigating'
  | 'suppressed_with_memory'
  | 'researching'
  | 'learning_event_recorded';

export type IMSState = IMSBaseState | IMSExtendedState;

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

// Ethics gates structure used across Phase 5.6 behaviors
export interface EthicsGates {
  safety: boolean;
  delight: boolean;
  harmony: boolean;
}

// Signal type used across all Phase 5.6 behaviors
export interface Signal {
  id: string;
  type?: string;
  confidence: number;
  meaning: string;
  evidence: Array<{ source: string; weight: number }>;
  imsState: IMSState;
  timestamp: number;
  pattern?: string;
  operatorDecision?: string;
  suppressedUntil?: number;
  learningEventRecorded?: number;
  uncertainty?: number;
  ethicsGates?: EthicsGates;
}

// Governance event — immutable audit record
export interface GovernanceEvent {
  eventId: string;
  eventType: string;
  eventTimestamp: number;
  signalId: string;
  signalConfidenceAtEvent: number;
  signalMeaningAtEvent: string;
  signalEthicsGatesAtEvent?: EthicsGates;
  operatorId: string;
  actionDetails: Record<string, unknown>;
  rationale?: string;
  failClosedApplied: boolean;
  governanceGatesChecked: string[];
  immutable: true;
}
