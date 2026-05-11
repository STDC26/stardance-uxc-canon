// CC_SCOUT_09 — cqx-rendering.test.ts
// 8 tests: 5 CQX elements render, RC-02 meaning≠action separation, locked order
// React Testing Library

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CQXSequence } from '../components/CQXSequence';
import type { CQXCanonical } from '../ingestion/cqx-generator';

// v1.0.1 canonical shape — strengthAndRisk replaces strengthRisk
const mockCQX: CQXCanonical = {
  context: 'Operational signal in monitored sector 7.',
  outcome: 'Anomalous signal — baseline deviation +3.2σ.',
  meaning: 'An unusual pattern deviates from baseline operational behaviour.',
  strengthAndRisk: {
    confidence: 0.87,
    riskAssessment: 'Elevated — deviation may indicate system or environmental change',
  },
  action: 'Escalate for immediate investigation',
};

const noop = () => {};

describe('CQXSequence — RC-01/RC-02 enforcement', () => {
  test('Element 1 (Context) renders with correct content', () => {
    render(<CQXSequence cqx={mockCQX} imsState="complete" onAction={noop} />);
    expect(screen.getByText(/1 · Context/i)).toBeInTheDocument();
    expect(screen.getByText(mockCQX.context)).toBeInTheDocument();
  });

  test('Element 2 (Outcome / What\'s Happening) renders', () => {
    render(<CQXSequence cqx={mockCQX} imsState="complete" onAction={noop} />);
    expect(screen.getByText(/2 · What's Happening/i)).toBeInTheDocument();
    expect(screen.getByText(mockCQX.outcome)).toBeInTheDocument();
  });

  test('Element 3 (Meaning / What It Means) renders — RC-02: meaning only', () => {
    render(<CQXSequence cqx={mockCQX} imsState="complete" onAction={noop} />);
    expect(screen.getByText(/3 · What It Means/i)).toBeInTheDocument();
    expect(screen.getByText(mockCQX.meaning)).toBeInTheDocument();
  });

  test('Element 4 (Strength & Risk / How Strong Is This) renders', () => {
    render(<CQXSequence cqx={mockCQX} imsState="complete" onAction={noop} />);
    expect(screen.getByText(/4 · How Strong Is This/i)).toBeInTheDocument();
  });

  test('Element 5 (Action / What You Should Do) renders — RC-02: distinct from meaning', () => {
    render(<CQXSequence cqx={mockCQX} imsState="complete" onAction={noop} />);
    expect(screen.getByText(/5 · What You Should Do/i)).toBeInTheDocument();
    expect(screen.getByText(mockCQX.action)).toBeInTheDocument();
  });

  test('RC-02: meaning text does not appear in action element, action text not in meaning element', () => {
    const { container } = render(<CQXSequence cqx={mockCQX} imsState="complete" onAction={noop} />);
    const meaningEl = container.querySelector('.cqx-meaning');
    const actionEl = container.querySelector('.cqx-action');
    expect(meaningEl).toBeInTheDocument();
    expect(actionEl).toBeInTheDocument();
    expect(meaningEl?.textContent).toContain(mockCQX.meaning);
    expect(meaningEl?.textContent).not.toContain(mockCQX.action);
    expect(actionEl?.textContent).not.toContain(mockCQX.meaning);
  });

  test('CQX sequence has data-rc02-enforced attribute', () => {
    const { container } = render(<CQXSequence cqx={mockCQX} imsState="complete" onAction={noop} />);
    const seq = container.querySelector('.cqx-sequence');
    expect(seq).toHaveAttribute('data-rc02-enforced', 'true');
  });

  test('Elements render in locked order: 1→2→3→4→5', () => {
    const { container } = render(<CQXSequence cqx={mockCQX} imsState="complete" onAction={noop} />);
    const elements = container.querySelectorAll('.cqx-element');
    expect(elements.length).toBe(5);
    expect(elements[0].classList.contains('cqx-context')).toBe(true);
    expect(elements[1].classList.contains('cqx-outcome')).toBe(true);
    expect(elements[2].classList.contains('cqx-meaning')).toBe(true);
    expect(elements[3].classList.contains('cqx-strength')).toBe(true);
    expect(elements[4].classList.contains('cqx-action')).toBe(true);
  });
});
