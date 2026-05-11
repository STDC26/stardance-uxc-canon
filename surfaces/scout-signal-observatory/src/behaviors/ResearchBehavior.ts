// src/behaviors/ResearchBehavior.ts
// CC_SCOUT_10: Trigger Research operator action
// Source: PHASE_5_6_IBC_SECTION_1_FOUNDATION.md (Behavior 4)
//         PHASE_5_6_OPERATOR_ACTION_RUNTIME_SCHEMA.json (trigger_research)
//         PHASE_5_6_RUNTIME_ORCHESTRATION_TOPOLOGY.md (TRIGGER_RESEARCH_FLOW)

import { Signal, GovernanceEvent } from '../types/IMS';
import { CONFIDENCE_HARD_CAP } from '../logic/confidence-gates';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ResearchStage =
  | 'research_initiated'
  | 'vector_retrieval'
  | 'external_intelligence'
  | 'synthesis_generation'
  | 'confidence_recalculation'
  | 'research_complete';

export interface ResearchCapability {
  deerflowActive: boolean;
  vectorStoreAvailable: boolean;
  externalSourcesAvailable: boolean;
}

export interface VectorResult {
  patternId: string;
  similarity: number;
  confidence: number;
  description: string;
}

export interface ExternalIntelligence {
  source: string;
  relevance: number;
  summary: string;
  confidenceContribution: number;
}

export interface ResearchSynthesis {
  evidenceSynthesis: string;
  patternSynthesis: string;
  alternativeHypotheses: string[];
}

export interface ConfidenceRecalculation {
  originalConfidence: number;
  calculatedNewConfidence: number;
  cappedNewConfidence: number;   // cap 0.92 enforced
  capEnforced: boolean;
  delta: number;
  autoApplied: false;            // GOVERNANCE: never auto-applied
  operatorApprovalRequired: true;
}

export interface ResearchReport {
  researchId: string;
  signalId: string;
  stage: ResearchStage;
  vectorResults: VectorResult[];
  externalIntelligence: ExternalIntelligence[];
  synthesis: ResearchSynthesis;
  confidenceRecalculation: ConfidenceRecalculation;
  allSourcesVisible: true;
  operatorDecisionRequired: true;
  timestamp: number;
}

export interface ResearchResult {
  allowed: boolean;
  reason: string;
  report?: ResearchReport;
  governanceEvent?: GovernanceEvent;
  newState?: 'researching';
}

export interface ResearchDecisionResult {
  accepted: boolean;
  operatorId: string;
  researchId: string;
  previousConfidence: number;
  appliedConfidence?: number;
  timestamp: number;
  governanceEvent: GovernanceEvent;
}

// In-memory stores
const _researchLog: GovernanceEvent[] = [];
const _researchReports: ResearchReport[] = [];

export function getResearchLog(): ReadonlyArray<GovernanceEvent> {
  return _researchLog;
}

export function getResearchReports(): ReadonlyArray<ResearchReport> {
  return _researchReports;
}

// ─── Pre-condition validators ────────────────────────────────────────────────

export function validateConfidenceRangeForResearch(confidence: number): boolean {
  // Research recommended for MEDIUM/LOW confidence (< 0.75)
  return confidence < 0.75;
}

export function validateResearchCapability(capability: ResearchCapability): boolean {
  return capability.deerflowActive === true;
}

// ─── Runtime implementation (async) ──────────────────────────────────────────

export async function triggerResearch(
  signal: Signal,
  operatorId: string,
  capability: ResearchCapability = { deerflowActive: true, vectorStoreAvailable: true, externalSourcesAvailable: true }
): Promise<ResearchResult> {
  // Pre-condition checks (fail-closed)
  const failedChecks: string[] = [];

  if (!validateConfidenceRangeForResearch(signal.confidence)) {
    failedChecks.push('confidence_not_in_medium_low_range');
  }
  if (!validateResearchCapability(capability)) {
    failedChecks.push('deerflow_not_active');
  }

  if (failedChecks.length > 0) {
    return {
      allowed: false,
      reason: `research_blocked_by: ${failedChecks.join(', ')}`,
    };
  }

  const researchId = generateId('res');

  // Stage 1: Research initiated — create research request
  const stage1State: ResearchStage = 'research_initiated';
  void stage1State; // stages tracked in report

  // Stage 2: Vector retrieval
  const vectorResults = await orchestrateVectorRetrieval(signal);

  // Stage 3: External intelligence
  const externalIntelligence = await initiateExternalIntelligence(signal);

  // Stage 4: Synthesis generation
  const synthesis = executeSynthesisGeneration(signal, vectorResults, externalIntelligence);

  // Stage 5: Confidence recalculation
  // GOVERNANCE: NOT auto-applied — offered to operator only
  const confidenceRecalculation = recalculateConfidence(
    signal.confidence,
    vectorResults,
    externalIntelligence
  );

  // Stage 6: Research complete — generate report
  const report: ResearchReport = {
    researchId,
    signalId: signal.id,
    stage: 'research_complete',
    vectorResults,
    externalIntelligence,
    synthesis,
    confidenceRecalculation,
    allSourcesVisible: true,
    operatorDecisionRequired: true,
    timestamp: Date.now(),
  };

  // Governance event (immutable)
  const governanceEvent: GovernanceEvent = {
    eventId: generateId('gov'),
    eventType: 'research_initiated',
    eventTimestamp: Date.now(),
    signalId: signal.id,
    signalConfidenceAtEvent: signal.confidence,
    signalMeaningAtEvent: signal.meaning,
    operatorId,
    actionDetails: {
      researchId,
      vectorResultsCount: vectorResults.length,
      externalSourcesCount: externalIntelligence.length,
      originalConfidence: signal.confidence,
      suggestedConfidence: confidenceRecalculation.cappedNewConfidence,
      autoApplied: false,
    },
    failClosedApplied: true,
    governanceGatesChecked: [
      'research_does_not_auto_mutate_confidence',
      'operator_sees_all_research_sources',
      'research_rationale_always_auditable',
      'confidence_cap_0.92_maintained',
    ],
    immutable: true,
  };

  _researchLog.push(governanceEvent);
  _researchReports.push(report);

  return {
    allowed: true,
    reason: 'research_complete',
    report,
    governanceEvent,
    newState: 'researching',
  };
}

