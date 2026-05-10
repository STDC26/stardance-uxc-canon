import React from 'react';
import { IMSState } from '../types/IMS';
import { ConfidenceGates } from '../logic/confidence-gates';
import { GoverneAction } from '../types/Decision';

interface ActionPanelProps {
  imsState: IMSState;
  confidence: number;
  onAction: (action: GoverneAction) => void;
}

const gates = new ConfidenceGates();

const ACTIONS: Array<{ id: GoverneAction; label: string; requiresConfirm: boolean }> = [
  { id: 'escalate',               label: 'Escalate',             requiresConfirm: true },
  { id: 'investigate',            label: 'Investigate',          requiresConfirm: false },
  { id: 'suppress',               label: 'Suppress',             requiresConfirm: true },
  { id: 'export',                 label: 'Export',               requiresConfirm: false },
  { id: 'trigger_research',       label: 'Trigger Research',     requiresConfirm: false },
  { id: 'mark_learning_signal',   label: 'Mark as Learning',     requiresConfirm: false },
];

export const ActionPanel: React.FC<ActionPanelProps> = ({ imsState, confidence, onAction }) => {
  const actionsEnabled = imsState === 'complete' || imsState === 'partial_complete';

  if (!actionsEnabled) return null;

  return (
    <div className="action-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
      {ACTIONS.map(({ id, label }) => {
        const allowed = gates.canExecuteAction(id, confidence);
        return (
          <button
            key={id}
            onClick={() => allowed && onAction(id)}
            disabled={!allowed}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '5px',
              border: `1px solid ${allowed ? '#30ABCA' : '#374151'}`,
              background: allowed ? 'rgba(8,145,178,0.1)' : 'transparent',
              color: allowed ? '#30ABCA' : '#6b7280',
              cursor: allowed ? 'pointer' : 'not-allowed',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};
