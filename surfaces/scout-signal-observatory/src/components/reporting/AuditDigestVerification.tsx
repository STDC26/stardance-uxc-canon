// src/components/reporting/AuditDigestVerification.tsx
// CC_SCOUT_23 — Audit Digest Verification.
// Verifies audit trail is traceable and complete.

import React from 'react';
import type { AuditEntry } from '../../persistence/signal-store';

// ─── Verification logic ───────────────────────────────────────────────────────

export type VerificationVerdict = 'pass' | 'concern' | 'fail';

export interface AuditVerificationResult {
  totalEvents:              number;
  hasCapProvenance:         boolean;
  hasEthicsGateEvents:      boolean;
  immutabilityViolations:   number;
  verdict:                  VerificationVerdict;
  summary:                  string;
}

export function verifyAuditTrail(auditTrail: AuditEntry[]): AuditVerificationResult {
  const total = auditTrail.length;

  const hasCapProvenance = auditTrail.some(e =>
    e.actionType === 'confidence_cap_enforced' ||
    (e.actionType === 'confidence_snapshot' && (e.details as Record<string, unknown>).reason === 'cap_applied')
  );

  const hasEthicsGateEvents = auditTrail.some(e =>
    e.actionType.includes('governance') || e.actionType.includes('ethics')
  );

  // Immutability violations: entries where immutable !== true
  const violations = auditTrail.filter(e => e.immutable !== true).length;

  let verdict: VerificationVerdict;
  if (violations > 0) {
    verdict = 'fail';
  } else if (total === 0) {
    verdict = 'concern';
  } else {
    verdict = 'pass';
  }

  let summary: string;
  if (verdict === 'fail') {
    summary = `✗ ${violations} immutability violation(s) detected — audit trail integrity compromised.`;
  } else if (verdict === 'concern') {
    summary = '⚠ No audit events recorded — traceability limited.';
  } else {
    summary = `✓ Audit trail intact — ${total} events, all immutable.`;
  }

  return { totalEvents: total, hasCapProvenance, hasEthicsGateEvents, immutabilityViolations: violations, verdict, summary };
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AuditDigestVerificationProps {
  auditTrail: AuditEntry[];
}

const CheckRow: React.FC<{ label: string; status: boolean | number; positiveText: string; negativeText: string }> = ({
  label, status, positiveText, negativeText,
}) => {
  const ok = typeof status === 'boolean' ? status : status === 0;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid rgba(8,145,178,0.07)' }}>
      <span style={{ color: '#7090a0' }}>{label}</span>
      <span style={{ color: ok ? '#10b981' : '#f59e0b' }}>
        {ok ? `✓ ${positiveText}` : `⚠ ${negativeText}`}
      </span>
    </div>
  );
};

export const AuditDigestVerification: React.FC<AuditDigestVerificationProps> = ({ auditTrail }) => {
  const result = verifyAuditTrail(auditTrail);

  const verdictColor = result.verdict === 'pass' ? '#10b981' : result.verdict === 'concern' ? '#f59e0b' : '#ef4444';

  return (
    <div
      className="audit-digest-verification"
      data-testid="audit-digest-verification"
      style={{ padding: '16px 20px', background: '#0d1e2d', borderRadius: '8px', border: `1px solid ${verdictColor}44` }}
    >
      <div style={{ fontSize: '11px', color: '#4a6070', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
        Audit Trail Verification
      </div>

      <CheckRow label="Total events"         status={result.totalEvents > 0}          positiveText={`${result.totalEvents} present`} negativeText="no events" />
      <CheckRow label="Cap provenance"        status={result.hasCapProvenance}          positiveText="present"                        negativeText="missing (may be ok if not capped)" />
      <CheckRow label="Ethics gate events"    status={result.hasEthicsGateEvents}       positiveText="logged"                         negativeText="missing" />
      <CheckRow label="Immutability violations" status={result.immutabilityViolations === 0} positiveText="none detected"             negativeText={`${result.immutabilityViolations} detected`} />

      <div
        data-testid="audit-verification-verdict"
        style={{ marginTop: '10px', fontSize: '12px', color: verdictColor, fontWeight: 600 }}
      >
        {result.summary}
      </div>
    </div>
  );
};