// Operator decision on research result — accept or reject new confidence
export function applyResearchDecision(
  researchId: string,
  signal: Signal,
  operatorId: string,
  accept: boolean
): ResearchDecisionResult {
  const report = _researchReports.find((r) => r.researchId === researchId);
  const calculatedConf = report?.confidenceRecalculation.cappedNewConfidence;

  const governanceEvent: GovernanceEvent = {
    eventId: generateId('gov'),
    eventType: accept ? 'research_confidence_accepted' : 'research_confidence_rejected',
    eventTimestamp: Date.now(),
    signalId: signal.id,
    signalConfidenceAtEvent: signal.confidence,
    signalMeaningAtEvent: signal.meaning,
    operatorId,
    actionDetails: {
      researchId,
      decision: accept ? 'accepted' : 'rejected',
      previousConfidence: signal.confidence,
      newConfidence: accept ? calculatedConf : signal.confidence,
    },
    failClosedApplied: false,
    governanceGatesChecked: ['operator_explicitly_approved_confidence_change'],
    immutable: true,
  };

  _researchLog.push(governanceEvent);

  return {
    accepted: accept,
    operatorId,
    researchId,
    previousConfidence: signal.confidence,
    appliedConfidence: accept ? calculatedConf : undefined,
    timestamp: Date.now(),
    governanceEvent,
  };
}

// ─── Research stage implementations ──────────────────────────────────────────

async function orchestrateVectorRetrieval(signal: Signal): Promise<VectorResult[]> {
  // Simulation: embed signal in vector space and retrieve similar patterns
  const count = Math.ceil(signal.confidence * 3) + 1;

  return Array.from({ length: count }, (_, i) => ({
    patternId: `vec-${signal.id}-${i}`,
    similarity: Math.min(0.95 - i * 0.1, 0.92),
    confidence: Math.min(signal.confidence + (0.1 - i * 0.03), 0.92),
    description: `Similar pattern ${i + 1}: ${signal.pattern ?? 'unknown'} variant`,
  }));
}

async function initiateExternalIntelligence(
  signal: Signal
): Promise<ExternalIntelligence[]> {
  // Simulation: query external intelligence sources
  const sources = [
    {
      source: 'Pattern Knowledge Base',
      relevance: 0.8,
      summary: `Known patterns matching type: ${signal.type ?? 'unknown'}`,
      confidenceContribution: 0.05,
    },
    {
      source: 'Historical Signal Repository',
      relevance: 0.7,
      summary: 'Historical precedents retrieved for similar signals',
      confidenceContribution: 0.04,
    },
  ];

  return sources.filter((s) => s.relevance > 0.5);
}

function executeSynthesisGeneration(
  signal: Signal,
  vectors: VectorResult[],
  external: ExternalIntelligence[]
): ResearchSynthesis {
  const avgVecConf =
    vectors.length > 0
      ? vectors.reduce((sum, v) => sum + v.confidence, 0) / vectors.length
      : signal.confidence;

  return {
    evidenceSynthesis: `Vector analysis identified ${vectors.length} similar patterns. External intelligence from ${external.length} sources supports classification.`,
    patternSynthesis: `Pattern ${signal.pattern ?? 'unknown'} shows ${avgVecConf >= 0.75 ? 'strong' : 'moderate'} correlation with known signal types.`,
    alternativeHypotheses:
      signal.confidence < 0.5
        ? ['Signal may be noise — further monitoring recommended', 'Pattern could indicate emerging threat category']
        : ['Current classification appears well-supported by evidence'],
  };
}

function recalculateConfidence(
  originalConfidence: number,
  vectors: VectorResult[],
  external: ExternalIntelligence[]
): ConfidenceRecalculation {
  let delta = 0;

  // Vector contribution
  if (vectors.length > 0) {
    const avgVecConf =
      vectors.reduce((sum, v) => sum + v.confidence, 0) / vectors.length;
    delta += (avgVecConf - originalConfidence) * 0.4;
  }

  // External intelligence contribution
  const extContribution = external.reduce(
    (sum, e) => sum + e.confidenceContribution,
    0
  );
  delta += extContribution;

  const calculated = originalConfidence + delta;
  const capped = Math.min(Math.max(calculated, 0), CONFIDENCE_HARD_CAP);

  return {
    originalConfidence,
    calculatedNewConfidence: calculated,
    cappedNewConfidence: capped,
    capEnforced: calculated > CONFIDENCE_HARD_CAP,
    delta: capped - originalConfidence,
    autoApplied: false,          // GOVERNANCE: never auto-applied
    operatorApprovalRequired: true,
  };
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
