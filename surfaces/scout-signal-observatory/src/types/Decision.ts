// Decision Type Definitions

import { EvidenceTrace } from './Evidence';

export interface DecisionHierarchy {
  question1: string;
  question2: string;
  question3: string;
}

export interface DecisionAnswer {
  question: string;
  answer: string;
  confidence: number;
  evidence: EvidenceTrace;
}

export type GoverneAction =
  | 'watch'
  | 'investigate'
  | 'escalate'
  | 'suppress'
  | 'export'
  | 'trigger_research'
  | 'route_to_interpretation'
  | 'mark_learning_signal';
