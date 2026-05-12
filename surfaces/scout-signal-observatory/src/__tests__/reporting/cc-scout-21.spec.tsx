// src/__tests__/reporting/cc-scout-21.spec.tsx
// CC_SCOUT_21 — Spider Topology Visualization — 8 tests

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { SpiderTopology, buildDimensions } from '../../components/reporting/SpiderTopology';
import { TopologyLegend } from '../../components/reporting/TopologyLegend';
import { TopologyTooltip } from '../../components/reporting/TopologyTooltip';
import type { StoredSignal } from '../../persistence/signal-store';

// ─── Fixture ──────────────────────────────────────────────────────────────────

function makeSignal(overrides: Partial<StoredSignal> = {}): StoredSignal {
  return {
    signalId:           'topo-sig-001',
    source:             { id: 'src-1', name: 'Topology Source', trustLevel: 0.80 },
    timestamp:          new Date().toISOString(),
    context:            'Topology test.',
    whatIsHappening:    'Topology test.',
    whatItMeans:        'Topology test.',
    confidence:         0.80,
    baselineConfidence: 0.80,
    imsState:           'processing',
    runtimeState:       'none',
    ethicsGates: {
      safety:  { passed: true, reason: 'ok' },
      delight: { passed: true, reason: 'ok' },
      harmony: { passed: true, reason: 'ok' },
    } as unknown as StoredSignal['ethicsGates'],
    evidence:                   [{ evidenceId: 'e1', sourceType: 'sensor', source: { name: 'S', trustLevel: 0.8 }, timestamp: '', immutable: true }],
    confidenceHistory:          [],
    learningHistory:            [],
    governanceEventReferences:  [],
    cappedAtIntake:              false,
    capApplied:                  false,
    signalCoreImmutable:         true as const,
    eventLogAppendOnly:          true as const,
    schemaVersion:               '1.0.1',
    cqx: { context: 'c', outcome: 'o', meaning: 'm', strengthAndRisk: { confidence: 0.8, riskAssessment: 'H' }, action: 'a' },
    suppressionMemory: { suppressed: false },
    immutable:          true as const,
    ...overrides,
  } as unknown as StoredSignal;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SpiderTopology', () => {
  test('renders SVG with signal polygon and 5 axis lines', () => {
    render(<SpiderTopology signal={makeSignal()} />);
    expect(screen.getByTestId('spider-topology')).toBeInTheDocument();
    expect(screen.getByTestId('spider-svg')).toBeInTheDocument();
    expect(screen.getByTestId('signal-polygon')).toBeInTheDocument();
    expect(screen.getByTestId('axis-confidence')).toBeInTheDocument();
    expect(screen.getByTestId('axis-evidence')).toBeInTheDocument();
    expect(screen.getByTestId('axis-trust')).toBeInTheDocument();
    expect(screen.getByTestId('axis-ethics')).toBeInTheDocument();
    expect(screen.getByTestId('axis-runtime')).toBeInTheDocument();
  });

  test('buildDimensions returns 5 dimensions with values in [0,1]', () => {
    const dims = buildDimensions(makeSignal());
    expect(dims).toHaveLength(5);
    dims.forEach(d => {
      expect(d.value).toBeGreaterThanOrEqual(0);
      expect(d.value).toBeLessThanOrEqual(1);
    });
  });

  test('buildDimensions confidence dimension normalized to CONFIDENCE_HARD_CAP', () => {
    const dims = buildDimensions(makeSignal({ confidence: 0.92 }));
    const conf = dims.find(d => d.key === 'confidence')!;
    expect(conf.value).toBeCloseTo(1.0);
  });

  test('buildDimensions ethics dimension reflects all-pass as 1.0', () => {
    const dims = buildDimensions(makeSignal());
    const ethics = dims.find(d => d.key === 'ethics')!;
    expect(ethics.value).toBeCloseTo(1.0);
  });
});

describe('TopologyLegend', () => {
  test('renders 5 posture entries', () => {
    render(<TopologyLegend />);
    expect(screen.getByTestId('topology-legend')).toBeInTheDocument();
    expect(screen.getByTestId('legend-posture-strong')).toBeInTheDocument();
    expect(screen.getByTestId('legend-posture-moderate')).toBeInTheDocument();
    expect(screen.getByTestId('legend-posture-weak')).toBeInTheDocument();
    expect(screen.getByTestId('legend-posture-suppressed')).toBeInTheDocument();
    expect(screen.getByTestId('legend-posture-escalated')).toBeInTheDocument();
  });
});

describe('TopologyTooltip', () => {
  test('renders null when no dimension', () => {
    const { container } = render(<TopologyTooltip dimension={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders dimension label and explanation when provided', () => {
    const dim = { key: 'confidence', label: 'Confidence', value: 0.87, raw: 0.87, unit: '%' };
    render(<TopologyTooltip dimension={dim} />);
    expect(screen.getByTestId('topology-tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('topology-tooltip').textContent).toContain('Confidence');
  });
});
