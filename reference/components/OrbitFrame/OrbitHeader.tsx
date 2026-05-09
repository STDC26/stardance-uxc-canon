// OrbitHeader v0.1 — State label + meaning + recursive cue
// Status: REFERENCE IMPLEMENTATION
// Authority: SD-ORBIT-UX-SPEC v0.1

import React from "react";
import { OrbitHeaderProps } from "./OrbitFrame.types";
import { ORBIT_STATES } from "./orbit-states.config";

export const OrbitHeader: React.FC<OrbitHeaderProps> = ({
  state,
  meaning,
  recursiveCue,
}) => {
  const stateConfig = ORBIT_STATES[state];

  return (
    <div className="orbit-header">
      {/* Logo mark + state label */}
      <div className="orbit-header-top">
        {/* Stardance logo mark (mini) — replace with brand asset */}
        <svg
          className="stardance-logo-mini"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="4" fill={stateConfig.color} opacity="0.9" />
          <circle cx="10" cy="10" r="8" fill="none" stroke={stateConfig.color} strokeWidth="1" opacity="0.4" />
        </svg>

        <span
          className="orbit-state-label"
          style={{ color: stateConfig.color }}
        >
          {stateConfig.label}
        </span>
      </div>

      {/* State meaning — one line */}
      <p className="orbit-state-meaning">
        {meaning}
      </p>

      {/* Recursive intelligence cue */}
      <p className="orbit-recursive-cue">
        {recursiveCue}
      </p>
    </div>
  );
};
