// src/components/reporting/OperatorActionSummary.tsx
// CC_SCOUT_20 — Operator Action Summary.
// Confirmation of last action + undo option.

import React, { useEffect, useState } from 'react';
import type { GoverneAction } from '../../types/Decision';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionSummaryState {
  status:    'success' | 'error';
  action:    GoverneAction;
  message:   string;
  timestamp: string;
  reversible: boolean;
}

interface OperatorActionSummaryProps {
  summary:    ActionSummaryState | null;
  onUndo?:    () => void;
  autoDismissMs?: number;   // default 5000, 0 = no auto-dismiss
  onDismiss?: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export const OperatorActionSummary: React.FC<OperatorActionSummaryProps> = ({
  summary,
  onUndo,
  autoDismissMs = 5000,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    if (!summary || autoDismissMs === 0) return;
    const id = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, autoDismissMs);
    return () => clearTimeout(id);
  }, [summary, autoDismissMs, onDismiss]);

  if (!summary || !visible) return null;

  const isSuccess = summary.status === 'success';
  const borderColor = isSuccess ? '#10b981' : '#ef4444';
  const bgColor     = isSuccess ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)';
  const iconColor   = isSuccess ? '#10b981' : '#ef4444';

  return (
    <div
      className="operator-action-summary"
      data-testid="operator-action-summary"
      style={{ padding: '12px 16px', background: bgColor, border: `1px solid ${borderColor}44`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ color: iconColor, fontSize: '16px' }}>{isSuccess ? '✓' : '✗'}</span>
        <div>
          <div data-testid="action-summary-message" style={{ fontSize: '13px', color: '#e0f0f8', fontWeight: 600 }}>
            {summary.message}
          </div>
          <div style={{ fontSize: '10px', color: '#4a6070', marginTop: '2px' }}>
            {summary.action.replace(/_/g, ' ')} · {new Date(summary.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {summary.reversible && onUndo && (
          <button
            data-testid="undo-button"
            onClick={onUndo}
            style={{ fontSize: '11px', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Undo
          </button>
        )}
        <button
          data-testid="dismiss-button"
          onClick={() => { setVisible(false); onDismiss?.(); }}
          style={{ fontSize: '11px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontFamily: 'inherit' }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};
