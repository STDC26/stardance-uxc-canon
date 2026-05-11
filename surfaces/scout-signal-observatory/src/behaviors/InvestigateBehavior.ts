// src/behaviors/InvestigateBehavior.ts
// CC_SCOUT_08: Investigate operator action
// Source: PHASE_5_6_IBC_SECTION_1_FOUNDATION.md (Behavior 2)
//         PHASE_5_6_OPERATOR_ACTION_RUNTIME_SCHEMA.json (investigate)
//         PHASE_5_6_RUNTIME_ORCHESTRATION_TOPOLOGY.md (INVESTIGATE_FLOW)

import { Signal, GovernanceEvent } from '../types/IMS';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InvestigationPreConditionResult {
  allowed: boolean;
  reason: string;
  failedChecks: string[];
}

export interface HistoricalSignal {
  id: string;
  timestamp: number;
  confidence: number;
  pattern?: string;
  meaning: string;
}

export interface PatternCorrelation {
  pattern: string;
  occurrences: number;
  averageConfidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface Contradiction {
  description: string;
  evidenceFor: string;
  evidenceAgainst: string;
}

export interface InvestigationReport {
  investigationId: string;
  signalId: string;
  baselineConfidence: number;
  historicalSignals: HistoricalSignal[];
  patternCorrelations: PatternCorrelation[];
  contextEnrichment: {
    operationalContext: string;
    environmentalConditions: string;
    systemState: string;
  };
  contradictions: Contradiction[];
  alternativeHypotheses: string[];
  suggestedActions: string[];
  // GOVERNANCE: confidence NOT auto-updated
  suggestedConfidenceAdjustment?: number;
  confidenceAutoUpdated: false;
  operatorDecisionRequired: true;
  timestamp: number;
}

export interface InvestigationResult {
  allowed: boolean;
  reason: string;
  report?: InvestigationReport;
  governanceEvent?: GovernanceEvent;
  newState?: 'investigating';
}

// In-memory store
const _investigationLog: GovernanceEvent[] = [];
const _investigationReports: InvestigationReport[] = [];

export function getInvestigationLog(): ReadonlyArray<GovernanceEvent> {
  return _investigationLog;
}

export function getInvestigationReports(): ReadonlyArray<InvestigationReport> {
  return _investigationReports;
}

// ─── Pre-condition validators ────────────────────────────────────────────────

export function validateIMSStateForInvestigation(
  imsState: Signal['imsState']
): boolean {
  return imsState === 'complete' || imsState === 'partial_complete';
}

export function validateEvidencePoolForInvestigation(
  evidence: Signal['evidence']
): boolean {
  return Array.isArray(evidence) && evidence.length >= 1;
}

export function validateSignalForInvestigation(signal: Signal): boolean {
  return (
    typeof signal.meaning === 'string' &&
    signal.meaning.length > 0 &&
    typeof signal.confidence === 'number'
  );
}

export function checkInvestigationPreConditions(
  signal: Signal
): InvestigationPreConditionResult {
  const checks: Record<string, boolean> = {
    ims_state_valid: validateIMSStateForInvestigation(signal.imsState),
    evidence_available: validateEvidencePoolForInvestigation(signal.evidence),
    signal_complete: validateSignalForInvestigation(signal),
  };

  const failedChecks = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (failedChecks.length > 0) {
    return {
      allowed: false,
      reason: `investigate_blocked_by: ${failedChecks.join(', ')}`,
      failedChecks,
    };
  }

  return { allowed: true, reason: 'investigate_allowed', failedChecks: [] };
}

// ─── Runtime sequence (async) ─────────────────────────────────────────────────

export async function investigate(
  signal: Signal,
  operatorId: string
): Promise<InvestigationResult> {
  // Pre-condition check (fail-closed)
  const preCheck = checkInvestigationPreConditions(signal);
  if (!preCheck.allowed) {
    return { allowed: false, reason: preCheck.reason };
  }

  const investigationId = generateId('inv');

  // Step 1: Capture baseline confidence (locked — not mutated)
  const baselineConfidence = signal.confidence;

  // Step 2: Gather historical signals (past 90 days simulation)
  const historicalSignals = gatherHistoricalSignals(signal);

  // Step 3: Execute pattern correlation
  const patternCorrelations = executePatternCorrelation(signal, historicalSignals);

  // Step 4: Perform context enrichment
  const contextEnrichment = performContextEnrichment(signal);

  // Step 5: Execute contradiction analysis
  const { contradictions, alternativeHypotheses } = executeContradictionAnalysis(
    signal,
    historicalSignals
  );

  // Step 6: Generate investigation report
  // GOVERNANCE: confidence NOT auto-updated — operator must explicitly review
  const suggestedAdjustment = calculateSuggestedConfidenceAdjustment(
    signal,
    patternCorrelations,
    contradictions
  );

  const report: InvestigationReport = {
    investigationId,
    signalId: signal.id,
    baselineConfidence,
    historicalSignals,
    patternCorrelations,
    contextEnrichment,
    contradictions,
    alternativeHypotheses,
    suggestedActions: buildSuggestedActions(signal, contradictions),
    suggestedConfidenceAdjustment: suggestedAdjustment,
    confidenceAutoUpdated: false,
    operatorDecisionRequired: true,
    timestamp: Date.now(),
  };

  // Governance event (immutable)
  const governanceEvent: GovernanceEvent = {
    eventId: generateId('gov'),
    eventType: 'investigation_initiated',
    eventTimestamp: Date.now(),
    signalId: signal.id,
    signalConfidenceAtEvent: baselineConfidence,
    signalMeaningAtEvent: signal.meaning,
    operatorId,
    actionDetails: {
      investigationId,
      historicalSignalsRetrieved: historicalSignals.length,
      patternCorrelationsFound: patternCorrelations.length,
      contradictionsFound: contradictions.length,
      confidenceNotMutated: true,
    },
    failClosedApplied: true,
    governanceGatesChecked: [
      'investigation_does_not_auto_update_confidence',
      'all_evidence_sources_visible',
      'contradictions_explicit_not_hidden',
      'operator_decision_required_after_investigation',
    ],
    immutable: true,
  };

  _investigationLog.push(governanceEvent);
  _investigationReports.push(report);

  // Step 7: Present to operator (await decision — caller handles UI)
  return {
    allowed: true,
    reason: 'investigation_complete',
    report,
    governanceEvent,
    newState: 'investigating',
  };
}

// ─── Helper functions ────────────────────────────────────────────────────────

function gatherHistoricalSignals(signal: Signal): HistoricalSignal[] {
  // Simulation: generate plausible historical signals based on current signal
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const count = Math.floor(signal.confidence * 5) + 1;

  return Array.from({ length: count }, (_, i) => ({
    id: `hist-${signal.id}-${i}`,
    timestamp: ninetyDaysAgo + Math.random() * 90 * 24 * 60 * 60 * 1000,
    confidence: Math.min(
      signal.confidence + (Math.random() * 0.2 - 0.1),
      0.92
    ),
    pattern: signal.pattern,
    meaning: `Historical occurrence ${i + 1} of similar pattern`,
  }));
}

function executePatternCorrelation(
  signal: Signal,
  historical: HistoricalSignal[]
): PatternCorrelation[] {
  if (!signal.pattern || historical.length === 0) return [];

  const avgConf =
    historical.reduce((sum, h) => sum + h.confidence, 0) / historical.length;
  const firstConf = historical[0]?.confidence ?? signal.confidence;
  const lastConf = historical[historical.length - 1]?.confidence ?? signal.confidence;
  const trend: PatternCorrelation['trend'] =
    lastConf > firstConf + 0.05
      ? 'increasing'
      : lastConf < firstConf - 0.05
      ? 'decreasing'
      : 'stable';

  return [
    {
      pattern: signal.pattern,
      occurrences: historical.length,
      averageConfidence: Math.min(avgConf, 0.92),
      trend,
    },
  ];
}

function performContextEnrichment(signal: Signal): InvestigationReport['contextEnrichment'] {
  return {
    operationalContext: `Signal type: ${signal.type ?? 'unknown'}. Active monitoring in effect.`,
    environmentalConditions: 'Standard operational parameters within bounds.',
    systemState: `IMS state at investigation: ${signal.imsState}. Confidence band: ${
      signal.confidence >= 0.75 ? 'HIGH' : signal.confidence >= 0.45 ? 'MEDIUM' : 'LOW'
    }.`,
  };
}

function executeContradictionAnalysis(
  signal: Signal,
  historical: HistoricalSignal[]
): { contradictions: Contradiction[]; alternativeHypotheses: string[] } {
  const contradictions: Contradiction[] = [];
  const alternativeHypotheses: string[] = [];

  // Detect confidence variance as potential contradiction
  if (historical.length >= 2) {
    const confidences = historical.map((h) => h.confidence);
    const variance =
      confidences.reduce((sum, c) => sum + Math.pow(c - signal.confidence, 2), 0) /
      confidences.length;

    if (variance > 0.05) {
      contradictions.push({
        description: 'Historical confidence variance suggests inconsistent signal pattern',
        evidenceFor: `Current confidence: ${signal.confidence.toFixed(2)}`,
        evidenceAgainst: `Historical mean differs by ${Math.sqrt(variance).toFixed(2)}`,
      });
      alternativeHypotheses.push(
        'Signal may represent a new pattern variant rather than established category'
      );
    }
  }

  if (signal.uncertainty !== undefined && signal.uncertainty > 0.3) {
    contradictions.push({
      description: 'High uncertainty factor conflicts with current confidence level',
      evidenceFor: `Confidence: ${signal.confidence.toFixed(2)}`,
      evidenceAgainst: `Uncertainty: ${signal.uncertainty.toFixed(2)}`,
    });
    alternativeHypotheses.push('Consider triggering research to reduce uncertainty');
  }

  return { contradictions, alternativeHypotheses };
}

function calculateSuggestedConfidenceAdjustment(
  signal: Signal,
  correlations: PatternCorrelation[],
  contradictions: Contradiction[]
): number | undefined {
  if (correlations.length === 0) return undefined;

  let adjustment = 0;

  for (const corr of correlations) {
    const delta = corr.averageConfidence - signal.confidence;
    adjustment += delta * 0.5; // Partial weight from historical
  }

  // Contradictions reduce suggested confidence
  adjustment -= contradictions.length * 0.03;

  const suggested = Math.min(
    Math.max(signal.confidence + adjustment, 0),
    0.92
  );

  // Only suggest if meaningful change (>0.02)
  return Math.abs(suggested - signal.confidence) > 0.02 ? suggested : undefined;
}

function buildSuggestedActions(
  signal: Signal,
  contradictions: Contradiction[]
): string[] {
  const actions: string[] = [];

  if (signal.confidence >= 0.75 && contradictions.length === 0) {
    actions.push('Escalate — confidence and evidence support escalation');
  }
  if (contradictions.length > 0) {
    actions.push('Trigger Research — contradictions warrant deeper analysis');
  }
  if (signal.confidence < 0.45) {
    actions.push('Suppress or Mark as Learning — low confidence signal');
  }
  if (actions.length === 0) {
    actions.push('Review evidence and select appropriate action');
  }

  return actions;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
