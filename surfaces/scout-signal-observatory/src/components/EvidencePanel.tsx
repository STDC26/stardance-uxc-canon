import React from 'react';
import { EvidenceTrace } from '../types/Evidence';

interface EvidencePanelProps {
  evidence: EvidenceTrace;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ evidence }) => (
  <div className="evidence-panel" style={{ fontSize: '13px', color: '#d1d5db' }}>
    <div style={{ fontWeight: 600, marginBottom: '8px', color: '#e5e7eb' }}>
      Evidence ({evidence.sourceCount} source{evidence.sourceCount !== 1 ? 's' : ''})
    </div>
    {evidence.sources.map((src) => (
      <div key={src.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #374151' }}>
        <span>{src.name}</span>
        <span style={{ color: '#10b981' }}>{Math.round(src.confidence * 100)}%</span>
      </div>
    ))}
    {evidence.canonApplied.length > 0 && (
      <div style={{ marginTop: '8px', color: '#6b7280', fontSize: '11px' }}>
        Canon: {evidence.canonApplied.join(', ')}
      </div>
    )}
  </div>
);
