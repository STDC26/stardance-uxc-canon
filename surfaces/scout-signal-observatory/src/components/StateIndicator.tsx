import React from 'react';
import { IMSState } from '../types/IMS';

interface StateIndicatorProps {
  imsState: IMSState;
}

const STATE_CONFIG: Record<IMSState, { label: string; icon: string; color: string }> = {
  idle:             { label: 'Ready',          icon: '○', color: '#6b7280' },
  validating:       { label: 'Validating',     icon: '⟳', color: '#3b82f6' },
  processing:       { label: 'Processing',     icon: '◈', color: '#8b5cf6' },
  complete:         { label: 'Complete',       icon: '✓', color: '#10b981' },
  partial_complete: { label: 'Partial',        icon: '◑', color: '#f59e0b' },
  failed:           { label: 'Failed',         icon: '✕', color: '#ef4444' },
};

export const StateIndicator: React.FC<StateIndicatorProps> = ({ imsState }) => {
  const cfg = STATE_CONFIG[imsState];
  return (
    <div
      className="state-indicator"
      data-ims-state={imsState}
      style={{ color: cfg.color, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
    >
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </div>
  );
};
