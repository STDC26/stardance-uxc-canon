// OrbitFrame v0.1 — Canonical TypeScript Interfaces
// Status: LOCKED · DO NOT MODIFY
// Authority: SD-ORBIT-SYSTEM-CANON v1.0

import React from "react";

// ── Orbit States ──────────────────────────────────────────────────────────────
// Five canonical intelligence states. IDs are immutable.
// Do not add, remove, or rename state IDs without DRJ approval.

export type OrbitState =
  | "signal_sense"
  | "interpret_intent"
  | "craft_refine"
  | "orchestrate_amplify"
  | "adapt_evolve";

// ── Supporting Types ──────────────────────────────────────────────────────────

export type MotionMode = "none" | "subtle" | "reduced";
export type Variant    = "desktop" | "tablet" | "mobile";
export type UXCStatus  = "draft" | "review" | "verified" | "blocked";

// ── Component Props ───────────────────────────────────────────────────────────

export interface OrbitFrameProps {
  // Required
  surface_id:     string;             // Canonical surface identifier
  surface_name:   string;             // Human-readable surface name
  orbit_state:    OrbitState;         // Currently dominant orbit state
  state_meaning:  string;             // One-line meaning of the current state
  recursive_cue:  string;             // Doctrine-aligned operator cue

  // Optional with defaults
  uxc_status?:         UXCStatus;     // default: "draft"
  show_orbit_visual?:  boolean;       // default: true
  motion_mode?:        MotionMode;    // default: "subtle"
  variant?:            Variant;       // default: "desktop"

  // Content slot
  children: React.ReactNode;
}

// ── State Config Schema ───────────────────────────────────────────────────────

export interface OrbitStateConfig {
  id:              OrbitState;
  label:           string;            // e.g., "SIGNAL & SENSE"
  shortLabel:      string;            // e.g., "SIGNAL"
  meaning:         string;            // e.g., "Detect meaningful movement"
  emotion:         string;            // e.g., "calm perception"
  color:           string;            // Primary hex color — LOCKED
  backgroundColor: string;            // Background hex color — LOCKED
  description:     string;            // Full doctrine-aligned description
}

// ── Sub-Component Props ───────────────────────────────────────────────────────

export interface OrbitHeaderProps {
  state:        OrbitState;
  meaning:      string;
  recursiveCue: string;
}

export interface OrbitVisualProps {
  activeState: OrbitState;
  motionMode:  MotionMode;
}

export interface UXCMetadataProps {
  surfaceId:   string;
  surfaceName: string;
  state:       OrbitState;
  status:      UXCStatus;
}
