// src/components/SignalObservatory.tsx
// CC_SCOUT_19 — Signal Observatory: load real signals from store, display canonical CQX.
// Replaces mock-scenario pattern with live signal store queries.

import React, { useState, useEffect, useCallback } from 'react';
import type { StoredSignal } from '../persistence/signal-store';
import { InMemorySignalStore } from '../persistence/signal-store';
import type { GoverneAction } from '../types/Decision';
import { CQXSequence }       from './CQXSequence';
import { ConfidenceDisplay } from './ConfidenceDisplay';
import { EthicsGatesPanel }  from './EthicsGatesPanel';
import { StateIndicator }    from './StateIndicator';
import { EvidencePanel }     from './EvidencePanel';
import type { EvidenceTrace } from '../types/Evidence';
import type { IMSState }     from '../types/IMS';

interface SignalObservatoryProps {
  store:      InMemorySignalStore;
  onAction:   (action: GoverneAction, signal: StoredSignal) => void;
  operatorId: string;
}

// ─── Signal selector bar ──────────────────────────────────────────────────────

const SignalSelector: React.FC<{
  signals:    StoredSignal[];
  selectedId: string;
  onChange:   (id: string) => void;
}> = ({ signals, selectedId, onChange }) => (
  <div style={{
    padding: '10px 20px',
    background: '#081520',
    borderBottom: '1px solid rgba(8,145,178,0.25)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  }}>
    <span style={{ fontSize: '11px', color: '#7090a0', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
      Live Signal
    </span>
    <select
      id="signal-select"
      value={selectedId}
      onChange={e => onChange(e.target.value)}
      style={{
        background: '#0d1e2d',
        border: '1px solid rgba(8,145,178,0.3)',
        borderRadius: '6px',
        color: '#e0f0f8',
        fontSize: '13px',
        padding: '6px 10px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        flex: 1,
        minWidth: '260px',
        maxWidth: '480px',
      }}
    >
      <option value="">— Select a signal —</option>
      {signals.map(s => (
        <option key={s.signalId} value={s.signalId}>
          {s.signalId} · {s.source.name} · {s.imsState}
        </option>
      ))}
    </select>
    <span style={{ fontSize: '10px', color: '#4a6070' }}>
      v1.0.1 · {signals.length} signal{signals.length !== 1 ? 's' : ''} in store
    </span>
  </div>
);

// ─── Evidence adapter ─────────────────────────────────────────────────────────

function buildEvidenceTrace(signal: StoredSignal): EvidenceTrace {
  const sources = signal.evidence.map((ev, i) => ({
    id:          ev.evidenceId ?? `ev-${i}`,
    name:        `${ev.sourceType}: ${ev.source.name}`,
    confidence:  ev.source.trustLevel,
    description: `sourceType: ${ev.sourceType}`,
  }));
  return {
    sources,
    signalsUsed:  sources.map(s => s.id),
    sourceCount:  sources.length,
    canonApplied: ['stardance-canon-v3.0', 'scout-v1.0.1'],
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export const SignalObservatory: React.FC<SignalObservatoryProps> = ({
  store,
  onAction,
  operatorId: _operatorId,
}) => {
  const [signals, setSignals]         = useState<StoredSignal[]>([]);
  const [selectedId, setSelectedId]   = useState('');
  const [activeSignal, setActive]     = useState<StoredSignal | null>(null);

  // Load all stored signals on mount and when store changes
  useEffect(() => {
    (async () => {
      const all = await store.getSignalsByImsState('processing');
      // Also pull complete + partial_complete
      const complete  = await store.getSignalsByImsState('complete');
      const partial   = await store.getSignalsByImsState('partial_complete');
      const merged = [...all, ...complete, ...partial];
      setSignals(merged);
      if (merged.length > 0 && !selectedId) {
        setSelectedId(merged[0].signalId);
        setActive(merged[0]);
      }
    })();
  }, [store]);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    const found = signals.find(s => s.signalId === id) ?? null;
    setActive(found);
  }, [signals]);

  if (signals.length === 0) {
    return (
      <div style={{ padding: '24px', color: '#6b7280', fontSize: '13px', textAlign: 'center' }}>
        No signals in store. Ingest a signal via POST /api/scout/signal to begin.
      </div>
    );
  }

  return (
    <div className="signal-observatory" data-testid="signal-observatory">
      <SignalSelector signals={signals} selectedId={selectedId} onChange={handleSelect} />

      {activeSignal && (
        <div style={{ padding: '20px', maxWidth: '860px' }}>
          {/* Signal metadata bar */}
          <div style={{ fontSize: '11px', color: '#4a6070', fontFamily: 'monospace', marginBottom: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>ID: {activeSignal.signalId}</span>
            <span>Source: {activeSignal.source.name}</span>
            <span>Schema: {activeSignal.schemaVersion}</span>
            <span>Ingested: {activeSignal.timestamp}</span>
          </div>

          {/* State row */}
          <div style={{ marginBottom: '14px' }}>
            <StateIndicator
              imsState={activeSignal.imsState as IMSState}
              runtimeState={activeSignal.runtimeState !== 'none' ? activeSignal.runtimeState : undefined}
            />
          </div>

          {/* Main grid: CQX + sidebar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '20px', alignItems: 'start' }}>
            {/* CQX Canonical sequence */}
            <CQXSequence
              cqx={activeSignal.cqx}
              imsState={activeSignal.imsState as IMSState}
              onAction={(action) => onAction(action, activeSignal)}
            />

            {/* Sidebar: confidence + ethics + evidence */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <ConfidenceDisplay
                confidence={activeSignal.confidence}
                baselineConfidence={activeSignal.baselineConfidence}
                capApplied={activeSignal.capApplied}
                cappedAtIntake={activeSignal.cappedAtIntake}
                confidenceHistory={activeSignal.confidenceHistory}
              />
              <EthicsGatesPanel ethicsGates={activeSignal.ethicsGates} />
              <EvidencePanel evidence={buildEvidenceTrace(activeSignal)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
