import React from 'react';
import { TrustState } from '../logic/trust-model';

interface TrustRailProps {
  trust: TrustState;
}

export const TrustRail: React.FC<TrustRailProps> = ({ trust }) => {
  const pct = Math.round(trust.score * 100);
  return (
    <div className="trust-rail" style={{ fontSize: '12px', color: '#9ca3af' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span>Trust</span>
        <span style={{ color: '#e5e7eb' }}>{pct}%</span>
      </div>
      <div style={{ background: '#1f2937', borderRadius: '3px', height: '3px' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#3b82f6', borderRadius: '3px' }} />
      </div>
      {trust.decayActive && (
        <div style={{ marginTop: '4px', color: '#f59e0b', fontSize: '11px' }}>⚠ Trust decay active</div>
      )}
    </div>
  );
};
