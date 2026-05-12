// src/components/reporting/TopologyTooltip.tsx
// CC_SCOUT_21 — Topology Tooltip.
// Show dimension details on hover/tap (on-demand).

import React from 'react';
import type { TopologyDimension } from './SpiderTopology';

// ─── Dimension explanations ───────────────────────────────────────────────────

const DIMENSION_EXPLANATIONS: Record<string, string> = {
  confidence: 'How certain the system is. Capped at 0.92 by governance. Higher = more credible.',
  evidence:   'How much supporting evidence exists. Normalised 0–10 items to 0–100%.',
  trust:      'How trusted the signal source is. Set at ingestion; reflects source reliability.',
  ethics:     'Ethics gate health (safety + delight + harmony). 100% = all 3 pass.',
  runtime:    'Whether the signal has an active runtime state. Idle = no action in progress.',
};

// ─── Main component ───────────────────────────────────────────────────────────

interface TopologyTooltipProps {
  dimension: TopologyDimension | null;
  style?:    React.CSSProperties;
}

export const TopologyTooltip: React.FC<TopologyTooltipProps> = ({ dimension, style }) => {
  if (!dimension) return null;

  const explanation = DIMENSION_EXPLANATIONS[dimension.key] ?? 'Dimension detail.';
  const pct = Math.round(dimension.value * 100);
  const raw =
    dimension.key === 'confidence' ? `${Math.round(dimension.raw * 100)}%` :
    dimension.key === 'trust'      ? `${Math.round(dimension.raw * 100)}%` :
    `${dimension.raw}${dimension.unit}`;

  return (
    <div
      className="topology-tooltip"
      data-testid="topology-tooltip"
      style={{
        background: '#0d1e2d',
        border: '1px solid rgba(8,145,178,0.35)',
        borderRadius: '6px',
        padding: '8px 12px',
        fontSize: '11px',
        color: '#d1d5db',
        maxWidth: '240px',
        ...style,
      }}
    >
      <div style={{ fontWeight: 700, color: '#7dd3fc', marginBottom: '4px', fontSize: '12px' }}>
        {dimension.label}: {pct}%
      </div>
      <div style={{ color: '#9ca3af', marginBottom: '4px' }}>
        Raw value: {raw}
      </div>
      <div style={{ color: '#6b7280', lineHeight: '1.5' }}>
        {explanation}
      </div>
    </div>
  );
};
