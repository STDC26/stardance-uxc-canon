import React from 'react';
import { IMSState } from '../types/IMS';

interface OperatorActionBarProps {
  imsState: IMSState;
  onReset: () => void;
  onRetry?: () => void;
}

export const OperatorActionBar: React.FC<OperatorActionBarProps> = ({ imsState, onReset, onRetry }) => {
  const showRetry = imsState === 'failed' || imsState === 'partial_complete';

  const btnStyle = (primary = false): React.CSSProperties => ({
    padding: '7px 14px',
    fontSize: '12px',
    borderRadius: '5px',
    border: `1px solid ${primary ? '#30ABCA' : '#374151'}`,
    background: primary ? 'rgba(8,145,178,0.12)' : 'transparent',
    color: primary ? '#30ABCA' : '#9ca3af',
    cursor: 'pointer',
  });

  return (
    <div className="operator-action-bar" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
      <button style={btnStyle()} onClick={onReset}>Reset</button>
      {showRetry && onRetry && (
        <button style={btnStyle(true)} onClick={onRetry}>Retry</button>
      )}
    </div>
  );
};
