// CC_SCOUT_09 — confidence-gates.test.ts
// 8 tests covering: calculation, hard cap, bands, action gates, ethics gates

import { ConfidenceGates, CONFIDENCE_HARD_CAP, CONFIDENCE_THRESHOLDS } from '../logic/confidence-gates';

describe('ConfidenceGates', () => {
  let gates: ConfidenceGates;

  beforeEach(() => {
    gates = new ConfidenceGates();
  });

  // --- Constants ---
  test('CONFIDENCE_HARD_CAP is 0.92', () => {
    expect(CONFIDENCE_HARD_CAP).toBe(0.92);
  });

  test('CONFIDENCE_THRESHOLDS bands are correctly defined', () => {
    expect(CONFIDENCE_THRESHOLDS.HIGH).toBe(0.75);
    expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBe(0.45);
    expect(CONFIDENCE_THRESHOLDS.LOW).toBe(0.0);
  });

  // --- calculate() ---
  test('calculate() averages factors and caps at 0.92', () => {
    // Average of 0.80, 0.90 = 0.85 — below cap
    expect(gates.calculate(0.80, 0.90)).toBeCloseTo(0.85);
    // Value exceeding cap is capped
    expect(gates.calculate(0.95, 0.99)).toBe(CONFIDENCE_HARD_CAP);
  });

  test('calculate() returns 0 for empty input', () => {
    expect(gates.calculate()).toBe(0);
  });

  // --- calculateWeighted() ---
  test('calculateWeighted() respects weights and caps at 0.92', () => {
    const result = gates.calculateWeighted([
      { value: 0.80, weight: 1 },
      { value: 0.90, weight: 3 },
    ]);
    // (0.80*1 + 0.90*3) / 4 = (0.80 + 2.70) / 4 = 3.50 / 4 = 0.875
    expect(result).toBeCloseTo(0.875);

    // Values averaging > 0.92 are capped
    const capped = gates.calculateWeighted([
      { value: 0.95, weight: 1 },
      { value: 0.98, weight: 1 },
    ]);
    expect(capped).toBe(CONFIDENCE_HARD_CAP);
  });

  // --- getBand() ---
  test('getBand() returns correct band for each level', () => {
    expect(gates.getBand(0.90)).toBe('HIGH');
    expect(gates.getBand(0.75)).toBe('HIGH');    // boundary
    expect(gates.getBand(0.74)).toBe('MEDIUM');
    expect(gates.getBand(0.45)).toBe('MEDIUM');  // boundary
    expect(gates.getBand(0.44)).toBe('LOW');
    expect(gates.getBand(0.00)).toBe('LOW');
  });

  // --- canExecuteAction() ---
  test('canExecuteAction() enforces fail-closed action thresholds', () => {
    // escalate requires 0.75
    expect(gates.canExecuteAction('escalate', 0.80)).toBe(true);
    expect(gates.canExecuteAction('escalate', 0.74)).toBe(false);

    // investigate requires 0.45
    expect(gates.canExecuteAction('investigate', 0.50)).toBe(true);
    expect(gates.canExecuteAction('investigate', 0.44)).toBe(false);

    // suppress requires 0.75
    expect(gates.canExecuteAction('suppress', 0.80)).toBe(true);
    expect(gates.canExecuteAction('suppress', 0.74)).toBe(false);

    // export requires 0.45
    expect(gates.canExecuteAction('export', 0.50)).toBe(true);
    expect(gates.canExecuteAction('export', 0.44)).toBe(false);

    // unknown action → block (fail-closed)
    expect(gates.canExecuteAction('unknown_action', 0.99)).toBe(false);
  });

  // --- passesEthicsGate() ---
  test('passesEthicsGate() requires all three gates to pass', () => {
    expect(gates.passesEthicsGate(true, true, true)).toBe(true);
    expect(gates.passesEthicsGate(false, true, true)).toBe(false);
    expect(gates.passesEthicsGate(true, false, true)).toBe(false);
    expect(gates.passesEthicsGate(true, true, false)).toBe(false);
    expect(gates.passesEthicsGate(false, false, false)).toBe(false);
  });

  // --- formatPercent() ---
  test('formatPercent() formats confidence as percentage string', () => {
    expect(gates.formatPercent(0.87)).toBe('87%');
    expect(gates.formatPercent(0.5)).toBe('50%');
    expect(gates.formatPercent(0.0)).toBe('0%');
    expect(gates.formatPercent(1.0)).toBe('100%');
  });

  // --- getBandColor() ---
  test('getBandColor() returns correct color token per band', () => {
    expect(gates.getBandColor('HIGH')).toBe('#10b981');
    expect(gates.getBandColor('MEDIUM')).toBe('#f59e0b');
    expect(gates.getBandColor('LOW')).toBe('#ef4444');
  });
});
