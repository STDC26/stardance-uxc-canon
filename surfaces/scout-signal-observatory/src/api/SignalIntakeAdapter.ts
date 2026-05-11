// src/api/SignalIntakeAdapter.ts
// CC_SCOUT_16 — Signal Intake Adapter
// Validates, transforms, and enriches raw inbound signals to SPEC-02 canonical form.
// Fail-closed: any validation failure blocks ingestion entirely.

import { IMSState, EthicsGates } from '../types/IMS';
import { CONFIDENCE_HARD_CAP } from '../logic/confidence-gates';

// ─── Canonical signal types (SPEC-02) ────────────────────────────────────────

export type EvidenceSourceType = 'sensor' | 'log' | 'external_intelligence' | 'operator_input' | 'manual';

export interface CanonicalEvidenceItem {
  evidenceId: string;
  sourceType: EvidenceSourceType;
  source: { name: string; trustLevel: number };
  timestamp: string;
  data?: Record<string, unknown>;
  immutable: true;
}

export interface ConfidenceSnapshot {
  confidence: number;
  timestamp: string;
  source: string;
  reason: string;
}

export interface CanonicalSignal {
  signalId: string;
  source: { id: string; name: string; trustLevel: number };
  timestamp: string;
  context: string;
  whatIsHappening: string;
  whatItMeans: string;
  confidence: number;
  baselineConfidence: number;
  imsState: IMSState;
  ethicsGates: EthicsGates;
  evidence: CanonicalEvidenceItem[];
  confidenceHistory: ConfidenceSnapshot[];
  suppressionMemory?: {
    suppressed: boolean;
    reason?: string;
    suppressedBy?: string;
    suppressedAt?: string;
    expiresAt?: string;
  };
  learningHistory?: Array<{
    feedbackType: 'correctly_classified' | 'misclassified' | 'pattern_important' | 'pattern_not_important';
    operator: string;
    timestamp: string;
    immutable: true;
  }>;
  governanceEventReferences: string[];
  immutable: true;
  // Cap provenance — set at intake, propagated through normalization + persistence + UI
  cappedAtIntake: boolean;
}

// ─── Raw input type (POST body) ───────────────────────────────────────────────

export interface RawSignalInput {
  source: { id: string; name: string; trustLevel: number };
  context: string;
  whatIsHappening: string;
  whatItMeans: string;
  confidence: number;
  evidence: Array<{
    sourceType: string;
    source: { name: string; trustLevel: number };
    data?: Record<string, unknown>;
  }>;
  ethicsGates?: Partial<EthicsGates>;
}

// ─── Result types ─────────────────────────────────────────────────────────────

export const INTAKE_ERROR_CODES = {
  MISSING_SOURCE:               'missing_source',
  MISSING_SOURCE_ID:            'missing_source_id',
  MISSING_SOURCE_NAME:          'missing_source_name',
  SOURCE_TRUST_LEVEL_INVALID:   'source_trust_level_invalid',
  MISSING_CONTEXT:              'missing_context',
  MISSING_WHAT_IS_HAPPENING:    'missing_what_is_happening',
  MISSING_WHAT_IT_MEANS:        'missing_what_it_means',
  MISSING_CONFIDENCE:           'missing_confidence',
  CONFIDENCE_OUT_OF_RANGE:      'confidence_out_of_range',
  EVIDENCE_REQUIRED:            'evidence_required',
  EVIDENCE_INVALID_SOURCE_TYPE: 'evidence_invalid_source_type',
  EVIDENCE_MISSING_SOURCE:      'evidence_missing_source',
  EVIDENCE_TRUST_LEVEL_INVALID: 'evidence_trust_level_invalid',
  UNKNOWN_ERROR:                'unknown_error',
} as const;

export type IntakeErrorCode = typeof INTAKE_ERROR_CODES[keyof typeof INTAKE_ERROR_CODES];

export interface ValidationResult {
  valid: boolean;
  errors: IntakeErrorCode[];
  errorMessages: string[];
}

