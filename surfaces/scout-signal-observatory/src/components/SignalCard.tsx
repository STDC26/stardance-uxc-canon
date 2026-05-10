import React from 'react';
import { ClassificationResult } from '../logic/signal-classifier';
import { IMSState } from '../types/IMS';
import { StateIndicator } from './StateIndicator';

interface SignalCardProps {
  raw: string;
  imsState: IMSState;
  classification?: ClassificationResult;
  timestamp?: number;
}

export const SignalCard: React.FC<SignalCardProps> = ({ raw, imsState, classification, timestamp }) => (
  <div
    className="signal-card"
    style={{
      border: '1px solid #1f2937',
      borderRadius: '8px',
      padding: '14px',
      background: '#0f1018',
      opacity: imsState === 'processing' ? 0.6 : 1,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
      <StateIndicator imsState={imsState} />
      {timestamp && (
        <span style={{ fontSize: '11px', color: '#6b7280' }}>
          {new Date(timestamp).toLocaleTimeString()}
        </span>
      )}
    </div>
    <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#d1d5db', marginBottom: '8px', wordBreak: 'break-all' }}>
      {raw}
    </div>
    {classification && (
      <div style={{ fontSize: '12px', color: '#30ABCA' }}>
        {classification.label} — {Math.round(classification.confidence * 100)}%
      </div>
    )}
  </div>
);
