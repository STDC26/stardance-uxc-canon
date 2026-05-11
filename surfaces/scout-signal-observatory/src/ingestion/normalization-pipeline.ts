// src/ingestion/normalization-pipeline.ts
// CC_SCOUT_17 — Normalization Pipeline (5 sequential steps)
// Transforms raw validated signals into v1.0.1 canonical form.

import { CONFIDENCE_HARD_CAP } from '../logic/confidence-gates';
import {
  CanonicalSignal,
  processIncomingSignal,
  type ConfidenceSnapshot,
} from '../api/SignalIntakeAdapter';
import { capConfidence } from './confidence-handler';
import { transformToCQX, CQXCanonical } from './cqx-generator';

// ─── Extended normalized types ────────────────────────────────────────────────

export interface EthicsGateRationale {
  passed: boolean;
  reason: string;
}

export interface EthicsGatesWithRationale {
  safety:  EthicsGateRationale;
  delight: EthicsGateRationale;
  harmony: EthicsGateRationale;
}

export interface NormalizedSignal extends Omit<CanonicalSignal, 'ethicsGates'> {
  // Step 2 additions
  imsState: 'processing';
  runtimeState: 'none';
  signalCoreImmutable: true;
  eventLogAppendOnly: true;
  // Step 3 addition
  cqx: CQXCanonical;
  // Step 4: baselineConfidence is already on CanonicalSignal; capApplied added
  capApplied: boolean;
  // Step 5: ethicsGates enriched with rationale
  ethicsGates: EthicsGatesWithRationale;
}

export interface PipelineResult {
  success: boolean;
  signal?: NormalizedSignal;
  errors?: string[];
  step?: string;
}

// ─── Step 1: validateAndParseSignal ──────────────────────────────────────────

export interface ParseResult {
  valid: boolean;
  signal?: CanonicalSignal;
  errors: string[];
}

const FUTURE_TOLERANCE_MS = 5_000; // 5-second clock-skew tolerance

export function validateAndParseSignal(input: CanonicalSignal): ParseResult {
  const errors: string[] = [];

  // Required fields
  const required: Array<keyof CanonicalSignal> = [
    'signalId', 'source', 'timestamp', 'context',
    'whatIsHappening', 'whatItMeans', 'confidence',
    'imsState', 'ethicsGates', 'evidence',
    'baselineConfidence', 'confidenceHistory', 'immutable',
  ];
  for (const field of required) {
    if (input[field] === undefined || input[field] === null) {
      errors.push(`missing_required_field:${field}`);
    }
  }

  // Type checks (only if fields present)
  if (typeof input.confidence !== 'undefined') {
    if (typeof input.confidence !== 'number' || input.confidence < 0 || input.confidence > 1) {
      errors.push('confidence_out_of_range');
    }
  }

  if (typeof input.baselineConfidence !== 'undefined') {
    if (typeof input.baselineConfidence !== 'number' || input.baselineConfidence < 0 || input.baselineConfidence > 1) {
      errors.push('baseline_confidence_out_of_range');
    }
  }

  // Timestamp: valid ISO8601 and not future-dated
  if (input.timestamp) {
    const ts = new Date(input.timestamp).getTime();
    if (isNaN(ts)) {
      errors.push('timestamp_invalid_format');
    } else if (ts > Date.now() + FUTURE_TOLERANCE_MS) {
      errors.push('timestamp_future_dated');
    }
  }

  // Evidence non-empty
  if (!Array.isArray(input.evidence) || input.evidence.length === 0) {
    errors.push('evidence_required');
  }

  // Type check: source must have id and name
  if (input.source && (typeof input.source.id !== 'string' || typeof input.source.name !== 'string')) {
    errors.push('source_fields_invalid_type');
  }

  return {
    valid: errors.length === 0,
    signal: errors.length === 0 ? input : undefined,
    errors,
  };
}

// ─── Step 2: enrichSignal ─────────────────────────────────────────────────────

export interface EnrichedSignal extends CanonicalSignal {
  imsState: 'processing';
  runtimeState: 'none';
  signalCoreImmutable: true;
  eventLogAppendOnly: true;
}

export function enrichSignal(signal: CanonicalSignal): EnrichedSignal {
  return {
    ...signal,
    imsState: 'processing' as const,
    runtimeState: 'none' as const,
    signalCoreImmutable: true as const,
    eventLogAppendOnly: true as const,
  };
}

