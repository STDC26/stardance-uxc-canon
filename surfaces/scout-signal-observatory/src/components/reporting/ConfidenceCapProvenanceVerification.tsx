// src/components/reporting/ConfidenceCapProvenanceVerification.tsx
// CC_SCOUT_23 — Confidence Cap Provenance Verification.
// Specifically verifies cap provenance is visible + understandable.

import React from 'react';
import type { StoredSignal, AuditEntry } from '../../persistence/signal-store';
import type { ConfidenceSnapshot } from '../../api/SignalIntakeAdapter';

// ─── Verification logic ───────────────────────────────────────────────────────

export type CapVerdict = 'pass' | 'fail' | 'not_applicable';

export interface CapProvenanceVerification {
  cappedAtIntakeFlagSet:     boolean;
  capInConfidenceHistory:    boolean;
  capInAuditTrail:           boolean;
  verdict:                   CapVerdict;
  details:                   string;
}

export function verifyCapProvenance(
  signal:    StoredSignal,
  auditTrail: AuditEntry[]
): CapProvenanceVerification {
  const cappedAtIntakeFlagSet = signal.cappedAtIntake === true;

  if (!cappedAtIntakeFlagSet) {
    return {
      cappedAtIntakeFlagSet:  false,
      capInConfidenceHistory: false,
      capInAuditTrail:        false,
      verdict:                'not_applicable',
      details:                'Signal was not capped at intake — no cap provenance required.',
    };
  }

  const history = (signal.confidenceHistory ?? []) as ConfidenceSnapshot[];
  const capInConfidenceHistory = history.some(
    h => h.source === 'intake_cap' || h.reason === 'cap_applied'
  );

  const capInAuditTrail = auditTrail.some(e => e.actionType === 'confidence_cap_enforced');

  const allPresent = cappedAtIntakeFlagSet && capInConfidenceHistory && capInAuditTrail;
  const verdict: CapVerdict = allPresent ? 'pass' : 'fail';

  let details: string;
  if (allPresent) {
    details = '✓ Cap provenance fully visible and traceable.';
  } else {
    const gaps: string[] = [];
    if (!capInConfidenceHistory) gaps.push('not in confidence history');
    if (!capInAuditTrail)        gaps.push('not in audit trail');
    details = `✗ Cap provenance gaps: ${gaps.join(', ')}.`;
  }

  return { cappedAtIntakeFlagSet, capInConfidenceHistory, capInAuditTrail, verdict, details };
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ConfidenceCapProvenanceVerificationProps {
  signal:     StoredSignal;
  auditTrail: AuditEntry[];
}

const Check: React.FC<{ label: string; status: boolean | 'na'; naText?: string }> = ({ label, status, naText }) => {
  const color  = status === true ? '#10b981' : status === 'na' ? '#4a6070' : '#f59e0b';
  const symbol = status === true ? '✓' : status === 'na' ? '—' : '✗';
  const text   = status === true ? 'present' : status === 'na' ? (naText ?? 'n/a') : 'missing';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid rgba(8,145,178,0.07)' }}>
      <span style={{ color: '#7090a0' }}>{label}</span>
      <span style={{ color }}>{symbol} {text}</span>
    </div>
  );
};

export const ConfidenceCapProvenanceVerification: React.FC<ConfidenceCapProvenanceVerificationProps> = ({
  signal,
  auditTrail,
}) => {
  const v = verifyCapProvenance(signal, auditTrail);

  const verdictColor = v.verdict === 'pass' ? '#10b981' : v.verdict === 'not_applicable' ? '#4a6070' : '#ef4444';
  const na = v.verdict === 'not_applicable';

  return (
    <div
      className="confidence-cap-provenance-verification"
      data-testid="cap-provenance-verification"
      style={{ padding: '16px 20px', background: '#0d1e2d', borderRadius: '8px', border: `1px solid ${verdictColor}44` }}
    >
      <div style={{ fontSize: '11px', color: '#4a6070', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
        Cap Provenance Verification
      </div>

      <Check label="cappedAtIntake flag"        status={na ? 'na' : v.cappedAtIntakeFlagSet}    naText="not capped" />
      <Check label="Cap in confidence history"  status={na ? 'na' : v.capInConfidenceHistory}   naText="not applicable" />
      <Check label="Cap in audit trail"         status={na ? 'na' : v.capInAuditTrail}          naText="not applicable" />

      <div
        data-testid="cap-verification-verdict"
        style={{ marginTop: '10px', fontSize: '12px', color: verdictColor, fontWeight: 600 }}
      >
        {v.details}
      </div>
    </div>
  );
};
