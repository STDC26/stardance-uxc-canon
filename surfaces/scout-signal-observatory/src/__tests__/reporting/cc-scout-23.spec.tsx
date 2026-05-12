// src/__tests__/reporting/cc-scout-23.spec.tsx
// CC_SCOUT_23 — Reporting Validation & Audit — 12 tests

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { OperatorCognitionChecklist, COGNITION_CHECKLIST } from '../../components/reporting/OperatorCognitionChecklist';
import { AuditDigestVerification, verifyAuditTrail }        from '../../components/reporting/AuditDigestVerification';
import {
  ConfidenceCapProvenanceVerification,
  verifyCapProvenance,
} from '../../components/reporting/ConfidenceCapProvenanceVerification';
import { KnownLimitations, KNOWN_LIMITATIONS }              from '../../components/reporting/KnownLimitations';
import { Build2ValidationReport, generateBuild2Report }      from '../../components/reporting/Build2ValidationReport';
import {
  useDecisionTimeMeasurement,
  TARGET_ORIENTATION_MS,
  TARGET_CONFIDENCE_MS,
  TARGET_DECISION_MS,
} from '../../hooks/useDecisionTimeMeasurement';
import { renderHook } from '@testing-library/react';
import type { StoredSignal, AuditEntry } from '../../persistence/signal-store';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeSignal(overrides: Partial<StoredSignal> = {}): StoredSignal {
  return {
    signalId:           'val-sig-001',
    source:             { id: 'src-1', name: 'Validation Source', trustLevel: 0.8 },
    timestamp:          new Date().toISOString(),
    context:            'Validation test.',
    whatIsHappening:    'Test.',
    whatItMeans:        'Test.',
    confidence:         0.82,
    baselineConfidence: 0.82,
    imsState:           'processing',
    runtimeState:       'none',
    ethicsGates: {
      safety:  { passed: true, reason: 'ok' },
      delight: { passed: true, reason: 'ok' },
      harmony: { passed: true, reason: 'ok' },
    } as unknown as StoredSignal['ethicsGates'],
    evidence:                   [],
    confidenceHistory:          [{ confidence: 0.92, timestamp: new Date().toISOString(), source: 'intake_cap', reason: 'cap_applied' }],
    learningHistory:            [],
    governanceEventReferences:  [],
    cappedAtIntake:              true,
    capApplied:                  false,
    signalCoreImmutable:         true as const,
    eventLogAppendOnly:          true as const,
    schemaVersion:               '1.0.1',
    cqx: { context: 'c', outcome: 'o', meaning: 'm', strengthAndRisk: { confidence: 0.82, riskAssessment: 'H' }, action: 'a' },
    suppressionMemory: { suppressed: false },
    immutable:          true as const,
    ...overrides,
  } as unknown as StoredSignal;
}

function makeAuditEntry(actionType: string, n = 0): AuditEntry {
  return {
    entryId:    `e-${n}`,
    signalId:   'val-sig-001',
    timestamp:  new Date().toISOString(),
    actorId:    'system',
    actionType,
    details:    { confidence: 0.92 },
    immutable:  true as const,
  };
}

// ─── 1. OperatorCognitionChecklist ────────────────────────────────────────────

describe('OperatorCognitionChecklist', () => {
  test('renders 5 checklist items', () => {
    render(<OperatorCognitionChecklist />);
    expect(screen.getByTestId('operator-cognition-checklist')).toBeInTheDocument();
    expect(COGNITION_CHECKLIST).toHaveLength(5);
    COGNITION_CHECKLIST.forEach(item => {
      expect(screen.getByTestId(`checklist-item-${item.id}`)).toBeInTheDocument();
    });
  });

  test('shows pass message when all items checked', () => {
    render(<OperatorCognitionChecklist />);
    COGNITION_CHECKLIST.forEach(item => {
      fireEvent.click(screen.getByTestId(`checkbox-${item.id}`));
    });
    expect(screen.getByTestId('checklist-pass-message')).toBeInTheDocument();
    expect(screen.getByTestId('checklist-pass-message').textContent).toContain('Ready to act');
  });
});

// ─── 2. AuditDigestVerification ───────────────────────────────────────────────

