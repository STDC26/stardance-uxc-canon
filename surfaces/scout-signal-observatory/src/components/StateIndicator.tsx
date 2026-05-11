import React from 'react';
import { IMSState } from '../types/IMS';

interface StateIndicatorProps {
  imsState: IMSState;
  runtimeState?: string;  // CC_SCOUT_19: optional split runtime state
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

export const StateIndicator: React.FC<StateIndicatorProps> = ({ imsState, runtimeState }) => {
  const cfg = STATE_CONFIG[imsState];
  const showRuntime = runtimeState && runtimeState !== 'none';
  return (
    <div
      className="state-indicator"
      data-ims-state={imsState}
      data-runtime-state={runtimeState ?? 'none'}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}
    >
      {/* IMS lifecycle state */}
      <span style={{ color: cfg.color, display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span>{cfg.icon}</span>
        <span>{cfg.label}</span>
      </span>
      {/* Runtime behavior state — shown only when not 'none' */}
      {showRuntime && (
        <span
          className="state-indicator-runtime"
          data-testid="runtime-state-badge"
          style={{ color: '#a855f7', fontSize: '11px', background: 'rgba(168,85,247,0.12)', borderRadius: '4px', padding: '2px 6px' }}
        >
          {runtimeState}
        </span>
      )}
    </div>
  );
};
