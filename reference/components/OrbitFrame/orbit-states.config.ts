// Canonical Orbit State Configuration
// Status: CANONICAL · LOCKED · BINDING
// Authority: SD-ORBIT-SYSTEM-CANON v1.0
//
// DO NOT modify state IDs, labels, meanings, or color values.
// These are binding across all Orbit surfaces and tooling.

import { OrbitStateConfig, OrbitState } from "./OrbitFrame.types";

export const ORBIT_STATES: Record<OrbitState, OrbitStateConfig> = {
  signal_sense: {
    id:              "signal_sense",
    label:           "SIGNAL & SENSE",
    shortLabel:      "SIGNAL",
    meaning:         "Detect meaningful movement",
    emotion:         "calm perception",
    color:           "#0891B2",
    backgroundColor: "#164e63",
    description:
      "You're sensing what's emerging in your market or domain. " +
      "Part of your continuous intelligence evolution.",
  },

  interpret_intent: {
    id:              "interpret_intent",
    label:           "INTERPRET & INTENT",
    shortLabel:      "INTERPRET",
    meaning:         "Form directional intelligence",
    emotion:         "focused clarity",
    color:           "#0EA5E9",
    backgroundColor: "#0c4a6e",
    description:
      "You're understanding what this signal means and what to do about it. " +
      "Your creative hypothesis is taking shape.",
  },

  craft_refine: {
    id:              "craft_refine",
    label:           "CRAFT & REFINE",
    shortLabel:      "CRAFT",
    meaning:         "Structure and improve intelligence",
    emotion:         "controlled sophistication",
    color:           "#A855F7",
    backgroundColor: "#581c87",
    description:
      "You're building and refining your response with precision. " +
      "Your intelligence is being refined into reality.",
  },

  orchestrate_amplify: {
    id:              "orchestrate_amplify",
    label:           "ORCHESTRATE & AMPLIFY",
    shortLabel:      "ORCHESTRATE",
    meaning:         "Coordinate and scale outcomes",
    emotion:         "synchronized expansion",
    color:           "#FBBF24",
    backgroundColor: "#78350f",
    description:
      "Your intelligence is now coordinated and amplified at scale. " +
      "Your impact is synchronized and expanded.",
  },

  adapt_evolve: {
    id:              "adapt_evolve",
    label:           "ADAPT & EVOLVE",
    shortLabel:      "ADAPT",
    meaning:         "Continuously learn and optimize",
    emotion:         "recursive maturation",
    color:           "#10B981",
    backgroundColor: "#064e3b",
    description:
      "You're learning from what happened and evolving your capability. " +
      "Your intelligence is continuously improving.",
  },
} as const;

// Helper: Get state config by ID
export const getStateConfig = (state: OrbitState): OrbitStateConfig =>
  ORBIT_STATES[state];

// Helper: All state IDs in canonical order
export const ORBIT_STATE_IDS: OrbitState[] = [
  "signal_sense",
  "interpret_intent",
  "craft_refine",
  "orchestrate_amplify",
  "adapt_evolve",
];