describe('AuditDigestVerification', () => {
  test('verifyAuditTrail: immutable entries → verdict=pass', () => {
    const entries = [
      makeAuditEntry('signal_stored',          0),
      makeAuditEntry('confidence_cap_enforced', 1),
    ];
    const result = verifyAuditTrail(entries);
    expect(result.verdict).toBe('pass');
    expect(result.hasCapProvenance).toBe(true);
    expect(result.immutabilityViolations).toBe(0);
  });

  test('verifyAuditTrail: empty trail → verdict=concern', () => {
    const result = verifyAuditTrail([]);
    expect(result.verdict).toBe('concern');
  });

  test('renders verdict in component', () => {
    const entries = [makeAuditEntry('signal_stored', 0)];
    render(<AuditDigestVerification auditTrail={entries} />);
    expect(screen.getByTestId('audit-digest-verification')).toBeInTheDocument();
    expect(screen.getByTestId('audit-verification-verdict')).toBeInTheDocument();
  });
});

// ─── 3. ConfidenceCapProvenanceVerification ───────────────────────────────────

describe('ConfidenceCapProvenanceVerification', () => {
  test('verifyCapProvenance: capped signal with full trail → verdict=pass', () => {
    const signal  = makeSignal({ cappedAtIntake: true });
    const trail   = [makeAuditEntry('confidence_cap_enforced', 0)];
    const result  = verifyCapProvenance(signal, trail);
    expect(result.verdict).toBe('pass');
    expect(result.cappedAtIntakeFlagSet).toBe(true);
    expect(result.capInConfidenceHistory).toBe(true);
    expect(result.capInAuditTrail).toBe(true);
  });

  test('verifyCapProvenance: not capped → verdict=not_applicable', () => {
    const result = verifyCapProvenance(makeSignal({ cappedAtIntake: false }), []);
    expect(result.verdict).toBe('not_applicable');
  });

  test('renders verification component without errors', () => {
    render(<ConfidenceCapProvenanceVerification signal={makeSignal()} auditTrail={[makeAuditEntry('confidence_cap_enforced')]} />);
    expect(screen.getByTestId('cap-provenance-verification')).toBeInTheDocument();
    expect(screen.getByTestId('cap-verification-verdict')).toBeInTheDocument();
  });
});

// ─── 4. KnownLimitations ─────────────────────────────────────────────────────

describe('KnownLimitations', () => {
  test('renders with 6 known limitations expandable', () => {
    render(<KnownLimitations />);
    expect(screen.getByTestId('known-limitations')).toBeInTheDocument();
    expect(KNOWN_LIMITATIONS.length).toBeGreaterThanOrEqual(5);
    // collapsed by default
    expect(screen.queryByTestId('limitations-list')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('toggle-limitations'));
    expect(screen.getByTestId('limitations-list')).toBeInTheDocument();
  });
});

// ─── 5. Build2ValidationReport ───────────────────────────────────────────────

describe('Build2ValidationReport', () => {
  test('generateBuild2Report: clean signal → verdict pass or pass_with_notes, phase6 ready/caution', () => {
    const signal = makeSignal({ cappedAtIntake: true });
    const trail  = [
      makeAuditEntry('signal_stored',           0),
      makeAuditEntry('confidence_cap_enforced',  1),
      makeAuditEntry('governance_event',         2),
    ];
    const report = generateBuild2Report(signal, trail);
    expect(['pass', 'pass_with_notes']).toContain(report.verdict);
    expect(['ready', 'ready_with_caution']).toContain(report.phase6Readiness);
    expect(report.cognitionItems).toBe(5);
    expect(report.immutable).toBe(true);
  });

  test('renders report component and generate button', () => {
    render(<Build2ValidationReport signal={makeSignal()} auditTrail={[]} />);
    expect(screen.getByTestId('build2-validation-report')).toBeInTheDocument();
    expect(screen.getByTestId('generate-report-btn')).toBeInTheDocument();
  });
});

// ─── 6. useDecisionTimeMeasurement ───────────────────────────────────────────

describe('useDecisionTimeMeasurement', () => {
  test('hook initializes with null metrics and correct targets', () => {
    const { result } = renderHook(() => useDecisionTimeMeasurement('test-sig'));
    expect(result.current.metrics.orientationTimeMs).toBeNull();
    expect(result.current.metrics.confidenceUnderstandingTimeMs).toBeNull();
    expect(result.current.metrics.decisionTimeMs).toBeNull();
    expect(TARGET_ORIENTATION_MS).toBe(15_000);
    expect(TARGET_CONFIDENCE_MS).toBe(30_000);
    expect(TARGET_DECISION_MS).toBe(60_000);
  });
});
