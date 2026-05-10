// CC_SCOUT_09 — integration.test.ts
// 6 tests: full IMS + confidence flows, classifier + orbit pipeline

import { IMSStateMachine } from '../logic/ims-state-machine';
import { ConfidenceGates } from '../logic/confidence-gates';
import { SignalClassifier } from '../logic/signal-classifier';
import { mapIMSToOrbit, isOrbitActive } from '../logic/orbit-binding';

describe('IMS + ConfidenceGates integration', () => {
  test('full happy path: idle → validating → processing → complete (HIGH confidence)', () => {
    const machine = new IMSStateMachine();
    const gates = new ConfidenceGates();

    expect(machine.getState()).toBe('idle');

    machine.setContext({ input: { raw: 'anomaly detected +3.2σ' }, timestamp: Date.now() });
    expect(machine.transition('validating')).toBe(true);
    expect(machine.getState()).toBe('validating');

    expect(machine.transition('processing')).toBe(true);
    expect(machine.getState()).toBe('processing');

    const confidence = gates.calculate(0.82, 0.87); // 0.845 → HIGH
    expect(gates.getBand(confidence)).toBe('HIGH');

    machine.setContext({ result: { classification: 'anomaly' }, confidence, timestamp: Date.now() });
    expect(machine.transition('complete')).toBe(true);
    expect(machine.getState()).toBe('complete');
  });

  test('partial_complete path: MEDIUM confidence + warnings → partial_complete state', () => {
    const machine = new IMSStateMachine();
    const gates = new ConfidenceGates();

    machine.setContext({ input: { raw: 'novel signal type XJ-44' }, timestamp: Date.now() });
    machine.transition('validating');
    machine.transition('processing');

    const confidence = gates.calculate(0.55); // 0.55 → MEDIUM
    expect(gates.getBand(confidence)).toBe('MEDIUM');
    expect(confidence).toBeGreaterThanOrEqual(0.45);
    expect(confidence).toBeLessThan(0.75);

    machine.setContext({
      result: { classification: 'novel' },
      confidence,
      warnings: ['No baseline available for XJ-44'],
      timestamp: Date.now(),
    });
    expect(machine.transition('partial_complete')).toBe(true);
    expect(machine.getState()).toBe('partial_complete');
  });

  test('orbit reflects signal_sense when IMS reaches complete', () => {
    const machine = new IMSStateMachine();
    machine.setContext({ input: { raw: 'threshold breach zone 3' }, timestamp: Date.now() });
    machine.transition('validating');
    machine.transition('processing');
    machine.setContext({ result: {}, confidence: 0.90, timestamp: Date.now() });
    machine.transition('complete');

    const orbitState = mapIMSToOrbit(machine.getState());
    expect(orbitState).toBe('signal_sense');
    expect(isOrbitActive(machine.getState())).toBe(true);
  });

  test('failed path: missing result blocks complete, triggers failed', () => {
    const machine = new IMSStateMachine();
    machine.setContext({ input: { raw: 'test signal' }, timestamp: Date.now() });
    machine.transition('validating');
    machine.transition('processing');

    // No result set → complete is blocked
    expect(machine.canTransition('complete')).toBe(false);
    // Failed guard: result undefined → allowed
    expect(machine.transition('failed')).toBe(true);
    expect(machine.getState()).toBe('failed');

    // Orbit is not active in failed state
    expect(isOrbitActive(machine.getState())).toBe(false);
  });

  test('reset from complete returns to idle with cleared context', () => {
    const machine = new IMSStateMachine();
    machine.setContext({ input: { raw: 'pattern found' }, timestamp: Date.now() });
    machine.transition('validating');
    machine.transition('processing');
    machine.setContext({ result: { hit: true }, confidence: 0.88, timestamp: Date.now() });
    machine.transition('complete');

    expect(machine.transition('idle')).toBe(true);
    expect(machine.getState()).toBe('idle');
    expect(machine.getContext().result).toBeUndefined();
    expect(machine.getContext().error).toBeUndefined();
  });

  test('classifier + confidence + orbit pipeline end-to-end', () => {
    const classifier = new SignalClassifier();
    const gates = new ConfidenceGates();

    const raw = 'threshold breach on zone 3 at 150%';
    const classification = classifier.classify(raw);
    expect(classification.type).toBe('threshold_breach');
    expect(classification.confidence).toBe(0.90);

    const finalConf = gates.calculate(classification.confidence, 0.87);
    expect(finalConf).toBeCloseTo(0.885);
    expect(gates.getBand(finalConf)).toBe('HIGH');
    expect(gates.canExecuteAction('escalate', finalConf)).toBe(true);

    const orbitState = mapIMSToOrbit('complete');
    expect(orbitState).toBe('signal_sense');
  });
});