export interface IntakeResult {
  success: boolean;
  signalId?: string;
  signal?: CanonicalSignal;
  reason?: IntakeErrorCode;
  validationErrors?: IntakeErrorCode[];
  errorMessages?: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const VALID_EVIDENCE_SOURCE_TYPES: EvidenceSourceType[] = [
  'sensor',
  'log',
  'external_intelligence',
  'operator_input',
  'manual',     // CC_SCOUT_17 RC-07 + CC_SCOUT_19: operator-seeded UAT signals
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `sig-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * validateRawSignal — fail-closed validation of inbound POST body.
 * All errors collected; any error makes valid=false.
 */
export function validateRawSignal(raw: unknown): ValidationResult {
  const errors: IntakeErrorCode[] = [];
  const errorMessages: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return {
      valid: false,
      errors: [INTAKE_ERROR_CODES.UNKNOWN_ERROR],
      errorMessages: ['Request body must be a JSON object'],
    };
  }

  const r = raw as Record<string, unknown>;

  // source
  if (!r.source || typeof r.source !== 'object') {
    errors.push(INTAKE_ERROR_CODES.MISSING_SOURCE);
    errorMessages.push('source is required');
  } else {
    const src = r.source as Record<string, unknown>;
    if (!src.id || typeof src.id !== 'string' || !src.id.trim()) {
      errors.push(INTAKE_ERROR_CODES.MISSING_SOURCE_ID);
      errorMessages.push('source.id is required');
    }
    if (!src.name || typeof src.name !== 'string' || !src.name.trim()) {
      errors.push(INTAKE_ERROR_CODES.MISSING_SOURCE_NAME);
      errorMessages.push('source.name is required');
    }
    if (typeof src.trustLevel !== 'number' || src.trustLevel < 0 || src.trustLevel > 1) {
      errors.push(INTAKE_ERROR_CODES.SOURCE_TRUST_LEVEL_INVALID);
      errorMessages.push('source.trustLevel must be a number between 0 and 1');
    }
  }

  // context
  if (!r.context || typeof r.context !== 'string' || !r.context.trim()) {
    errors.push(INTAKE_ERROR_CODES.MISSING_CONTEXT);
    errorMessages.push('context is required');
  }

  // whatIsHappening
  if (!r.whatIsHappening || typeof r.whatIsHappening !== 'string' || !r.whatIsHappening.trim()) {
    errors.push(INTAKE_ERROR_CODES.MISSING_WHAT_IS_HAPPENING);
    errorMessages.push('whatIsHappening is required');
  }

  // whatItMeans
  if (!r.whatItMeans || typeof r.whatItMeans !== 'string' || !r.whatItMeans.trim()) {
    errors.push(INTAKE_ERROR_CODES.MISSING_WHAT_IT_MEANS);
    errorMessages.push('whatItMeans is required');
  }

  // confidence
  if (r.confidence === undefined || r.confidence === null) {
    errors.push(INTAKE_ERROR_CODES.MISSING_CONFIDENCE);
    errorMessages.push('confidence is required');
  } else if (typeof r.confidence !== 'number' || r.confidence < 0 || r.confidence > 1) {
    errors.push(INTAKE_ERROR_CODES.CONFIDENCE_OUT_OF_RANGE);
    errorMessages.push('confidence must be a number between 0.0 and 1.0');
  }

  // evidence
  if (!Array.isArray(r.evidence) || r.evidence.length === 0) {
    errors.push(INTAKE_ERROR_CODES.EVIDENCE_REQUIRED);
    errorMessages.push('evidence must be a non-empty array');
  } else {
    for (let i = 0; i < r.evidence.length; i++) {
      const ev = r.evidence[i] as Record<string, unknown>;
      if (!VALID_EVIDENCE_SOURCE_TYPES.includes(ev.sourceType as EvidenceSourceType)) {
        errors.push(INTAKE_ERROR_CODES.EVIDENCE_INVALID_SOURCE_TYPE);
        errorMessages.push(`evidence[${i}].sourceType must be one of: ${VALID_EVIDENCE_SOURCE_TYPES.join(', ')}`);
      }
      if (!ev.source || typeof ev.source !== 'object') {
        errors.push(INTAKE_ERROR_CODES.EVIDENCE_MISSING_SOURCE);
        errorMessages.push(`evidence[${i}].source is required`);
      } else {
        const eSrc = ev.source as Record<string, unknown>;
        if (typeof eSrc.trustLevel !== 'number' || eSrc.trustLevel < 0 || eSrc.trustLevel > 1) {
          errors.push(INTAKE_ERROR_CODES.EVIDENCE_TRUST_LEVEL_INVALID);
          errorMessages.push(`evidence[${i}].source.trustLevel must be 0-1`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, errorMessages };
}

// ─── Transformation ───────────────────────────────────────────────────────────

/**
 * transformToCanonical — maps validated raw input to SPEC-02 canonical signal.
 * Generates server-side fields: signalId, timestamp, baselineConfidence,
 * confidenceHistory, imsState, governanceEventReferences, immutable.
 * Enforces 0.92 confidence cap.
 */
export function transformToCanonical(raw: RawSignalInput): CanonicalSignal {
  const signalId = generateId();
  const now = nowIso();
  const cappedConfidence = Math.min(raw.confidence, CONFIDENCE_HARD_CAP);
  const cappedAtIntake = raw.confidence > CONFIDENCE_HARD_CAP;

  const evidence: CanonicalEvidenceItem[] = raw.evidence.map((ev) => ({
    evidenceId: generateId(),
    sourceType: ev.sourceType as EvidenceSourceType,
    source: { name: ev.source.name, trustLevel: ev.source.trustLevel },
    timestamp: now,
    ...(ev.data ? { data: ev.data } : {}),
    immutable: true as const,
  }));

  const confidenceHistory: ConfidenceSnapshot[] = [
    {
      confidence: cappedConfidence,
      timestamp: now,
      source: 'ingestion',
      reason: 'Signal ingested — baseline confidence locked',
    },
  ];

  // Cap provenance: append explicit cap_applied entry when raw exceeded hard cap
  if (cappedAtIntake) {
    confidenceHistory.push({
      confidence: cappedConfidence,
      timestamp: now,
      source: 'intake_cap',
      reason: 'cap_applied',
    });
  }

  const ethicsGates: EthicsGates = {
    safety:  raw.ethicsGates?.safety  ?? true,
    delight: raw.ethicsGates?.delight ?? true,
    harmony: raw.ethicsGates?.harmony ?? true,
  };

  return {
    signalId,
    source: {
      id:         raw.source.id,
      name:       raw.source.name,
      trustLevel: raw.source.trustLevel,
    },
    timestamp:          now,
    context:            raw.context.trim(),
    whatIsHappening:    raw.whatIsHappening.trim(),
    whatItMeans:        raw.whatItMeans.trim(),
    confidence:         cappedConfidence,
    baselineConfidence: cappedConfidence,
    imsState:           'idle',
    ethicsGates,
    evidence,
    confidenceHistory,
    learningHistory:              [],
    governanceEventReferences:    [],
    immutable:       true as const,
    cappedAtIntake,
  };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * processIncomingSignal — validate then transform an inbound signal.
 * Returns success=false immediately if ANY validation check fails (fail-closed).
 */
export function processIncomingSignal(raw: unknown): IntakeResult {
  const validation = validateRawSignal(raw);

  if (!validation.valid) {
    return {
      success: false,
      reason: validation.errors[0],
      validationErrors: validation.errors,
      errorMessages: validation.errorMessages,
    };
  }

  const canonical = transformToCanonical(raw as RawSignalInput);

  return {
    success: true,
    signalId: canonical.signalId,
    signal: canonical,
  };
}
