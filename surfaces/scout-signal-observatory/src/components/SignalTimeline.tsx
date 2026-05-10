import React from 'react';

interface TimelineEntry {
  timestamp: number;
  label: string;
  type: string;
}

interface SignalTimelineProps {
  history: TimelineEntry[];
  currentTimestamp?: number;
}

export const SignalTimeline: React.FC<SignalTimelineProps> = ({ history, currentTimestamp }) => {
  if (history.length === 0) {
    return (
      <div className="signal-timeline" style={{ fontSize: '12px', color: '#6b7280', padding: '8px 0' }}>
        No signal history
      </div>
    );
  }

  return (
    <div className="signal-timeline" style={{ fontSize: '12px' }}>
      <div style={{ color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '11px' }}>
        Signal History
      </div>
      {history.map((entry, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: '10px',
            padding: '4px 0',
            color: entry.timestamp === currentTimestamp ? '#30ABCA' : '#9ca3af',
            borderLeft: `2px solid ${entry.timestamp === currentTimestamp ? '#30ABCA' : '#374151'}`,
            paddingLeft: '8px',
            marginBottom: '4px',
          }}
        >
          <span style={{ minWidth: '70px', color: '#6b7280' }}>
            {new Date(entry.timestamp).toLocaleTimeString()}
          </span>
          <span>{entry.label}</span>
          <span style={{ color: '#6b7280' }}>[{entry.type}]</span>
        </div>
      ))}
    </div>
  );
};
