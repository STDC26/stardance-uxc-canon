// CC_SCOUT_09 — signal-classifier.test.ts
// 8 tests covering: signal type classification, base confidence, orbit binding

import { SignalClassifier, signalClassifier } from '../logic/signal-classifier';
import { mapIMSToOrbit, getOrbitLabel, isOrbitActive, ORBITFRAME_VERSION, SCOUT_ORBIT_STATE } from '../logic/orbit-binding';

describe('SignalClassifier', () => {
  let classifier: SignalClassifier;

  beforeEach(() => {
    classifier = new SignalClassifier();
  });

  test('classifies anomaly signal from keyword', () => {
    const result = classifier.classify('anomaly detected in sector 7 baseline deviation +3.2σ');
    expect(result.type).toBe('anomaly');
    expect(result.label).toBe('Anomalous Signal');
    expect(result.confidence).toBe(0.82);
    expect(result.isNovel).toBe(false);
  });

  test('classifies threshold_breach signal from "breach" keyword', () => {
    const result = classifier.classify('threshold breach on zone 3 at 150% capacity');
    expect(result.type).toBe('threshold_breach');
    expect(result.confidence).toBe(0.90);
    expect(result.isNovel).toBe(false);
  });

  test('classifies novel signal and sets isNovel=true', () => {
    const result = classifier.classify('novel signal type XJ-44 no baseline available');
    expect(result.type).toBe('novel');
    expect(result.isNovel).toBe(true);
    expect(result.confidence).toBe(0.55);
  });

  test('classifies unknown signal when no keyword matches', () => {
    const result = classifier.classify('system ping response normal all green');
    expect(result.type).toBe('unknown');
    expect(result.confidence).toBe(0.20);
    expect(result.isNovel).toBe(false);
  });

  test('classifier is case-insensitive', () => {
    const result = classifier.classify('ANOMALY IN SUBSYSTEM B');
    expect(result.type).toBe('anomaly');
  });

  test('singleton signalClassifier instance is available', () => {
    expect(signalClassifier).toBeInstanceOf(SignalClassifier);
    const r = signalClassifier.classify('pattern detected in log stream');
    expect(r.type).toBe('pattern');
    expect(r.confidence).toBe(0.88);
  });
});

describe('OrbitBinding', () => {
  test('mapIMSToOrbit: complete and partial_complete map to signal_sense', () => {
    expect(mapIMSToOrbit('complete')).toBe('signal_sense');
    expect(mapIMSToOrbit('partial_complete')).toBe('signal_sense');
    expect(mapIMSToOrbit('idle')).toBe('idle');
    expect(mapIMSToOrbit('validating')).toBe('validating');
    expect(mapIMSToOrbit('processing')).toBe('processing');
    expect(mapIMSToOrbit('failed')).toBe('failed');
  });

  test('getOrbitLabel returns correct label for each orbit state', () => {
    expect(getOrbitLabel('idle')).toBe('Signal Observatory');
    expect(getOrbitLabel('signal_sense')).toBe('Signal Sense Active');
    expect(getOrbitLabel('failed')).toBe('Signal Failed');
  });

  test('isOrbitActive returns true only for complete and partial_complete', () => {
    expect(isOrbitActive('complete')).toBe(true);
    expect(isOrbitActive('partial_complete')).toBe(true);
    expect(isOrbitActive('idle')).toBe(false);
    expect(isOrbitActive('processing')).toBe(false);
    expect(isOrbitActive('failed')).toBe(false);
  });

  test('OrbitFrame constants are correct', () => {
    expect(ORBITFRAME_VERSION).toBe('OrbitFrame v0.1');
    expect(SCOUT_ORBIT_STATE).toBe('signal_sense');
  });
});
