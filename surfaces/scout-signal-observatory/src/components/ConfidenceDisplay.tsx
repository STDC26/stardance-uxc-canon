// src/components/ConfidenceDisplay.tsx
// CC_SCOUT_19 — Confidence display with cap note and baseline reference.
// Shows current confidence, cap note if clamped to 0.92, and baselineConfidence.

import React from 'react';
import { CONFIDENCE_HARD_CAP } from '../logic/confidence-gates';
import type { ConfidenceSnapshot } from '../api/SignalIntakeAdapter';

interface ConfidenceDisplayProps {
  confidence:         number;
  baselineConfidence: number;
  capApplied:         boolean;
  cappedAtIntake?:    boolean;
  confidenceHistory?: ConfidenceSnapshot[];
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export const ConfidenceDisplay: React.FC<ConfidenceDisplayProps> = ({
  confidence,
  baselineConfidence,
  capApplied,
  cappedAtIntake,
  confidenceHistory,
}) => {
  const atCap = confidence >= CONFIDENCE_HARD_CAP;
  const showCapNote = capApplied || cappedAtIntake;

  return (
    <div
      className="confidence-display"
      data-testid="confidence-display"
      style={{ fontSize: '13px', color: '#d1d5db' }}
    >
      {/* Current confidence */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontWeight: 600, fontSize: '18px', color: atCap ? '#f59e0b' : '#10b981' }}>
          {pct(confidence)}
        </span>
        {showCapNote && (
          <span
            className="cap-note"
            data-testid="cap-note"
            style={{ fontSize: '11px', color: '#f59e0b', background: 'rgba(245,158,11,0.10)', borderRadius: '4px', padding: '1px 6px' }}
          >
            Capped at 0.92
          </span>
        )}
      </div>

      {/* Baseline reference */}
      <div style={{ fontSize: '11px', color: '#6b7280' }}>
        Baseline: <span data-testid="baseline-confidence" style={{ color: '#9ca3af' }}>{pct(baselineConfidence)}</span>
        <span style={{ marginLeft: '6px', color: '#374151' }}>· immutable</span>
      </div>

      {/* History trend — last 3 snapshots */}
      {confidenceHistory && confidenceHistory.length > 1 && (
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#4b5563' }}>
          {confidenceHistory.slice(-3).map((s, i) => (
            <span key={i} style={{ marginRight: '8px' }}>
              {pct(s.confidence)}
              <span style={{ color: '#374151', marginLeft: '3px' }}>({s.reason})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
