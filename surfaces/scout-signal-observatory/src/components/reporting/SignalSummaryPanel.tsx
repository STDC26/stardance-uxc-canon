// src/components/reporting/SignalSummaryPanel.tsx
// CC_SCOUT_20 — Signal Summary Panel.
// Quick orientation — signal posture, state, metadata in ≤15 seconds.
// Badges + horizontal layout, no tables.

import React from 'react';
import type { StoredSignal } from '../../persistence/signal-store';
import type { IMSState } from '../../types/IMS';
import { CONFIDENCE_HARD_CAP } from '../../logic/confidence-gates';
import { SpiderTopology } from './SpiderTopology';

// ─── Trust posture derivation ─────────────────────────────────────────────────

export type TrustPosture = 'strong' | 'moderate' | 'weak' | 'suppressed' | 'escalated';

export function deriveTrustPosture(signal: StoredSignal): TrustPosture {
  const imsState = signal.imsState as IMSState;
  if (imsState === 'suppressed_with_memory') return 'suppressed';
  if (imsState === 'escalated_pending_approval') return 'escalated';
  if (signal.confidence >= 0.75) return 'strong';
  if (signal.confidence >= 0.50) return 'moderate';
  return 'weak';
}

const POSTURE_COLORS: Record<TrustPosture, string> = {
  strong:    '#10b981',
  moderate:  '#f59e0b',
  weak:      '#ef4444',
  suppressed:'#6b7280',
  escalated: '#8b5cf6',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const PostureBadge: React.FC<{ posture: TrustPosture }> = ({ posture }) => (
  <span
    data-testid="posture-badge"
    style={{
      display: 'inline-block',
      background: POSTURE_COLORS[posture],
      color: '#fff',
      borderRadius: '6px',
      padding: '3px 10px',
      fontSize: '12px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    }}
  >
    {posture}
  </span>
);

const ConfidenceBadge: React.FC<{ confidence: number; cappedAtIntake?: boolean }> = ({
  confidence,
  cappedAtIntake,
}) => (
  <span data-testid="confidence-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
    <span style={{ fontSize: '16px', fontWeight: 700, color: confidence >= 0.75 ? '#10b981' : confidence >= 0.50 ? '#f59e0b' : '#ef4444' }}>
      {Math.round(confidence * 100)}%
    </span>
    {cappedAtIntake && (
      <span
        data-testid="summary-cap-indicator"
        style={{ fontSize: '10px', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', borderRadius: '4px', padding: '1px 5px' }}
      >
        cap 0.92
      </span>
    )}
  </span>
);

const StateBadge: React.FC<{ imsState: string; runtimeState?: string }> = ({ imsState, runtimeState }) => (
  <span data-testid="state-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
    <span style={{ color: '#7dd3fc', background: 'rgba(125,211,252,0.10)', borderRadius: '4px', padding: '2px 7px' }}>
      {imsState}
    </span>
    {runtimeState && runtimeState !== 'none' && (
      <span style={{ color: '#c4b5fd', background: 'rgba(196,181,253,0.10)', borderRadius: '4px', padding: '2px 7px' }}>
        {runtimeState}
      </span>
    )}
  </span>
);

const EthicsStatusBadge: React.FC<{ ethicsGates: StoredSignal['ethicsGates'] }> = ({ ethicsGates }) => {
  const gates = ethicsGates as unknown as Record<string, { passed: boolean; reason?: string }>;
  const allPass = Object.values(gates).every(g => g?.passed !== false);
  return (
    <span
      data-testid="ethics-status-badge"
      style={{
        fontSize: '12px',
        color: allPass ? '#10b981' : '#ef4444',
        background: allPass ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
        borderRadius: '4px',
        padding: '2px 7px',
      }}
    >
      {allPass ? '✓ Ethics gates pass' : '✗ Ethics gate failed'}
    </span>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface SignalSummaryPanelProps {
  signal: StoredSignal;
}

export const SignalSummaryPanel: React.FC<SignalSummaryPanelProps> = ({ signal }) => {
  const posture = deriveTrustPosture(signal);

  return (
    <div
      className="signal-summary-panel"
      data-testid="signal-summary-panel"
      style={{ padding: '16px 20px', background: '#0d1e2d', borderRadius: '8px', border: '1px solid rgba(8,145,178,0.2)' }}
    >
      {/* Row 1: posture + confidence + state */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <PostureBadge posture={posture} />
        <ConfidenceBadge confidence={signal.confidence} cappedAtIntake={signal.cappedAtIntake} />
        <StateBadge imsState={signal.imsState} runtimeState={signal.runtimeState} />
        <EthicsStatusBadge ethicsGates={signal.ethicsGates} />
      </div>

        {/* Row 2: topology + metadata */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '10px' }}>
        <SpiderTopology signal={signal} size={160} />
        <div style={{ flex: 1 }}>
          {/* source + timestamp */}
          <div style={{ fontSize: '11px', color: '#4a6070', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <span>Source: <span style={{ color: '#7090a0' }}>{signal.source.name}</span></span>
        <span>·</span>
        <span>Trust: <span style={{ color: '#7090a0' }}>{Math.round(signal.source.trustLevel * 100)}%</span></span>
        <span>·</span>
        <span>Ingested: <span style={{ color: '#7090a0' }}>{new Date(signal.timestamp).toLocaleString()}</span></span>
        <span>·</span>
        <span style={{ color: '#374151' }}>ID: {signal.signalId.slice(0, 12)}…</span>
          </div>
        </div>
      </div>
    </div>
  );
};
