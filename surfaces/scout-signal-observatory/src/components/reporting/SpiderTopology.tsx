// src/components/reporting/SpiderTopology.tsx
// CC_SCOUT_21 — Spider Topology Visualization.
// SVG radar chart: 5 dimensions, color-coded posture, responsive viewBox.

import React, { useState } from 'react';
import type { StoredSignal } from '../../persistence/signal-store';
import type { TrustPosture } from './SignalSummaryPanel';
import { deriveTrustPosture } from './SignalSummaryPanel';
import { CONFIDENCE_HARD_CAP } from '../../logic/confidence-gates';

// ─── Dimension definitions ────────────────────────────────────────────────────

export interface TopologyDimension {
  key:   string;
  label: string;
  value: number;  // 0.0 – 1.0 normalized
  raw:   number;  // Original value for tooltip
  unit:  string;
}

export function buildDimensions(signal: StoredSignal): TopologyDimension[] {
  const gates = signal.ethicsGates as unknown as Record<string, { passed: boolean }>;
  const ethicsScore = ['safety', 'delight', 'harmony'].filter(k => gates?.[k]?.passed !== false).length / 3;

  const runtimeActive = signal.runtimeState !== 'none' ? 1 : 0;

  const evidenceNorm = Math.min((signal.evidence?.length ?? 0) / 10, 1);

  return [
    {
      key:   'confidence',
      label: 'Confidence',
      value: signal.confidence / CONFIDENCE_HARD_CAP,
      raw:   signal.confidence,
      unit:  '%',
    },
    {
      key:   'evidence',
      label: 'Evidence',
      value: evidenceNorm,
      raw:   signal.evidence?.length ?? 0,
      unit:  ' items',
    },
    {
      key:   'trust',
      label: 'Trust',
      value: signal.source.trustLevel,
      raw:   signal.source.trustLevel,
      unit:  '%',
    },
    {
      key:   'ethics',
      label: 'Ethics',
      value: ethicsScore,
      raw:   ethicsScore * 3,
      unit:  '/3 gates',
    },
    {
      key:   'runtime',
      label: 'Runtime',
      value: runtimeActive,
      raw:   runtimeActive,
      unit:  runtimeActive ? ' active' : ' idle',
    },
  ];
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

const POSTURE_STROKE: Record<TrustPosture, string> = {
  strong:    '#10b981',
  moderate:  '#f59e0b',
  weak:      '#ef4444',
  suppressed:'#6b7280',
  escalated: '#8b5cf6',
};

function polarToXY(angle: number, radius: number, cx: number, cy: number): [number, number] {
  const rad = (angle - 90) * (Math.PI / 180);
  return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
}

// ─── Spider SVG ───────────────────────────────────────────────────────────────

interface SpiderSVGProps {
  dimensions: TopologyDimension[];
  posture:    TrustPosture;
  size:       number;
  onHover?:   (dim: TopologyDimension | null) => void;
}

const SpiderSVG: React.FC<SpiderSVGProps> = ({ dimensions, posture, size, onHover }) => {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = (size / 2) - 28;
  const n = dimensions.length;
  const angleStep = 360 / n;
  const rings = [0.25, 0.5, 0.75, 1.0];
  const strokeColor = POSTURE_STROKE[posture];

  // Build polygon points
  const polyPoints = dimensions.map((d, i) => {
    const angle = i * angleStep;
    return polarToXY(angle, d.value * maxR, cx, cy);
  });
  const polyStr = polyPoints.map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <svg
      data-testid="spider-svg"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      style={{ display: 'block' }}
    >
      {/* Concentric rings */}
      {rings.map(r => (
        <circle
          key={r}
          cx={cx}
          cy={cy}
          r={r * maxR}
          fill="none"
          stroke="rgba(8,145,178,0.15)"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines + labels */}
      {dimensions.map((dim, i) => {
        const angle = i * angleStep;
        const [x2, y2] = polarToXY(angle, maxR, cx, cy);
        const [lx, ly] = polarToXY(angle, maxR + 16, cx, cy);
        const pct = Math.round(
          dim.key === 'confidence' ? dim.raw * 100
          : dim.key === 'trust'    ? dim.raw * 100
          : dim.key === 'ethics'   ? (dim.value * 100)
          : dim.key === 'evidence' ? dim.value * 100
          : dim.value * 100
        );
        return (
          <g
            key={dim.key}
            data-testid={`axis-${dim.key}`}
            onMouseEnter={() => onHover?.(dim)}
            onMouseLeave={() => onHover?.(null)}
            style={{ cursor: 'pointer' }}
          >
            <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="rgba(8,145,178,0.25)" strokeWidth={1} />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#7090a0"
              fontSize={9}
            >
              {dim.label} {pct}%
            </text>
          </g>
        );
      })}

      {/* Signal polygon */}
      <polygon
        data-testid="signal-polygon"
        points={polyStr}
        fill={`${strokeColor}22`}
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Polygon vertices */}
      {polyPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill={strokeColor} />
      ))}
    </svg>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface SpiderTopologyProps {
  signal: StoredSignal;
  size?:  number;
}

export const SpiderTopology: React.FC<SpiderTopologyProps> = ({ signal, size = 200 }) => {
  const [hovered, setHovered] = useState<TopologyDimension | null>(null);
  const dimensions = buildDimensions(signal);
  const posture    = deriveTrustPosture(signal);

  return (
    <div
      className="spider-topology"
      data-testid="spider-topology"
      style={{ display: 'inline-block', position: 'relative' }}
    >
      <SpiderSVG
        dimensions={dimensions}
        posture={posture}
        size={size}
        onHover={setHovered}
      />
      {hovered && (
        <div
          data-testid="topology-hover-detail"
          style={{
            position: 'absolute',
            bottom: '4px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0d1e2d',
            border: '1px solid rgba(8,145,178,0.3)',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '10px',
            color: '#d1d5db',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {hovered.label}: {Math.round(hovered.value * 100)}%
        </div>
      )}
    </div>
  );
};
