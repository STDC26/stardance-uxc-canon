import React from 'react';
import { IMSState } from '../types/IMS';

interface StateIndicatorProps {
  imsState: IMSState;
}

const STATE_CONFIG: Record<IMSState, { label: string; icon: string; color: string }> = {
  idle:                        { label: 'Ready',            icon: '○', color: '#6b7280' },
  validating:                  { label: 'Validating',       icon: '⟳', color: '#3b82f6' },
  processing:                  { label: 'Processing',       icon: '◈', color: '#8b5cf6' },
  complete:                    { label: 'Complete',         icon: '✓', color: '#10b981' },
  partial_complete:            { label: 'Partial',          icon: '◑', color: '#f59e0b' },
  failed:                      { label: 'Failed',           icon: '✕', color: '#ef4444' },
  escalated_pending_approval:  { label: 'Escalated',        icon: '↑', color: '#f97316' },
  investigating:               { label: 'Investigating',    icon: '⌕', color: '#06b6d4' },
  suppressed_with_memory:      { label: 'Suppressed',       icon: '⊘', color: '#9ca3af' },
  researching:                 { label: 'Researching',      icon: '⊕', color: '#a855f7' },
  learning_event_recorded:     { label: 'Learning',         icon: '⊞', color: '#22d3ee' },
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
