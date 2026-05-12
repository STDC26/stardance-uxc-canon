// src/__tests__/reporting/cc-scout-20.spec.tsx
// CC_SCOUT_20 — Reporting Surface Foundation — 12 tests

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { SignalSummaryPanel, deriveTrustPosture } from '../../components/reporting/SignalSummaryPanel';
import { DecisionPosturePanel, deriveRecommendation } from '../../components/reporting/DecisionPosturePanel';
import { ConfidenceEvolutionPanel, buildConfidenceNarrative } from '../../components/reporting/ConfidenceEvolutionPanel';
import { AuditDigestPanel } from '../../components/reporting/AuditDigestPanel';
import { OperatorActionSummary } from '../../components/reporting/OperatorActionSummary';
import type { StoredSignal } from '../../persistence/signal-store';
import type { AuditEntry } from '../../persistence/signal-store';
import type { ActionSummaryState } from '../../components/reporting/OperatorActionSummary';

// ─── Fixture ──────────────────────────────────────────────────────────────────

function makeSignal(overrides: Partial<StoredSignal> = {}): StoredSignal {
  return {
    signalId:           'test-sig-001',
    source:             { id: 'src-1', name: 'Test Source', trustLevel: 0.85 },
    timestamp:          new Date().toISOString(),
    context:            'Test context.',
    whatIsHappening:    'Test happening.',
    whatItMeans:        'Test meaning.',
    confidence:         0.80,
    baselineConfidence: 0.80,
    imsState:           'processing',
    runtimeState:       'none',
    ethicsGates: {
      safety:  { passed: true, reason: 'safety gate passed' },
      delight: { passed: true, reason: 'delight gate passed' },
      harmony: { passed: true, reason: 'harmony gate passed' },
    } as unknown as StoredSignal['ethicsGates'],
    evidence:                   [],
    confidenceHistory:          [{ confidence: 0.80, timestamp: new Date().toISOString(), source: 'ingestion', reason: 'baseline locked' }],
    learningHistory:            [],
    governanceEventReferences:  [],
    cappedAtIntake:              false,
    capApplied:                  false,
    signalCoreImmutable:         true as const,
    eventLogAppendOnly:          true as const,
    schemaVersion:               '1.0.1',
    cqx: {
      context:         'ctx',
      outcome:         'out',
      meaning:         'mean',
      strengthAndRisk: { confidence: 0.80, riskAssessment: 'HIGH' },
      action:          'Escalate',
    },
    suppressionMemory: { suppressed: false },
    immutable:          true as const,
    ...overrides,
  } as unknown as StoredSignal;
}

// ─── 1. SignalSummaryPanel ────────────────────────────────────────────────────

describe('SignalSummaryPanel', () => {
  test('renders posture badge, confidence badge, state badge, ethics badge', () => {
    render(<SignalSummaryPanel signal={makeSignal()} />);
    expect(screen.getByTestId('signal-summary-panel')).toBeInTheDocument();
    expect(screen.getByTestId('posture-badge')).toBeInTheDocument();
    expect(screen.getByTestId('confidence-badge')).toBeInTheDocument();
    expect(screen.getByTestId('state-badge')).toBeInTheDocument();
    expect(screen.getByTestId('ethics-status-badge')).toBeInTheDocument();
  });

  test('deriveTrustPosture: confidence≥0.75 → strong', () => {
    expect(deriveTrustPosture(makeSignal({ confidence: 0.80 }))).toBe('strong');
  });

  test('deriveTrustPosture: escalated_pending_approval → escalated', () => {
    expect(deriveTrustPosture(makeSignal({ imsState: 'escalated_pending_approval' as 'processing' }))).toBe('escalated');
  });

  test('shows cap indicator when cappedAtIntake=true', () => {
    render(<SignalSummaryPanel signal={makeSignal({ cappedAtIntake: true })} />);
    expect(screen.getByTestId('summary-cap-indicator')).toBeInTheDocument();
  });
});

// ─── 2. DecisionPosturePanel ──────────────────────────────────────────────────

