// src/components/reporting/AuditDigestPanel.tsx
// CC_SCOUT_20 — Audit Digest Panel.
// Show recent audit events, collapsed by default. Full trail on demand.

import React, { useState } from 'react';
import type { AuditEntry } from '../../persistence/signal-store';

// ─── Sub-components ───────────────────────────────────────────────────────────

const EventRow: React.FC<{ entry: AuditEntry }> = ({ entry }) => (
  <div style={{ fontSize: '11px', color: '#6b7280', display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '4px 0', borderBottom: '1px solid rgba(8,145,178,0.07)' }}>
    <span style={{ color: '#4a6070', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
      {new Date(entry.timestamp).toLocaleTimeString()}
    </span>
    <span style={{ color: '#7dd3fc', minWidth: '180px' }}>{entry.actionType}</span>
    <span style={{ color: '#9ca3af' }}>{entry.actorId}</span>
    {(entry.details as Record<string, unknown>).confidence !== undefined && (
      <span style={{ color: '#10b981' }}>
        {Math.round(((entry.details as Record<string, unknown>).confidence as number) * 100)}%
      </span>
    )}
    {(entry.details as Record<string, unknown>).reason !== undefined && (
      <span style={{ color: '#374151' }}>{String((entry.details as Record<string, unknown>).reason)}</span>
    )}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

interface AuditDigestPanelProps {
  auditTrail: AuditEntry[];
}

export const AuditDigestPanel: React.FC<AuditDigestPanelProps> = ({ auditTrail }) => {
  const [expanded, setExpanded] = useState(false);

  const recent   = auditTrail.slice(-5);
  const hasMore  = auditTrail.length > 5;
  const toShow   = expanded ? auditTrail : recent;

  return (
    <div
      className="audit-digest-panel"
      data-testid="audit-digest-panel"
      style={{ padding: '16px 20px', background: '#0d1e2d', borderRadius: '8px', border: '1px solid rgba(8,145,178,0.2)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', color: '#4a6070', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Audit Digest
        </span>
        <span style={{ fontSize: '11px', color: '#374151' }}>
          {auditTrail.length} event{auditTrail.length !== 1 ? 's' : ''}
        </span>
      </div>

      {auditTrail.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#374151' }}>No audit events recorded.</div>
      ) : (
        <>
          <div data-testid="audit-events-list">
            {toShow.map(entry => (
              <EventRow key={entry.entryId} entry={entry} />
            ))}
          </div>

          {hasMore && (
            <button
              data-testid="toggle-audit-trail"
              onClick={() => setExpanded(e => !e)}
              style={{ marginTop: '8px', fontSize: '11px', color: '#0891b2', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
            >
              {expanded ? '▾ Collapse audit trail' : `▸ Show full trail (${auditTrail.length} events)`}
            </button>
          )}
        </>
      )}
    </div>
  );
};
