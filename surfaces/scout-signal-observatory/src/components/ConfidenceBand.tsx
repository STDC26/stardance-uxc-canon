import React from 'react';
import { ConfidenceGates, ConfidenceBandLevel, CONFIDENCE_HARD_CAP } from '../logic/confidence-gates';

interface ConfidenceBandProps {
  confidence: number;
  factors?: Array<{ label: string; value: number }>;
  risks?: string;
}

const gates = new ConfidenceGates();

const BAND_STYLES: Record<ConfidenceBandLevel, { bg: string; text: string }> = {
  HIGH:   { bg: '#064e3b', text: '#10b981' },
  MEDIUM: { bg: '#451a03', text: '#f59e0b' },
  LOW:    { bg: '#450a0a', text: '#ef4444' },
};

export const ConfidenceBand: React.FC<ConfidenceBandProps> = ({ confidence, factors, risks }) => {
  const capped = Math.min(confidence, CONFIDENCE_HARD_CAP);
  const band = gates.getBand(capped);
  const styles = BAND_STYLES[band];
  const pct = Math.round(capped * 100);

  return (
    <div
      className="confidence-band"
      data-band={band}
      style={{ background: styles.bg, borderRadius: '6px', padding: '10px 14px' }}
    >
      <div style={{ color: styles.text, fontWeight: 600, fontSize: '14px' }}>
        {pct}% — {band}
      </div>
      <div style={{ background: '#1f2937', borderRadius: '3px', height: '4px', margin: '6px 0' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: styles.text, borderRadius: '3px' }} />
      </div>
      {capped >= CONFIDENCE_HARD_CAP && (
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>⚠ 0.92 hard cap enforced</div>
      )}
      {risks && <div style={{ fontSize: '12px', color: '#d1d5db', marginTop: '4px' }}>Risk: {risks}</div>}
      {factors && factors.length > 0 && (
        <ul style={{ margin: '6px 0 0', padding: '0 0 0 16px', fontSize: '12px', color: '#9ca3af' }}>
          {factors.map((f, i) => (
            <li key={i}>{f.label}: {Math.round(f.value * 100)}%</li>
          ))}
        </ul>
      )}
    </div>
  );
};
