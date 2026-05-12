// src/adapters/reporting/ethics-gate-adapter.ts
// CC_SCOUT_22 — Ethics Gate Adapter.
// Extract gate rationale for display and explain failures.

import type { EthicsGatesWithRationale, EthicsGateRationale } from '../../ingestion/normalization-pipeline';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GateDisplay {
  readonly name:        string;
  readonly passed:      boolean;
  readonly reason:      string;
  readonly explanation: string;   // what this gate means
  readonly immutable:   true;
}

export interface EthicsGateReport {
  readonly gates:   GateDisplay[];
  readonly allPass: boolean;
  readonly verdict: string;        // e.g. "✓ All ethics gates pass — escalation permitted"
  readonly blockedActions: string[];
  readonly immutable: true;
}

// ─── Gate explanations ────────────────────────────────────────────────────────

const GATE_EXPLANATIONS: Record<string, string> = {
  safety:  'Ensures the signal and recommended action do not create unsafe conditions.',
  delight: 'Ensures the action aligns with positive user outcomes and experience.',
  harmony: 'Ensures the action does not conflict with system-wide operational harmony.',
};

// ─── Adapter ─────────────────────────────────────────────────────────────────

export function toEthicsGateReport(
  ethicsGates: EthicsGatesWithRationale | unknown
): EthicsGateReport {
  const gates = ethicsGates as Record<string, EthicsGateRationale | { passed: boolean; reason?: string }>;

  const gateNames = ['safety', 'delight', 'harmony'] as const;
  const displays: GateDisplay[] = gateNames.map(name => {
    const gate = gates?.[name];
    const passed = gate?.passed !== false;
    const reason = (gate as { reason?: string })?.reason ?? (passed ? `${name} gate passed` : `${name} gate failed`);
    return {
      name,
      passed,
      reason,
      explanation: GATE_EXPLANATIONS[name] ?? 'Ethics gate check.',
      immutable:   true as const,
    };
  });

  const allPass = displays.every(g => g.passed);
  const failed  = displays.filter(g => !g.passed);

  let verdict: string;
  if (allPass) {
    verdict = '✓ All ethics gates pass — escalation permitted';
  } else {
    const names = failed.map(g => g.name).join(', ');
    verdict = `✗ ${names} gate${failed.length > 1 ? 's' : ''} failed — escalation blocked`;
  }

  const blockedActions = allPass ? [] : ['escalate'];

  return {
    gates:         displays,
    allPass,
    verdict,
    blockedActions,
    immutable:     true as const,
  };
}
