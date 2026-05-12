// src/components/reporting/KnownLimitations.tsx
// CC_SCOUT_23 — Known Limitations.
// Transparent documentation of what Reporting Surface doesn't do, with mitigations.

import React, { useState } from 'react';

// ─── Limitation definitions ───────────────────────────────────────────────────

interface Limitation {
  id:         string;
  title:      string;
  detail:     string;
  mitigation: string;
}

export const KNOWN_LIMITATIONS: Limitation[] = [
  {
    id:         'signal_complexity',
    title:      'Signal Complexity',
    detail:     'Spider topology simplifies to 5 axes.',
    mitigation: 'Audit trail provides full detail.',
  },
  {
    id:         'confidence_history_scale',
    title:      'Confidence History at Scale',
    detail:     'Long histories (100+ entries) may scroll.',
    mitigation: 'Progressive disclosure available; pagination planned.',
  },
  {
    id:         'audit_trail_scale',
    title:      'Audit Trail at Scale',
    detail:     '1000+ events become scroll-heavy.',
    mitigation: 'Summary + search available.',
  },
  {
    id:         'ethics_gate_context',
    title:      'Ethics Gate Explanation Depth',
    detail:     'Rationale provided; deeper context requires domain documentation.',
    mitigation: 'Documentation links available in governance layer.',
  },
  {
    id:         'real_time_updates',
    title:      'Real-Time Updates',
    detail:     'Surface shows state at load time.',
    mitigation: 'Refresh button available.',
  },
  {
    id:         'scale_disclaimer',
    title:      'Scale Disclaimer',
    detail:     'v0.1 optimised for nominal scale (≤100 signals).',
    mitigation: 'Extreme scale may require additional features (planned for Build 3).',
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

export const KnownLimitations: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="known-limitations"
      data-testid="known-limitations"
      style={{ padding: '12px 20px', background: '#080f14', borderRadius: '8px', border: '1px solid rgba(107,114,128,0.2)' }}
    >
      <button
        data-testid="toggle-limitations"
        onClick={() => setExpanded(e => !e)}
        style={{ fontSize: '11px', color: '#4a6070', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', gap: '6px', alignItems: 'center' }}
      >
        <span>{expanded ? '▾' : '▸'}</span>
        <span>Known Limitations ({KNOWN_LIMITATIONS.length})</span>
      </button>

      {expanded && (
        <div data-testid="limitations-list" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {KNOWN_LIMITATIONS.map(lim => (
            <div
              key={lim.id}
              data-testid={`limitation-${lim.id}`}
              style={{ fontSize: '11px', color: '#6b7280', paddingLeft: '8px', borderLeft: '2px solid rgba(107,114,128,0.2)' }}
            >
              <span style={{ color: '#9ca3af', fontWeight: 600 }}>{lim.title}:</span>
              {' '}{lim.detail}
              {' '}
              <span style={{ color: '#4a6070' }}>Mitigation: {lim.mitigation}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
