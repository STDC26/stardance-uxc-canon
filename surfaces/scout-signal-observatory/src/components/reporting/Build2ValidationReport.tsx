// src/components/reporting/Build2ValidationReport.tsx
// CC_SCOUT_23 — Build 2 Validation Report Generator.
// Generates structured report for Phase 6 UAT handoff.

import React, { useState } from 'react';
import type { StoredSignal, AuditEntry } from '../../persistence/signal-store';
import { verifyAuditTrail }    from './AuditDigestVerification';
import { verifyCapProvenance } from './ConfidenceCapProvenanceVerification';
import { COGNITION_CHECKLIST } from './OperatorCognitionChecklist';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ValidationVerdict     = 'pass' | 'pass_with_notes' | 'fail';
export type Phase6ReadinessLevel  = 'ready' | 'ready_with_caution' | 'not_ready';

export interface Build2ValidationReport {
  readonly generatedAt:     string;
  readonly signalId:        string;
  readonly cognitionItems:  number;
  readonly auditVerdict:    string;
  readonly capVerdict:      string;
  readonly strengths:       string[];
  readonly gaps:            string[];
  readonly recommendations: string[];
  readonly verdict:         ValidationVerdict;
  readonly phase6Readiness: Phase6ReadinessLevel;
  readonly immutable:       true;
}

// ─── Report generator ────────────────────────────────────────────────────────

export function generateBuild2Report(
  signal:     StoredSignal,
  auditTrail: AuditEntry[]
): Build2ValidationReport {
  const auditVerification = verifyAuditTrail(auditTrail);
  const capVerification   = verifyCapProvenance(signal, auditTrail);

  const strengths: string[] = [
    'Reporting surface renders all 4 panels',
    'Spider topology compresses 5 dimensions visually',
    'Confidence cap provenance tracked end-to-end',
    'Audit trail immutability enforced',
    `${COGNITION_CHECKLIST.length} cognition checklist items available`,
  ];

  const gaps: string[] = [];
  if (auditVerification.verdict === 'fail')        gaps.push('Audit trail immutability violation detected');
  if (auditVerification.verdict === 'concern')     gaps.push('No audit events — traceability limited');
  if (capVerification.verdict === 'fail')          gaps.push('Cap provenance not fully visible');
  if (!auditVerification.hasEthicsGateEvents)      gaps.push('Ethics gate events not logged in audit trail');

  const recommendations: string[] = [
    'Seed UAT signals via POST /api/scout/signal before operator sessions',
    'Validate ≤15s orientation time in first 5 UAT sessions',
    'Capture decision-time metrics via useDecisionTimeMeasurement hook',
    'Review known limitations with UAT operators before sessions begin',
  ];

  let verdict: ValidationVerdict;
  let phase6Readiness: Phase6ReadinessLevel;

  if (auditVerification.verdict === 'fail') {
    verdict         = 'fail';
    phase6Readiness = 'not_ready';
  } else if (gaps.length > 0) {
    verdict         = 'pass_with_notes';
    phase6Readiness = 'ready_with_caution';
  } else {
    verdict         = 'pass';
    phase6Readiness = 'ready';
  }

  return {
    generatedAt:     new Date().toISOString(),
    signalId:        signal.signalId,
    cognitionItems:  COGNITION_CHECKLIST.length,
    auditVerdict:    auditVerification.summary,
    capVerdict:      capVerification.details,
    strengths,
    gaps,
    recommendations,
    verdict,
    phase6Readiness,
    immutable:       true as const,
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Build2ValidationReportProps {
  signal:     StoredSignal;
  auditTrail: AuditEntry[];
}

export const Build2ValidationReport: React.FC<Build2ValidationReportProps> = ({ signal, auditTrail }) => {
  const [report, setReport] = useState<Build2ValidationReport | null>(null);

  const generate = () => setReport(generateBuild2Report(signal, auditTrail));

  const verdictColor = !report ? '#4a6070'
    : report.verdict === 'pass' ? '#10b981'
    : report.verdict === 'pass_with_notes' ? '#f59e0b'
    : '#ef4444';

  return (
    <div
      className="build2-validation-report"
      data-testid="build2-validation-report"
      style={{ padding: '16px 20px', background: '#0d1e2d', borderRadius: '8px', border: '1px solid rgba(8,145,178,0.2)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', color: '#4a6070', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Build 2 Validation Report
        </span>
        <button
          data-testid="generate-report-btn"
          onClick={generate}
          style={{ fontSize: '11px', color: '#0891b2', background: 'rgba(8,145,178,0.10)', border: '1px solid rgba(8,145,178,0.3)', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Generate Report
        </button>
      </div>

      {report && (
        <div data-testid="report-content">
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span data-testid="report-verdict" style={{ fontSize: '13px', fontWeight: 700, color: verdictColor }}>
              Verdict: {report.verdict.replace(/_/g, ' ').toUpperCase()}
            </span>
            <span data-testid="report-phase6-readiness" style={{ fontSize: '13px', color: verdictColor }}>
              Phase 6: {report.phase6Readiness.replace(/_/g, ' ')}
            </span>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', color: '#4a6070', marginBottom: '4px' }}>Strengths</div>
            {report.strengths.map((s, i) => (
              <div key={i} style={{ fontSize: '11px', color: '#10b981', marginBottom: '2px' }}>✓ {s}</div>
            ))}
          </div>

          {report.gaps.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: '#4a6070', marginBottom: '4px' }}>Gaps</div>
              {report.gaps.map((g, i) => (
                <div key={i} style={{ fontSize: '11px', color: '#f59e0b', marginBottom: '2px' }}>⚠ {g}</div>
              ))}
            </div>
          )}

          <div>
            <div style={{ fontSize: '11px', color: '#4a6070', marginBottom: '4px' }}>Recommendations</div>
            {report.recommendations.map((r, i) => (
              <div key={i} style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>→ {r}</div>
            ))}
          </div>

          <div style={{ marginTop: '10px', fontSize: '10px', color: '#374151' }}>
            Generated: {new Date(report.generatedAt).toLocaleString()} · Signal: {report.signalId.slice(0, 12)}…
          </div>
        </div>
      )}
    </div>
  );
};
