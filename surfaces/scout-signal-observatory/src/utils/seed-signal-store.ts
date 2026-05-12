// src/utils/seed-signal-store.ts
// UAT seed: pre-populates globalSignalStore with mock scenario signals on app load.
// Uses known signalIds (= scenario.id) so /scout/reporting/:signalId URLs are predictable.

import { CONFIDENCE_HARD_CAP } from '../logic/confidence-gates';
import { normalizationPipeline } from '../ingestion/normalization-pipeline';
import { globalSignalStore } from '../persistence/signal-store';
import type { CanonicalSignal, CanonicalEvidenceItem } from '../api/SignalIntakeAdapter';

// ─── Scenario shape (subset needed for seeding) ───────────────────────────────

interface SeedScenario {
  id:          string;
  name:        string;
  confidence?: number;
  context?:    string;
  outcome?:    string;
  meaning?:    string;
  imsState?:   string;
  evidence?:   Array<{ source: string; weight: number }>;
  ethicsGate?: {
    safetyCheck:   boolean;
    delightCheck:  boolean;
    harmonyCheck:  boolean;
  };
}

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildCanonicalSignal(scenario: SeedScenario): CanonicalSignal {
  const confidence = Math.min(scenario.confidence ?? 0.5, CONFIDENCE_HARD_CAP);
  const now        = new Date().toISOString();

  const evidence: CanonicalEvidenceItem[] = (scenario.evidence ?? [
    { source: 'Mock Source', weight: 0.75 },
  ]).map((ev, i) => ({
    evidenceId:  `${scenario.id}-ev-${i}`,
    sourceType:  'sensor' as const,
    source:      { name: ev.source, trustLevel: Math.min(ev.weight, 1) },
    timestamp:   now,
    immutable:   true as const,
  }));

  return {
    signalId:           scenario.id,
    source:             { id: `src-${scenario.id}`, name: scenario.name, trustLevel: 0.85 },
    timestamp:          now,
    context:            scenario.context     ?? 'Mock scenario context.',
    whatIsHappening:    scenario.outcome     ?? 'Mock scenario outcome.',
    whatItMeans:        scenario.meaning     ?? 'Mock scenario meaning.',
    confidence,
    baselineConfidence: confidence,
    imsState:           'processing',
    ethicsGates: {
      safety:  scenario.ethicsGate?.safetyCheck  ?? true,
      delight: scenario.ethicsGate?.delightCheck ?? true,
      harmony: scenario.ethicsGate?.harmonyCheck ?? true,
    },
    evidence,
    confidenceHistory: [
      { confidence, timestamp: now, source: 'ingestion', reason: 'UAT seed — baseline locked' },
    ],
    learningHistory:            [],
    governanceEventReferences:  [],
    suppressionMemory:          { suppressed: false },
    cappedAtIntake:             (scenario.confidence ?? 0) > CONFIDENCE_HARD_CAP,
    immutable:                  true as const,
  };
}

// ─── Main seed function ───────────────────────────────────────────────────────

let seeded = false;

export async function seedSignalStore(scenarios: SeedScenario[]): Promise<string[]> {
  if (seeded) return [];
  seeded = true;

  const storedIds: string[] = [];

  for (const scenario of scenarios) {
    // Skip failed/errorstate scenarios (no confidence)
    if (scenario.confidence === undefined || scenario.confidence === null) continue;

    const canonical   = buildCanonicalSignal(scenario);
    const pipeResult  = normalizationPipeline(canonical);
    if (!pipeResult.success || !pipeResult.signal) continue;

    const { stored } = await globalSignalStore.storeSignal(pipeResult.signal);
    if (stored) storedIds.push(scenario.id);
  }

  return storedIds;
}
