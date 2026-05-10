// Surface Type Definitions — SCOUT Signal Observatory

import { IMSState } from './IMS';

export interface SignalInput {
  raw: string;
  source?: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

export interface SurfaceState {
  imsState: IMSState;
  signal?: SignalInput;
  isLoading: boolean;
}
