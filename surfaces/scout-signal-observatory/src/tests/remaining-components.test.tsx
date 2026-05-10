// CC_SCOUT_09 — remaining-components.test.tsx
// Tests for: EthicsGate, EvidencePanel, InterpretationBlock,
//            OperatorActionBar, SignalCard, SignalTimeline, TrustRail

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EthicsGate } from '../components/EthicsGate';
import { EvidencePanel } from '../components/EvidencePanel';
import { InterpretationBlock } from '../components/InterpretationBlock';
import { OperatorActionBar } from '../components/OperatorActionBar';
import { SignalCard } from '../components/SignalCard';
import { SignalTimeline } from '../components/SignalTimeline';
import { TrustRail } from '../components/TrustRail';
import { EvidenceTrace } from '../types/Evidence';

// --- EthicsGate ---
describe('EthicsGate', () => {
  test('renders all three gates and shows pass when all true', () => {
    render(React.createElement(EthicsGate, { safetyStatus: true, delightStatus: true, harmonyStatus: true }));
    expect(screen.getByText('Safety')).toBeInTheDocument();
    expect(screen.getByText('Delight')).toBeInTheDocument();
    expect(screen.getByText('Harmony')).toBeInTheDocument();
  });

  test('shows override button when any gate fails', () => {
    const onOverride = jest.fn();
    render(React.createElement(EthicsGate, {
      safetyStatus: false,
      delightStatus: true,
      harmonyStatus: true,
      onOverride,
    }));
    const btn = screen.getByText(/Override/i);
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onOverride).toHaveBeenCalledTimes(1);
  });

  test('does not show override button when all gates pass', () => {
    render(React.createElement(EthicsGate, { safetyStatus: true, delightStatus: true, harmonyStatus: true }));
    expect(screen.queryByText(/Override/i)).not.toBeInTheDocument();
  });
});

// --- EvidencePanel ---
describe('EvidencePanel', () => {
  const mockTrace: EvidenceTrace = {
    sources: [
      { id: 'src-1', name: 'Pattern Matcher', confidence: 0.82, description: 'Pattern analysis' },
      { id: 'src-2', name: 'Baseline Comparator', confidence: 0.87, description: 'Baseline diff' },
    ],
    signalsUsed: ['src-1', 'src-2'],
    sourceCount: 2,
    canonApplied: ['stardance-canon-v3.0'],
  };

  test('renders source count and source names', () => {
    render(React.createElement(EvidencePanel, { evidence: mockTrace }));
    expect(screen.getByText(/Evidence \(2 sources\)/i)).toBeInTheDocument();
    expect(screen.getByText('Pattern Matcher')).toBeInTheDocument();
    expect(screen.getByText('Baseline Comparator')).toBeInTheDocument();
  });

  test('renders canon applied when present', () => {
    render(React.createElement(EvidencePanel, { evidence: mockTrace }));
    expect(screen.getByText(/stardance-canon-v3.0/i)).toBeInTheDocument();
  });

  test('renders singular "source" for count of 1', () => {
    const singleSource: EvidenceTrace = {
      ...mockTrace,
      sources: [mockTrace.sources[0]],
      sourceCount: 1,
    };
    render(React.createElement(EvidencePanel, { evidence: singleSource }));
    expect(screen.getByText(/Evidence \(1 source\)/i)).toBeInTheDocument();
  });
});

// --- InterpretationBlock (RC-02) ---
describe('InterpretationBlock', () => {
  const mockTrace: EvidenceTrace = {
    sources: [],
    signalsUsed: [],
    sourceCount: 2,
    canonApplied: [],
  };

  test('renders signal type and meaning', () => {
    render(React.createElement(InterpretationBlock, {
      signalType: 'Anomalous Signal',
      meaning: 'An unusual pattern deviates from baseline.',
      confidence: 0.87,
      evidence: mockTrace,
    }));
    expect(screen.getByText('Anomalous Signal')).toBeInTheDocument();
    expect(screen.getByText('An unusual pattern deviates from baseline.')).toBeInTheDocument();
  });

  test('renders confidence percentage', () => {
    render(React.createElement(InterpretationBlock, {
      signalType: 'Pattern Signal',
      meaning: 'Recurring pattern identified.',
      confidence: 0.88,
      evidence: mockTrace,
    }));
    expect(screen.getByText(/88%/)).toBeInTheDocument();
  });
});

// --- OperatorActionBar ---
describe('OperatorActionBar', () => {
  test('renders Reset button', () => {
    const onReset = jest.fn();
    render(React.createElement(OperatorActionBar, { imsState: 'complete', onReset }));
    const btn = screen.getByText('Reset');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  test('shows Retry button in failed state', () => {
    const onRetry = jest.fn();
    render(React.createElement(OperatorActionBar, { imsState: 'failed', onReset: jest.fn(), onRetry }));
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('shows Retry button in partial_complete state', () => {
    render(React.createElement(OperatorActionBar, { imsState: 'partial_complete', onReset: jest.fn(), onRetry: jest.fn() }));
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('does not show Retry button in complete state', () => {
    render(React.createElement(OperatorActionBar, { imsState: 'complete', onReset: jest.fn() }));
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });
});

// --- SignalCard ---
describe('SignalCard', () => {
  test('renders raw signal text and state indicator', () => {
    render(React.createElement(SignalCard, {
      raw: 'anomaly detected sector 7',
      imsState: 'complete',
    }));
    expect(screen.getByText('anomaly detected sector 7')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  test('renders classification label when provided', () => {
    render(React.createElement(SignalCard, {
      raw: 'anomaly detected sector 7',
      imsState: 'complete',
      classification: {
        type: 'anomaly',
        label: 'Anomalous Signal',
        confidence: 0.82,
        factors: ['Keyword match: anomaly'],
        isNovel: false,
      },
    }));
    expect(screen.getByText(/Anomalous Signal/)).toBeInTheDocument();
    expect(screen.getByText(/82%/)).toBeInTheDocument();
  });
});

// --- SignalTimeline ---
describe('SignalTimeline', () => {
  test('renders empty state message when no history', () => {
    render(React.createElement(SignalTimeline, { history: [] }));
    expect(screen.getByText('No signal history')).toBeInTheDocument();
  });

  test('renders history entries', () => {
    const ts = Date.now();
    render(React.createElement(SignalTimeline, {
      history: [
        { timestamp: ts, label: 'Anomaly detected', type: 'anomaly' },
      ],
    }));
    expect(screen.getByText('Anomaly detected')).toBeInTheDocument();
    expect(screen.getByText('[anomaly]')).toBeInTheDocument();
  });
});

// --- TrustRail ---
describe('TrustRail', () => {
  test('renders trust score percentage', () => {
    render(React.createElement(TrustRail, { trust: { score: 0.75, factors: [], decayActive: false } }));
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.queryByText(/decay active/i)).not.toBeInTheDocument();
  });

  test('shows decay warning when decayActive is true', () => {
    render(React.createElement(TrustRail, { trust: { score: 0.4, factors: [], decayActive: true } }));
    expect(screen.getByText(/Trust decay active/i)).toBeInTheDocument();
  });
});
