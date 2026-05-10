import React from 'react';
import { CQXElement } from '../types/UXC';
import { ConfidenceBand } from './ConfidenceBand';
import { ActionPanel } from './ActionPanel';
import { IMSState } from '../types/IMS';
import { GoverneAction } from '../types/Decision';

// RC-01: CQX = Conviction Equation Experience
// RC-02: Meaning ≠ Action (separate cognitive operations — LOCKED ORDER)
interface CQXSequenceProps {
  cqx: CQXElement;
  imsState: IMSState;
  onAction: (action: GoverneAction) => void;
}

const elementStyle: React.CSSProperties = {
  borderLeft: '3px solid #1e3a5f',
  paddingLeft: '14px',
  marginBottom: '16px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
  marginBottom: '5px',
};

const contentStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#d1d5db',
  lineHeight: '1.6',
};

export const CQXSequence: React.FC<CQXSequenceProps> = ({ cqx, imsState, onAction }) => (
  <div className="cqx-sequence" data-cqx-version="1.0" data-rc02-enforced="true">

    {/* Element 1: Context — situation framing */}
    <div className="cqx-element cqx-context" style={elementStyle}>
      <div style={labelStyle}>1 · Context</div>
      <p style={contentStyle}>{cqx.context}</p>
    </div>

    {/* Element 2: Outcome — what happened */}
    <div className="cqx-element cqx-outcome" style={elementStyle}>
      <div style={labelStyle}>2 · What's Happening</div>
      <p style={contentStyle}>{cqx.outcome}</p>
    </div>

    {/* Element 3: Meaning — interpretation (RC-02: SEPARATE from action) */}
    <div className="cqx-element cqx-meaning" style={{ ...elementStyle, borderLeftColor: '#1e40af' }}>
      <div style={labelStyle}>3 · What It Means</div>
      {/* RC-02: This is interpretation only — operator decides what to DO separately */}
      <p style={contentStyle}>{cqx.meaning}</p>
    </div>

    {/* Element 4: Strength & Risk — confidence evaluation */}
    <div className="cqx-element cqx-strength" style={{ ...elementStyle, borderLeftColor: '#1e3a5f' }}>
      <div style={labelStyle}>4 · How Strong Is This</div>
      <ConfidenceBand
        confidence={cqx.strengthRisk.confidence}
        risks={cqx.strengthRisk.risk}
      />
    </div>

    {/* Element 5: Action — operator decides (RC-02: DISTINCT from meaning) */}
    <div className="cqx-element cqx-action" style={{ ...elementStyle, borderLeftColor: '#065f46' }}>
      <div style={labelStyle}>5 · What You Should Do</div>
      <p style={{ ...contentStyle, color: '#9ca3af', fontStyle: 'italic', marginBottom: '10px' }}>
        {cqx.action}
      </p>
      {/* RC-02: Action panel is the operator's domain — distinct from meaning */}
      <ActionPanel imsState={imsState} confidence={cqx.strengthRisk.confidence} onAction={onAction} />
    </div>

  </div>
);
