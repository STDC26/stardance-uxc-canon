import React from 'react';
import { EvidenceTrace } from '../types/Evidence';

// RC-02: InterpretationBlock shows MEANING only — NOT action
interface InterpretationBlockProps {
  signalType: string;
  meaning: string;       // What the signal means — SEPARATE from action
  confidence: number;
  evidence: EvidenceTrace;
}

export const InterpretationBlock: React.FC<InterpretationBlockProps> = ({
  signalType,
  meaning,
  confidence,
  evidence,
}) => (
  <div className="interpretation-block" style={{ color: '#d1d5db', fontSize: '13px' }}>
    <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
      Signal Type
    </div>
    <div style={{ fontWeight: 600, color: '#e5e7eb', marginBottom: '10px' }}>{signalType}</div>
    <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
      What It Means
    </div>
    {/* RC-02: meaning is interpretation, NOT action guidance */}
    <p style={{ margin: '0 0 10px', lineHeight: '1.6' }}>{meaning}</p>
    <div style={{ fontSize: '11px', color: '#6b7280' }}>
      Based on {evidence.sourceCount} evidence source{evidence.sourceCount !== 1 ? 's' : ''}
      {' '}· Confidence: {Math.round(confidence * 100)}%
    </div>
  </div>
);
