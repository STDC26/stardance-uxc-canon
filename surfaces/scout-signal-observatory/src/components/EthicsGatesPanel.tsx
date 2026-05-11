// src/components/EthicsGatesPanel.tsx
// CC_SCOUT_19 — Ethics Gates Panel with rationale display.
// Renders each gate's passed status and reason string from EthicsGatesWithRationale.

import React from 'react';
import type { EthicsGatesWithRationale } from '../ingestion/normalization-pipeline';

interface EthicsGatesPanelProps {
  ethicsGates: EthicsGatesWithRationale;
}

interface GateRowProps {
  name: string;
  passed: boolean;
  reason: string;
}

const GateRow: React.FC<GateRowProps> = ({ name, passed, reason }) => (
  <div
    className="ethics-gate-row"
    data-gate={name}
    data-passed={String(passed)}
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      padding: '5px 0',
      fontSize: '12px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}
  >
    <span style={{ color: passed ? '#10b981' : '#ef4444', flexShrink: 0, marginTop: '1px' }}>
      {passed ? '✓' : '✕'}
    </span>
    <div>
      <span style={{ color: '#d1d5db', fontWeight: 500 }}>{name}</span>
      <span
        className="gate-reason"
        data-testid={`gate-reason-${name}`}
        style={{
          marginLeft: '8px',
          fontSize: '11px',
          color: passed ? '#4b5563' : '#f59e0b',
        }}
      >
        {reason}
      </span>
    </div>
  </div>
);

export const EthicsGatesPanel: React.FC<EthicsGatesPanelProps> = ({ ethicsGates }) => {
  const allPass = ethicsGates.safety.passed && ethicsGates.delight.passed && ethicsGates.harmony.passed;

  return (
    <div
      className="ethics-gates-panel"
      data-testid="ethics-gates-panel"
      data-all-pass={String(allPass)}
      style={{
        borderLeft: `3px solid ${allPass ? '#10b981' : '#ef4444'}`,
        paddingLeft: '10px',
      }}
    >
      <div style={{
        fontSize: '11px',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: '6px',
      }}>
        Ethics Gates
      </div>

      <GateRow name="safety"  passed={ethicsGates.safety.passed}  reason={ethicsGates.safety.reason} />
      <GateRow name="delight" passed={ethicsGates.delight.passed} reason={ethicsGates.delight.reason} />
      <GateRow name="harmony" passed={ethicsGates.harmony.passed} reason={ethicsGates.harmony.reason} />

      {allPass && (
        <div
          data-testid="all-gates-pass-confirmation"
          style={{ marginTop: '6px', fontSize: '11px', color: '#10b981' }}
        >
          All gates cleared — operator actions enabled
        </div>
      )}
    </div>
  );
};
