// OrbitVisual v0.1 — Static orbit rings + active state indicator
// Status: REFERENCE IMPLEMENTATION
// Authority: SD-ORBIT-UX-SPEC v0.1
//
// v0.1 constraint: No external animation libraries.
// Subtle pulse via inline CSS keyframes only.
// Full motion engine is post-launch (SD-ORBIT-MOTION-ENGINE-v0.1).

import React from "react";
import { OrbitVisualProps } from "./OrbitFrame.types";
import { ORBIT_STATES } from "./orbit-states.config";

export const OrbitVisual: React.FC<OrbitVisualProps> = ({
  activeState,
  motionMode,
}) => {
  const stateConfig = ORBIT_STATES[activeState];
  const applyPulse  = motionMode === "subtle";

  return (
    <div className="orbit-visual-container" aria-hidden="true">
      {/* Central anchor (represents the operator) */}
      <div className="orbit-center" />

      {/* Concentric rings — static SVG, no animation dependency */}
      <svg
        className="orbit-rings"
        viewBox="0 0 200 200"
        width="200"
        height="200"
      >
        <circle cx="100" cy="100" r="60"  fill="none" stroke="#ffffff" opacity="0.20" strokeWidth="1" />
        <circle cx="100" cy="100" r="80"  fill="none" stroke="#ffffff" opacity="0.15" strokeWidth="1" />
        <circle cx="100" cy="100" r="100" fill="none" stroke="#ffffff" opacity="0.10" strokeWidth="1" />
      </svg>

      {/* Active state indicator */}
      <div
        className={`orbit-state-dot orbit-state-dot--${activeState}${applyPulse ? " orbit-state-dot--pulse" : ""}`}
        style={{ borderColor: stateConfig.color, color: stateConfig.color }}
      >
        <span className="dot-label">
          {stateConfig.shortLabel}
        </span>
      </div>

      {/* Inline CSS pulse — no animation library required */}
      {applyPulse && (
        <style>{`
          @keyframes orbit-pulse {
            0%,  100% { opacity: 0.8; transform: scale(1);    }
            50%        { opacity: 1.0; transform: scale(1.05); }
          }
          .orbit-state-dot--pulse {
            animation: orbit-pulse 3s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .orbit-state-dot--pulse { animation: none; }
          }
        `}</style>
      )}
    </div>
  );
};
