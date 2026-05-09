// OrbitFrame v0.1 — Main Wrapper Component
// Status: REFERENCE IMPLEMENTATION
// Authority: SD-ORBIT-UX-SPEC v0.1 / SD-ORBIT-SYSTEM-CANON v1.0
//
// CANON DISCIPLINE:
// - Do not modify orbit_state IDs
// - Do not modify state color values
// - Do not add external animation libraries
// - Do not expose infrastructure names in rendered UI

import React from "react";
import { OrbitFrameProps } from "./OrbitFrame.types";
import { ORBIT_STATES } from "./orbit-states.config";
import { OrbitHeader } from "./OrbitHeader";
import { OrbitVisual } from "./OrbitVisual";
import { UXCMetadata } from "./UXCMetadata";
import "./orbit-frame.css";
import "./orbit-states-colors.css";

export const OrbitFrame: React.FC<OrbitFrameProps> = ({
  surface_id,
  surface_name,
  orbit_state,
  state_meaning,
  recursive_cue,
  uxc_status       = "draft",
  show_orbit_visual = true,
  motion_mode      = "subtle",
  variant          = "desktop",
  children,
}) => {
  const stateConfig = ORBIT_STATES[orbit_state];

  return (
    <div
      className={`orbit-frame orbit-frame--${variant}`}
      data-orbit-state={orbit_state}
      data-surface-id={surface_id}
      data-uxc-status={uxc_status}
      style={{ backgroundColor: stateConfig.backgroundColor }}
    >
      {/* State label + meaning + recursive cue */}
      <OrbitHeader
        state={orbit_state}
        meaning={state_meaning}
        recursiveCue={recursive_cue}
      />

      {/* Static orbit rings + active state indicator */}
      {show_orbit_visual && (
        <OrbitVisual
          activeState={orbit_state}
          motionMode={motion_mode}
        />
      )}

      {/* Surface content slot */}
      <div className="orbit-content">
        {children}
      </div>

      {/* Hidden UXC compliance metadata (JSON-LD) */}
      <UXCMetadata
        surfaceId={surface_id}
        surfaceName={surface_name}
        state={orbit_state}
        status={uxc_status}
      />
    </div>
  );
};

export default OrbitFrame;