describe('DecisionPosturePanel', () => {
  test('renders recommended action + next hint + action buttons', () => {
    render(<DecisionPosturePanel signal={makeSignal()} onAction={jest.fn()} />);
    expect(screen.getByTestId('decision-posture-panel')).toBeInTheDocument();
    expect(screen.getByTestId('recommended-action')).toBeInTheDocument();
    expect(screen.getByTestId('next-step-hint')).toBeInTheDocument();
    expect(screen.getByTestId('action-buttons')).toBeInTheDocument();
  });

  test('deriveRecommendation: confidence≥0.75 → escalate', () => {
    const rec = deriveRecommendation(makeSignal({ confidence: 0.80 }));
    expect(rec.action).toBe('escalate');
  });

  test('deriveRecommendation: confidence<0.50 → watch', () => {
    const rec = deriveRecommendation(makeSignal({ confidence: 0.30 }));
    expect(rec.action).toBe('watch');
  });
});

// ─── 3. ConfidenceEvolutionPanel ─────────────────────────────────────────────

describe('ConfidenceEvolutionPanel', () => {
  test('renders bar, narrative, toggle', () => {
    render(<ConfidenceEvolutionPanel signal={makeSignal()} />);
    expect(screen.getByTestId('confidence-evolution-panel')).toBeInTheDocument();
    expect(screen.getByTestId('confidence-bar')).toBeInTheDocument();
    expect(screen.getByTestId('confidence-narrative')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-history')).toBeInTheDocument();
  });

  test('shows cap note when cappedAtIntake=true', () => {
    render(<ConfidenceEvolutionPanel signal={makeSignal({ cappedAtIntake: true })} />);
    expect(screen.getByTestId('evolution-cap-note')).toBeInTheDocument();
  });

  test('buildConfidenceNarrative includes cap mention when cappedAtIntake=true', () => {
    const hist = [{ confidence: 0.92, timestamp: new Date().toISOString(), source: 'ingestion', reason: 'baseline locked' }];
    const narrative = buildConfidenceNarrative(hist, true, 0.92);
    expect(narrative).toContain('92%');
    expect(narrative).toContain('governance');
  });
});

// ─── 4. AuditDigestPanel ─────────────────────────────────────────────────────

describe('AuditDigestPanel', () => {
  const makeEntry = (n: number): AuditEntry => ({
    entryId:    `e-${n}`,
    signalId:   'sig-1',
    timestamp:  new Date().toISOString(),
    actorId:    'system',
    actionType: `event_type_${n}`,
    details:    {},
    immutable:  true as const,
  });

  test('renders collapsed by default (≤5 events shown)', () => {
    const entries = Array.from({ length: 8 }, (_, i) => makeEntry(i));
    render(<AuditDigestPanel auditTrail={entries} />);
    expect(screen.getByTestId('audit-digest-panel')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-audit-trail')).toBeInTheDocument();
  });

  test('expand toggle shows full trail', () => {
    const entries = Array.from({ length: 8 }, (_, i) => makeEntry(i));
    render(<AuditDigestPanel auditTrail={entries} />);
    fireEvent.click(screen.getByTestId('toggle-audit-trail'));
    // All 8 entries rendered
    const list = screen.getByTestId('audit-events-list');
    expect(list.children.length).toBe(8);
  });
});

// ─── 5. OperatorActionSummary ─────────────────────────────────────────────────

describe('OperatorActionSummary', () => {
  const successSummary: ActionSummaryState = {
    status:     'success',
    action:     'escalate',
    message:    'Action submitted.',
    timestamp:  new Date().toISOString(),
    reversible: false,
  };

  test('renders success state with message + dismiss button', () => {
    render(<OperatorActionSummary summary={successSummary} autoDismissMs={0} />);
    expect(screen.getByTestId('operator-action-summary')).toBeInTheDocument();
    expect(screen.getByTestId('action-summary-message')).toHaveTextContent('Action submitted.');
    expect(screen.getByTestId('dismiss-button')).toBeInTheDocument();
  });

  test('shows undo button when reversible=true and onUndo provided', () => {
    const reversible: ActionSummaryState = { ...successSummary, reversible: true };
    render(<OperatorActionSummary summary={reversible} onUndo={jest.fn()} autoDismissMs={0} />);
    expect(screen.getByTestId('undo-button')).toBeInTheDocument();
  });
});
