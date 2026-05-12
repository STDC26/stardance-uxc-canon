// src/components/reporting/TopologyLegend.tsx
// CC_SCOUT_21 — Topology Legend.
// Helps operator interpret spider shapes at a glance (5 postures).

import React from 'react';

// ─── Posture shapes ───────────────────────────────────────────────────────────

interface PostureShape {
  name:        string;
  color:       string;
  shape:       string;   // SVG polygon points (20x20 scale)
  description: string;   // ≤10 words
}

const POSTURE_SHAPES: PostureShape[] = [
  {
    name:        'strong',
    color:       '#10b981',
    shape:       '10,0 20,7 16,18 4,18 0,7',
    description: 'High confidence, full ethics, active runtime.',
  },
  {
    name:        'moderate',
    color:       '#f59e0b',
    shape:       '10,3 17,8 14,16 6,16 3,8',
    description: 'Moderate confidence, investigate before escalation.',
  },
  {
    name:        'weak',
    color:       '#ef4444',
    shape:       '10,6 14,10 12,15 8,15 6,10',
    description: 'Low confidence, needs more evidence first.',
  },
  {
    name:        'suppressed',
    color:       '#6b7280',
    shape:       '10,8 13,11 11,14 9,14 7,11',
    description: 'Signal suppressed with memory recorded.',
  },
  {
    name:        'escalated',
    color:       '#8b5cf6',
    shape:       '10,1 20,7 18,18 2,18 0,7',
    description: 'Escalated, awaiting operator approval.',
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

export const TopologyLegend: React.FC = () => (
  <div
    className="topology-legend"
    data-testid="topology-legend"
    style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#081520', borderRadius: '6px', border: '1px solid rgba(8,145,178,0.15)' }}
  >
    <div style={{ fontSize: '10px', color: '#4a6070', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>
      Signal Postures
    </div>
    {POSTURE_SHAPES.map(p => (
      <div
        key={p.name}
        data-testid={`legend-posture-${p.name}`}
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        {/* Mini shape icon */}
        <svg viewBox="0 0 20 20" width={20} height={20} style={{ flexShrink: 0 }}>
          <polygon points={p.shape} fill={`${p.color}33`} stroke={p.color} strokeWidth={1.5} strokeLinejoin="round" />
        </svg>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: p.color, textTransform: 'capitalize' }}>
            {p.name}
          </span>
          <span style={{ fontSize: '10px', color: '#4a6070', marginLeft: '6px' }}>
            {p.description}
          </span>
        </div>
      </div>
    ))}
  </div>
);
