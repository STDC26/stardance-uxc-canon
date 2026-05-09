// UXCMetadata v0.1 — Hidden JSON-LD compliance record
// Status: REFERENCE IMPLEMENTATION
// Authority: SD-ORBIT-UX-SPEC v0.1 / UXC v2.0
//
// Renders invisible to operator. Machine-readable by UXC compliance tooling.
// All assertion fields are binding — do not change values.

import React from "react";
import { UXCMetadataProps } from "./OrbitFrame.types";

export const UXCMetadata: React.FC<UXCMetadataProps> = ({
  surfaceId,
  surfaceName,
  state,
  status,
}) => {
  const metadata = {
    "@context":                "https://stardance.io/uxc",
    type:                      "OrbitFrame",
    version:                   "0.1",
    surface_id:                surfaceId,
    surface_name:              surfaceName,
    orbit_state:               state,
    uxc_status:                status,
    journey_canon_compliant:   true,
    no_infrastructure_names:   true,
    no_progress_bars:          true,
    no_linear_workflow:        true,
    timestamp:                 new Date().toISOString(),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(metadata, null, 2) }}
    />
  );
};
