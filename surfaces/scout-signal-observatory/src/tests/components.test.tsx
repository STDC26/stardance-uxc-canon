// CC_SCOUT_09 — components.test.ts
// 8 tests: component existence, structure, and key contracts

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StateIndicator } from '../components/StateIndicator';
import { ConfidenceBand } from '../components/ConfidenceBand';
import { OrbitHeader } from '../components/OrbitHeader';
import { EvidencePanel } from '../components/EvidencePanel';
import { ActionPanel } from '../components/ActionPanel';
import { EthicsGate } from '../components/EthicsGate';

describe('StateIndicator', () => {
  test('renders state label and data-ims-state attribute', () => {
    const { container } = render(React.createElement(StateIndicator, { imsState: 'idle' }));
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(container.querySelector('[data-ims-state="idle"]')).toBeInTheDocument();
  });

  test('renders all 6 states without throwing', () => {
    const states = ['idle', 'validating', 'processing', 'complete', 'partial_complete', 'failed'] as const;
    states.forEach(state => {
      const { unmount } = render(React.createElement(StateIndicator, { imsState: state }));
      unmount();
    });
  });
});

describe('ConfidenceBand', () => {
  test('renders HIGH band with correct percentage', () => {
    const { container } = render(React.createElement(ConfidenceBand, { confidence: 0.87 }));
    expect(container.querySelector('[data-band="HIGH"]')).toBeInTheDocument();
    expect(screen.getByText(/87%/)).toBeInTheDocument();
  });

  test('renders hard cap warning when confidence >= 0.92', () => {
    render(React.createElement(ConfidenceBand, { confidence: 0.95 }));
    expect(screen.getByText(/0\.92 hard cap enforced/i)).toBeInTheDocument();
  });

  test('renders MEDIUM band for confidence in 0.45-0.74 range', () => {
    const { container } = render(React.createElement(ConfidenceBand, { confidence: 0.55 }));
    expect(container.querySelector('[data-band="MEDIUM"]')).toBeInTheDocument();
  });
});

describe('OrbitHeader', () => {
  test('shows signal_sense label when IMS state is complete', () => {
    const { container } = render(React.createElement(OrbitHeader, { imsState: 'complete' }));
    expect(container.querySelector('[data-orbit-state="signal_sense"]')).toBeInTheDocument();
    expect(screen.getByText('Signal Sense Active')).toBeInTheDocument();
  });

  test('shows idle label and inactive state when IMS state is idle', () => {
    const { container } = render(React.createElement(OrbitHeader, { imsState: 'idle' }));
    expect(container.querySelector('[data-orbit-state="idle"]')).toBeInTheDocument();
    expect(screen.getByText('Signal Observatory')).toBeInTheDocument();
  });

  test('OrbitFrame version attribute is set on orbit-header', () => {
    const { container } = render(React.createElement(OrbitHeader, { imsState: 'idle' }));
    expect(container.querySelector('[data-orbitframe="OrbitFrame v0.1"]')).toBeInTheDocument();
  });
});
