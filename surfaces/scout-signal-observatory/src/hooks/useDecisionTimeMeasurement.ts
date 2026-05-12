// src/hooks/useDecisionTimeMeasurement.ts
// CC_SCOUT_23 — Decision Time Measurement Hook.
// Measures operator time for UAT analysis. Non-blocking.

import { useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DecisionMetrics {
  orientationTimeMs:             number | null;  // target ≤15 000ms
  confidenceUnderstandingTimeMs: number | null;  // target ≤30 000ms
  decisionTimeMs:                number | null;  // target ≤60 000ms
  sessionStartMs:                number;
}

export interface UseDecisionTimeMeasurementReturn {
  metrics:                   DecisionMetrics;
  markOrientationComplete:   () => void;
  markConfidenceUnderstood:  () => void;
  markDecisionMade:          () => void;
  resetMetrics:              () => void;
}

// ─── Targets (ms) ─────────────────────────────────────────────────────────────

export const TARGET_ORIENTATION_MS    =  15_000;
export const TARGET_CONFIDENCE_MS     =  30_000;
export const TARGET_DECISION_MS       =  60_000;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDecisionTimeMeasurement(
  signalId: string
): UseDecisionTimeMeasurementReturn {
  const startRef    = useRef<number>(Date.now());
  const metricsRef  = useRef<DecisionMetrics>({
    orientationTimeMs:             null,
    confidenceUnderstandingTimeMs: null,
    decisionTimeMs:                null,
    sessionStartMs:                startRef.current,
  });

  const markOrientationComplete = useCallback(() => {
    const elapsed = Date.now() - startRef.current;
    metricsRef.current.orientationTimeMs = elapsed;
    const pass = elapsed <= TARGET_ORIENTATION_MS;
    console.log(`[UAT] ${signalId} orientation: ${elapsed}ms (target ≤${TARGET_ORIENTATION_MS}ms) → ${pass ? 'PASS' : 'SLOW'}`);
  }, [signalId]);

  const markConfidenceUnderstood = useCallback(() => {
    const elapsed = Date.now() - startRef.current;
    metricsRef.current.confidenceUnderstandingTimeMs = elapsed;
    const pass = elapsed <= TARGET_CONFIDENCE_MS;
    console.log(`[UAT] ${signalId} confidence understanding: ${elapsed}ms (target ≤${TARGET_CONFIDENCE_MS}ms) → ${pass ? 'PASS' : 'SLOW'}`);
  }, [signalId]);

  const markDecisionMade = useCallback(() => {
    const elapsed = Date.now() - startRef.current;
    metricsRef.current.decisionTimeMs = elapsed;
    const pass = elapsed <= TARGET_DECISION_MS;
    console.log(`[UAT] ${signalId} decision: ${elapsed}ms (target ≤${TARGET_DECISION_MS}ms) → ${pass ? 'PASS' : 'SLOW'}`);
    console.log('[UAT] Full metrics:', JSON.stringify(metricsRef.current));
  }, [signalId]);

  const resetMetrics = useCallback(() => {
    startRef.current   = Date.now();
    metricsRef.current = {
      orientationTimeMs:             null,
      confidenceUnderstandingTimeMs: null,
      decisionTimeMs:                null,
      sessionStartMs:                startRef.current,
    };
  }, []);

  return {
    metrics:                  metricsRef.current,
    markOrientationComplete,
    markConfidenceUnderstood,
    markDecisionMade,
    resetMetrics,
  };
}
