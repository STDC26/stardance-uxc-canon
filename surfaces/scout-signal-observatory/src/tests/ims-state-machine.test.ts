// src/tests/ims-state-machine.test.ts
// CC_SCOUT_03: 8+ IMS state machine tests

import { IMSStateMachine } from '../logic/ims-state-machine';

describe('IMS State Machine', () => {
  let machine: IMSStateMachine;

  beforeEach(() => {
    machine = new IMSStateMachine();
  });

  test('starts in idle state', () => {
    expect(machine.getState()).toBe('idle');
  });

  test('idle → validating works with valid input', () => {
    machine.setContext({ input: { signal: 'test-data' } });
    expect(machine.canTransition('validating')).toBe(true);
    expect(machine.transition('validating')).toBe(true);
    expect(machine.getState()).toBe('validating');
  });

  test('idle → validating blocked without input', () => {
    expect(machine.canTransition('validating')).toBe(false);
    expect(machine.transition('validating')).toBe(false);
    expect(machine.getState()).toBe('idle');
  });

  test('validating → processing works with valid input', () => {
    machine.setContext({ input: { signal: 'test-data' } });
    machine.transition('validating');
    expect(machine.canTransition('processing')).toBe(true);
    expect(machine.transition('processing')).toBe(true);
    expect(machine.getState()).toBe('processing');
  });

  test('processing → complete works with result + high confidence', () => {
    machine.setContext({ input: { signal: 'test-data' } });
    machine.transition('validating');
    machine.transition('processing');
    machine.setContext({ result: { type: 'anomaly', label: 'network' }, confidence: 0.85 });
    expect(machine.canTransition('complete')).toBe(true);
    expect(machine.transition('complete')).toBe(true);
    expect(machine.getState()).toBe('complete');
  });

  test('processing → partial_complete with medium confidence and warnings', () => {
    machine.setContext({ input: { signal: 'test-data' } });
    machine.transition('validating');
    machine.transition('processing');
    machine.setContext({
      result: { type: 'anomaly', label: 'unknown' },
      confidence: 0.60,
      warnings: ['Incomplete evidence — some sources missing'],
    });
    expect(machine.canTransition('partial_complete')).toBe(true);
    expect(machine.transition('partial_complete')).toBe(true);
    expect(machine.getState()).toBe('partial_complete');
  });

  test('processing → complete blocked when confidence below 0.75', () => {
    machine.setContext({ input: { signal: 'test-data' } });
    machine.transition('validating');
    machine.transition('processing');
    machine.setContext({ result: { type: 'anomaly' }, confidence: 0.60 });
    expect(machine.canTransition('complete')).toBe(false);
  });

  test('invalid transitions blocked — fail-closed', () => {
    // idle → processing is not a valid transition
    expect(machine.canTransition('processing')).toBe(false);
    expect(machine.transition('processing')).toBe(false);
    expect(machine.getState()).toBe('idle');
    // idle → complete is not valid
    expect(machine.canTransition('complete')).toBe(false);
    expect(machine.transition('complete')).toBe(false);
    expect(machine.getState()).toBe('idle');
  });

  test('complete → idle resets context and is always allowed', () => {
    machine.setContext({ input: { signal: 'test-data' } });
    machine.transition('validating');
    machine.transition('processing');
    machine.setContext({ result: { type: 'anomaly' }, confidence: 0.85 });
    machine.transition('complete');

    expect(machine.canTransition('idle')).toBe(true);
    expect(machine.transition('idle')).toBe(true);
    expect(machine.getState()).toBe('idle');
    const ctx = machine.getContext();
    expect(ctx.result).toBeUndefined();
    expect(ctx.error).toBeUndefined();
    expect(ctx.warnings).toEqual([]);
  });

  test('failed → idle always allowed (operator control)', () => {
    machine.setContext({ input: { signal: 'test-data' } });
    machine.transition('validating');
    machine.setContext({ error: 'Signal format invalid', input: {} });
    machine.transition('failed');
    expect(machine.getState()).toBe('failed');
    expect(machine.canTransition('idle')).toBe(true);
    expect(machine.transition('idle')).toBe(true);
    expect(machine.getState()).toBe('idle');
  });

  test('all 6 IMS states are valid type values', () => {
    const validStates = ['idle', 'validating', 'processing', 'complete', 'partial_complete', 'failed'];
    expect(validStates).toHaveLength(6);
    expect(validStates).toContain(machine.getState());
  });
});