// ─── Step 5: initializeRuntimeHistory ────────────────────────────────────────

function buildEthicsRationale(gates: CanonicalSignal['ethicsGates']): EthicsGatesWithRationale {
  const toRationale = (name: string, passed: boolean): EthicsGateRationale => ({
    passed,
    reason: passed ? `${name} gate passed` : `${name} gate blocked — action constrained`,
  });
  return {
    safety:  toRationale('safety',  gates.safety),
    delight: toRationale('delight', gates.delight),
    harmony: toRationale('harmony', gates.harmony),
  };
}

export function initializeRuntimeHistory(
  signal: EnrichedSignal,
  capResult: ReturnType<typeof capConfidence>,
  cqx: CQXCanonical
): NormalizedSignal {
  const ethicsGates = buildEthicsRationale(signal.ethicsGates);

  return {
    ...signal,
    // Step 4 outputs
    confidence:         capResult.confidence,
    baselineConfidence: capResult.baselineConfidence,
    confidenceHistory:  capResult.confidenceHistory,
    capApplied:         capResult.capApplied,
    // Step 3 output
    cqx,
    // Step 5: initialized arrays + governance structure
    learningHistory:           signal.learningHistory   ?? [],
    governanceEventReferences: signal.governanceEventReferences ?? [],
    suppressionMemory: signal.suppressionMemory ?? { suppressed: false },
    // Step 5: ethics gates enriched with rationale
    ethicsGates,
  } as NormalizedSignal;
}

// ─── Pipeline assembly ────────────────────────────────────────────────────────

/**
 * normalizationPipeline — run all 5 steps sequentially.
 * Fails at first step error (fail-closed).
 */
export function normalizationPipeline(input: CanonicalSignal): PipelineResult {
  // Step 1: validate and parse
  const parseResult = validateAndParseSignal(input);
  if (!parseResult.valid) {
    return { success: false, errors: parseResult.errors, step: 'step1_validate' };
  }

  // Step 2: enrich
  const enriched = enrichSignal(parseResult.signal!);

  // Step 3: transform to CQX
  const cqx = transformToCQX({
    context:          enriched.context,
    whatIsHappening:  enriched.whatIsHappening,
    whatItMeans:      enriched.whatItMeans,
    confidence:       enriched.confidence,
    ethicsGates:      enriched.ethicsGates,
  });

  // Step 4: enforce confidence cap
  const capResult = capConfidence({
    confidence:        enriched.confidence,
    confidenceHistory: enriched.confidenceHistory,
  });

  // Step 5: initialize runtime history
  const normalized = initializeRuntimeHistory(enriched, capResult, cqx);

  return { success: true, signal: normalized };
}

// ─── End-to-end entry point ───────────────────────────────────────────────────

/**
 * normalizeAndValidateFull — intake raw input + full normalization pipeline.
 * Convenience wrapper for the ingestion HTTP handler.
 */
export function normalizeAndValidateFull(raw: unknown): PipelineResult {
  const intake = processIncomingSignal(raw);
  if (!intake.success || !intake.signal) {
    return {
      success: false,
      errors: intake.errorMessages ?? [intake.reason ?? 'intake_failed'],
      step: 'step0_intake',
    };
  }
  return normalizationPipeline(intake.signal);
}

// ─── Schema compliance check ──────────────────────────────────────────────────

/**
 * isV1CompliantSignal — verify NormalizedSignal has all v1.0.1 required fields.
 * Used as acceptance gate before persistence.
 */
export function isV1CompliantSignal(s: unknown): s is NormalizedSignal {
  if (!s || typeof s !== 'object') return false;
  const n = s as Record<string, unknown>;
  return (
    typeof n.signalId            === 'string' &&
    typeof n.confidence          === 'number' &&
    n.confidence                 <= CONFIDENCE_HARD_CAP &&
    typeof n.baselineConfidence  === 'number' &&
    typeof n.context             === 'string' &&
    typeof n.whatIsHappening     === 'string' &&
    typeof n.whatItMeans         === 'string' &&
    n.imsState                   === 'processing' &&
    n.runtimeState               === 'none' &&
    n.signalCoreImmutable        === true &&
    n.eventLogAppendOnly         === true &&
    n.immutable                  === true &&
    Array.isArray(n.confidenceHistory) &&
    Array.isArray(n.learningHistory) &&
    Array.isArray(n.governanceEventReferences) &&
    !!n.cqx &&
    !!n.ethicsGates
  );
}
