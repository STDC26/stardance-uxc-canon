// src/routes/reporting.tsx
// CC_SCOUT_20 — Reporting Route.
// Top-level reporting surface at /scout/reporting/:signalId.
// Router-ready: accepts signalId prop (wire :signalId param when router installed).

import React, { useState, useEffect, useCallback } from 'react';
import type { InMemorySignalStore } from '../persistence/signal-store';
import type { StoredSignal, AuditEntry } from '../persistence/signal-store';
import type { GoverneAction } from '../types/Decision';
import { buildAuditTrail } from '../persistence/audit-trail-builder';
import type { GovernanceEvent } from '../types/IMS';

import { SignalSummaryPanel }      from '../components/reporting/SignalSummaryPanel';
import { DecisionPosturePanel }    from '../components/reporting/DecisionPosturePanel';
import { ConfidenceEvolutionPanel } from '../components/reporting/ConfidenceEvolutionPanel';
import { AuditDigestPanel }        from '../components/reporting/AuditDigestPanel';
import { OperatorActionSummary }   from '../components/reporting/OperatorActionSummary';
import type { ActionSummaryState } from '../components/reporting/OperatorActionSummary';
import type { NormalizedSignal }   from '../ingestion/normalization-pipeline';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReportingRouteProps {
  signalId:   string;
  store:      InMemorySignalStore;
  operatorId: string;
  onAction?:  (action: GoverneAction, signalId: string) => Promise<void> | void;
}

// ─── Loading + error states ───────────────────────────────────────────────────

const LoadingPlaceholder: React.FC = () => (
  <div data-testid="reporting-loading" style={{ padding: '40px', textAlign: 'center', color: '#4a6070', fontSize: '13px' }}>
    Loading signal…
  </div>
);

const NotFoundPlaceholder: React.FC<{ signalId: string }> = ({ signalId }) => (
  <div data-testid="reporting-not-found" style={{ padding: '40px', textAlign: 'center', color: '#ef4444', fontSize: '13px' }}>
    Signal not found: {signalId}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const ReportingRoute: React.FC<ReportingRouteProps> = ({
  signalId,
  store,
  operatorId: _operatorId,
  onAction,
}) => {
  const [signal,     setSignal]    = useState<StoredSignal | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [summary,    setSummary]   = useState<ActionSummaryState | null>(null);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const s = await store.getSignal(signalId);
      setSignal(s);
      if (s) {
        // Build audit trail from signal + stored governance events
        const govEvents = store.getGovernanceEvents(signalId) as GovernanceEvent[];
        const trail = buildAuditTrail(s as unknown as NormalizedSignal, govEvents);
        setAuditTrail(trail);
      }
      setLoading(false);
    })();
  }, [signalId, store]);

  const handleAction = useCallback(async (action: GoverneAction) => {
    try {
      await onAction?.(action, signalId);
      setSummary({
        status:     'success',
        action,
        message:    `Action '${action.replace(/_/g, ' ')}' submitted successfully.`,
        timestamp:  new Date().toISOString(),
        reversible: action === 'suppress' || action === 'mark_learning_signal',
      });
      // Refresh signal after action
      const updated = await store.getSignal(signalId);
      if (updated) setSignal(updated);
    } catch (err) {
      setSummary({
        status:     'error',
        action,
        message:    `Action '${action.replace(/_/g, ' ')}' failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp:  new Date().toISOString(),
        reversible: false,
      });
    }
  }, [signalId, store, onAction]);

  if (loading) return <LoadingPlaceholder />;
  if (!signal)  return <NotFoundPlaceholder signalId={signalId} />;

  return (
    <div
      className="reporting-route"
      data-testid="reporting-route"
      style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', maxWidth: '920px' }}
    >
      {/* Action feedback */}
      {summary && (
        <OperatorActionSummary
          summary={summary}
          autoDismissMs={5000}
          onDismiss={() => setSummary(null)}
        />
      )}

      {/* Panel 1: Signal Summary — orientation in ≤15 seconds */}
      <SignalSummaryPanel signal={signal} />

      {/* Panel 2: Decision Posture — action in ≤15 seconds */}
      <DecisionPosturePanel signal={signal} onAction={handleAction} />

      {/* Panel 3: Confidence Evolution — understanding in ≤30 seconds */}
      <ConfidenceEvolutionPanel signal={signal} />

      {/* Panel 4: Audit Digest — collapsed by default */}
      <AuditDigestPanel auditTrail={auditTrail} />
    </div>
  );
};
