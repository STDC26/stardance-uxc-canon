import React from 'react';

interface EthicsGateProps {
  safetyStatus: boolean;
  delightStatus: boolean;
  harmonyStatus: boolean;
  onOverride?: () => void;
}

export const EthicsGate: React.FC<EthicsGateProps> = ({
  safetyStatus,
  delightStatus,
  harmonyStatus,
  onOverride,
}) => {
  const allPass = safetyStatus && delightStatus && harmonyStatus;

  const Gate = ({ label, pass }: { label: string; pass: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '12px', color: '#9ca3af' }}>
      <span style={{ color: pass ? '#10b981' : '#ef4444' }}>{pass ? '✓' : '✕'}</span>
      <span>{label}</span>
    </div>
  );

  return (
    <div className="ethics-gate" style={{ borderLeft: `3px solid ${allPass ? '#10b981' : '#ef4444'}`, paddingLeft: '10px' }}>
      <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
        Ethics Gates
      </div>
      <Gate label="Safety" pass={safetyStatus} />
      <Gate label="Delight" pass={delightStatus} />
      <Gate label="Harmony" pass={harmonyStatus} />
      {!allPass && onOverride && (
        <button
          onClick={onOverride}
          style={{ marginTop: '8px', fontSize: '11px', color: '#f59e0b', background: 'none', border: '1px solid #f59e0b', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer' }}
        >
          Override (requires confirmation)
        </button>
      )}
    </div>
  );
};
