import React from 'react';
import { IMSState } from '../types/IMS';
import { mapIMSToOrbit, getOrbitLabel, ORBITFRAME_VERSION, SCOUT_ORBIT_STATE } from '../logic/orbit-binding';

interface OrbitHeaderProps {
  imsState: IMSState;
}

export const OrbitHeader: React.FC<OrbitHeaderProps> = ({ imsState }) => {
  const orbitState = mapIMSToOrbit(imsState);
  const isActive = orbitState === SCOUT_ORBIT_STATE;

  return (
    <div
      className="orbit-header"
      data-orbit-state={orbitState}
      data-orbitframe={ORBITFRAME_VERSION}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0' }}
    >
      {/* Orbit visual indicator */}
      <div style={{ position: 'relative', width: '28px', height: '28px' }}>
        <svg width="28" height="28" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="12" fill="none" stroke={isActive ? '#30ABCA' : '#374151'} strokeWidth="1" />
          <circle cx="14" cy="14" r="7" fill="none" stroke={isActive ? '#30ABCA' : '#374151'} strokeWidth="1" opacity="0.6" />
          <circle cx="14" cy="14" r="3" fill={isActive ? '#30ABCA' : '#6b7280'} />
        </svg>
      </div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: isActive ? '#30ABCA' : '#9ca3af' }}>
          {getOrbitLabel(orbitState)}
        </div>
        <div style={{ fontSize: '10px', color: '#6b7280' }}>{ORBITFRAME_VERSION} · {SCOUT_ORBIT_STATE}</div>
      </div>
    </div>
  );
};
