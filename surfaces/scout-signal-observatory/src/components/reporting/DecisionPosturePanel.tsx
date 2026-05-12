// src/components/reporting/DecisionPosturePanel.tsx
// CC_SCOUT_20 — Decision Posture Panel.
// Recommended action + action buttons (≤15 seconds to decision path).

import React, { useState } from 'react';
import type { StoredSignal } from '../../persistence/signal-store';
import type { GoverneAction } from '../../types/Decision';
import type { IMSState } from '../../types/IMS';

// ─── Recommendation logic ─────────────────────────────────────────────────────

export interface ActionRecommendation {
  action:    GoverneAction;
  rationale: string;
  nextHint:  string;
}

export function deriveRecommendation(signal: StoredSignal): ActionRecommendation {
  const imsState = signal.imsState as IMSState;

  if (imsState === 'escalated_pending_approval') {
    return {
      action:    'escalate',
      rationale: 'Signal is escalated and awaiting operator approval.',
      nextHint:  'Review escalation details and confirm or override.',
    };
  }
  if (imsState === 'suppressed_with_memory') {
    return {
      action:    'suppress',
      rationale: 'Signal has been suppressed with memory.',
      nextHint:  'Review suppression reason. Override if needed.',
    };
  }

  const gates = signal.ethicsGates as unknown as Record<string, { passed: boolean }>;
  const safetyPass = gates?.safety?.passed !== false;
  if (!safetyPass) {
    return {
      action:    'investigate',
      rationale: 'Safety ethics gate is not passing — escalation blocked.',
      nextHint:  'Review ethics gate failure before taking action.',
    };
  }

  if (signal.confidence >= 0.75) {
    return {
      action:    'escalate',
      rationale: `High confidence (${Math.round(signal.confidence * 100)}%) — signal is credible and actionable.`,
      nextHint:  'Escalate for immediate investigation and response.',
    };
  }
  if (signal.confidence >= 0.50) {
    return {
      action:    'investigate',
      rationale: `Moderate confidence (${Math.round(signal.confidence * 100)}%) — signal warrants investigation.`,
      nextHint:  'Investigate to gather more evidence before escalation.',
    };
  }
  return {
    action:    'watch',
    rationale: `Low confidence (${Math.round(signal.confidence * 100)}%) — signal needs more evidence.`,
    nextHint:  'Continue monitoring. Collect more evidence.',
  };
}

// ─── Action buttons ───────────────────────────────────────────────────────────

const ACTIONS: Array<{ id: GoverneAction; label: string; color: string }> = [
  { id: 'escalate',           label: 'Escalate',       color: '#8b5cf6' },
  { id: 'investigate',        label: 'Investigate',    color: '#0891b2' },
  { id: 'suppress',           label: 'Suppress',       color: '#6b7280' },
  { id: 'trigger_research',   label: 'Research',       color: '#f59e0b' },
  { id: 'mark_learning_signal', label: 'Mark Learning', color: '#10b981' },
];

// ─── Main component ───────────────────────────────────────────────────────────

interface DecisionPosturePanelProps {
  signal:   StoredSignal;
  onAction: (action: GoverneAction) => Promise<void> | void;
}

export const DecisionPosturePanel: React.FC<DecisionPosturePanelProps> = ({ signal, onAction }) => {
  const [loading, setLoading] = useState<GoverneAction | null>(null);
  const rec = deriveRecommendation(signal);

  const handleAction = async (action: GoverneAction) => {
    setLoading(action);
    try {
      await onAction(action);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className="decision-posture-panel"
      data-testid="decision-posture-panel"
      style={{ padding: '16px 20px', background: '#0d1e2d', borderRadius: '8px', border: '1px solid rgba(8,145,178,0.2)' }}
    >
      {/* Recommendation */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', color: '#4a6070', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
          Recommended Action
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
          <span
            data-testid="recommended-action"
            style={{ fontSize: '15px', fontWeight: 700, color: '#e0f0f8', textTransform: 'capitalize' }}
          >
            {rec.action.replace(/_/g, ' ')}
          </span>
          <span style={{ fontSize: '12px', color: '#7090a0' }}>{rec.rationale}</span>
        </div>
        <div
          data-testid="next-step-hint"
          style={{ marginTop: '6px', fontSize: '11px', color: '#0891b2', background: 'rgba(8,145,178,0.07)', borderRadius: '4px', padding: '4px 8px' }}
        >
          → {rec.nextHint}
        </div>
      </div>

      {/* Action buttons */}
      <div
        data-testid="action-buttons"
        style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
      >
        {ACTIONS.map(({ id, label, color }) => (
          <button
            key={id}
            data-testid={`action-btn-${id}`}
            onClick={() => handleAction(id)}
            disabled={loading !== null}
            style={{
              background: loading === id ? `${color}55` : `${color}22`,
              border: `1px solid ${color}55`,
              borderRadius: '6px',
              color: loading === id ? '#fff' : color,
              fontSize: '12px',
              fontWeight: 600,
              padding: '6px 14px',
              cursor: loading !== null ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: loading !== null && loading !== id ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            {loading === id ? '…' : label}
          </button>
        ))}
      </div>
    </div>
  );
};
