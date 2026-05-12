// src/components/reporting/ConfidenceEvolutionPanel.tsx
// CC_SCOUT_20 — Confidence Evolution Panel.
// Show confidence journey + why it changed (≤30 seconds to understanding).
// Narrative first, details on demand.

import React, { useState } from 'react';
import type { StoredSignal } from '../../persistence/signal-store';
import type { ConfidenceSnapshot } from '../../api/SignalIntakeAdapter';
import { CONFIDENCE_HARD_CAP } from '../../logic/confidence-gates';

// ─── Narrative builder ────────────────────────────────────────────────────────

export function buildConfidenceNarrative(
  history: ConfidenceSnapshot[],
  cappedAtIntake: boolean,
  currentConfidence: number
): string {
  if (history.length === 0) {
    return `Current confidence: ${Math.round(currentConfidence * 100)}%.`;
  }

  const first  = history[0];
  const nonCap = history.filter(h => h.source !== 'intake_cap');
  const start  = nonCap[0] ?? first;
  const pct    = (v: number) => `${Math.round(v * 100)}%`;

  let narrative = `Signal ingested at ${pct(start.confidence)}.`;

  if (nonCap.length > 1) {
    const last  = nonCap[nonCap.length - 1];
    const delta = last.confidence - start.confidence;
    if (Math.abs(delta) >= 0.01) {
      const dir = delta > 0 ? 'increased' : 'decreased';
      narrative += ` Confidence ${dir} ${pct(Math.abs(delta))} since ingestion.`;
    }
  }

  narrative += ` Current: ${pct(currentConfidence)}.`;

  if (cappedAtIntake) {
    narrative += ` (Raw input was higher; capped at ${pct(CONFIDENCE_HARD_CAP)} by governance.)`;
  }

  return narrative;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ConfidenceBar: React.FC<{ value: number; baseline: number }> = ({ value, baseline }) => {
  const pct = Math.round(Math.min(value, 1) * 100);
  const bpct = Math.round(Math.min(baseline, 1) * 100);
  const color = value >= 0.75 ? '#10b981' : value >= 0.50 ? '#f59e0b' : '#ef4444';

  return (
    <div data-testid="confidence-bar" style={{ marginBottom: '10px' }}>
      <div style={{ height: '8px', background: '#1a2e40', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.3s' }} />
        {/* Baseline marker */}
        <div style={{ position: 'absolute', top: 0, left: `${bpct}%`, height: '100%', width: '2px', background: 'rgba(255,255,255,0.3)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#4a6070', marginTop: '3px' }}>
        <span>0%</span>
        <span style={{ color }}>{pct}% current</span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>baseline {bpct}%</span>
        <span>100%</span>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface ConfidenceEvolutionPanelProps {
  signal: StoredSignal;
}

export const ConfidenceEvolutionPanel: React.FC<ConfidenceEvolutionPanelProps> = ({ signal }) => {
  const [expanded, setExpanded] = useState(false);

  const history       = signal.confidenceHistory ?? [];
  const cappedAtIntake = signal.cappedAtIntake ?? false;
  const narrative     = buildConfidenceNarrative(history, cappedAtIntake, signal.confidence);

  return (
    <div
      className="confidence-evolution-panel"
      data-testid="confidence-evolution-panel"
      style={{ padding: '16px 20px', background: '#0d1e2d', borderRadius: '8px', border: '1px solid rgba(8,145,178,0.2)' }}
    >
      <div style={{ fontSize: '11px', color: '#4a6070', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
        Confidence Evolution
      </div>

      {/* Visual fill bar */}
      <ConfidenceBar value={signal.confidence} baseline={signal.baselineConfidence} />

      {/* Cap note */}
      {cappedAtIntake && (
        <div
          data-testid="evolution-cap-note"
          style={{ fontSize: '11px', color: '#f59e0b', background: 'rgba(245,158,11,0.08)', borderRadius: '4px', padding: '4px 8px', marginBottom: '8px' }}
        >
          Governance cap applied — raw confidence exceeded 0.92 hard cap at intake.
        </div>
      )}

      {/* Plain-English narrative */}
      <div
        data-testid="confidence-narrative"
        style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.6', marginBottom: '10px' }}
      >
        {narrative}
      </div>

      {/* Progressive disclosure: history details */}
      <button
        data-testid="toggle-history"
        onClick={() => setExpanded(e => !e)}
        style={{ fontSize: '11px', color: '#0891b2', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
      >
        {expanded ? '▾ Hide history' : `▸ Show history (${history.length} entries)`}
      </button>

      {expanded && (
        <div data-testid="history-details" style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {history.map((snap, i) => (
            <div key={i} style={{ fontSize: '11px', color: '#6b7280', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ color: '#9ca3af', fontFamily: 'monospace' }}>{new Date(snap.timestamp).toLocaleTimeString()}</span>
              <span style={{ color: '#10b981' }}>{Math.round(snap.confidence * 100)}%</span>
              <span style={{ color: '#4a6070' }}>[{snap.source}]</span>
              <span>{snap.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
