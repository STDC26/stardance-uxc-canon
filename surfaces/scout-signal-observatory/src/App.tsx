import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { IMSState, IMSContext, Signal } from './types/IMS';
import { EvidenceTrace } from './types/Evidence';
import { GoverneAction } from './types/Decision';
import { IMSStateMachine } from './logic/ims-state-machine';
import { ScoutRuntimeOrchestrator } from './orchestration/ScoutRuntimeOrchestrator';
import { ConfidenceGates } from './logic/confidence-gates';
import { SignalClassifier } from './logic/signal-classifier';
import { InterpretationModel } from './logic/interpretation-model';
import { EvidenceModel } from './logic/evidence-model';
import type { CQXCanonical } from './ingestion/cqx-generator';
import { globalSignalStore } from './persistence/signal-store';
import type { StoredSignal } from './persistence/signal-store';

import { OrbitHeader } from './components/OrbitHeader';
import { StateIndicator } from './components/StateIndicator';
import { SignalCard } from './components/SignalCard';
import { CQXSequence } from './components/CQXSequence';
import { EvidencePanel } from './components/EvidencePanel';
import { TrustRail } from './components/TrustRail';
import { EthicsGate } from './components/EthicsGate';
import { OperatorActionBar } from './components/OperatorActionBar';
import { SignalObservatory } from './components/SignalObservatory';
import { ReportingRoute }   from './routes/reporting';
import { seedSignalStore }  from './utils/seed-signal-store';

import './styles/main.css';

const classifier  = new SignalClassifier();
const gates       = new ConfidenceGates();
const interp      = new InterpretationModel();
const evidModel   = new EvidenceModel();

// Phase 5.5: Mock scenario type
interface MockScenario {
  id: string;
  name: string;
  description?: string;
  imsState: IMSState;
  context?: string;
  outcome?: string;
  meaning?: string;
  confidence?: number;
  confidenceBand?: string;
  risks?: string[];
  recommendedActions?: string[];
  ethicsGate?: {
    safetyCheck: boolean;
    delightCheck: boolean;
    harmonyCheck: boolean;
    reason: string;
  };
  error?: string;
  errorDetails?: string;
  recoveryPath?: string[];
  nextAction?: string;
  evidence?: Array<{ source: string; weight: number }>;
}

// Phase 5.5: Scenario selector bar
const ScenarioSelector: React.FC<{
  scenarios: MockScenario[];
  selectedId: string;
  onChange: (id: string) => void;
}> = ({ scenarios, selectedId, onChange }) => (
  <div style={{
    padding: '10px 20px',
    background: '#081520',
    borderBottom: '1px solid rgba(8,145,178,0.25)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  }}>
    <span style={{ fontSize: '11px', color: '#7090a0', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
      Demo Scenario
    </span>
    <select
      id="scenario-select"
      value={selectedId}
      onChange={e => onChange(e.target.value)}
      style={{
        background: '#0d1e2d',
        border: '1px solid rgba(8,145,178,0.3)',
        borderRadius: '6px',
        color: '#e0f0f8',
        fontSize: '13px',
        padding: '6px 10px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        flex: 1,
        minWidth: '220px',
        maxWidth: '400px',
      }}
    >
      <option value="">— Select a scenario —</option>
      {scenarios.map(s => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
    <span style={{ fontSize: '10px', color: '#4a6070' }}>Phase 5.5 · Mock data · UAT preview</span>
  </div>
);

// Convert MockScenario to IMS Signal for orchestrator consumption
function convertScenarioToSignal(scenario: MockScenario): Signal {
  return {
    id: scenario.id,
    type: 'anomaly',
    confidence: Math.min(scenario.confidence ?? 0.5, 0.92),
    meaning: scenario.meaning ?? 'Signal detected in monitored environment',
    evidence: scenario.evidence ?? [{ source: 'Detector', weight: 0.72 }],
    imsState: scenario.imsState,
    timestamp: Date.now(),
    ethicsGates: scenario.ethicsGate
      ? { safety: scenario.ethicsGate.safetyCheck, delight: scenario.ethicsGate.delightCheck, harmony: scenario.ethicsGate.harmonyCheck }
      : { safety: true, delight: true, harmony: true },
  };
}

// Phase 5.5: Render mock scenario using Phase 5 components
const MockScenarioView: React.FC<{ scenario: MockScenario; onAction: (action: GoverneAction) => void }> = ({ scenario, onAction }) => {
  if (scenario.imsState === 'failed') {
    return (
      <div style={{ padding: '20px', maxWidth: '800px' }}>
        <div style={{ textAlign: 'center', padding: '24px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', background: 'rgba(239,68,68,0.06)' }}>
          <div style={{ color: '#ef4444', fontSize: '24px', marginBottom: '8px' }}>✕</div>
          <div style={{ fontWeight: 600, color: '#f87171', marginBottom: '6px' }}>{scenario.error}</div>
          <div style={{ color: '#7090a0', fontSize: '12px', marginBottom: '16px' }}>{scenario.errorDetails}</div>
          {scenario.recoveryPath && (
            <div style={{ textAlign: 'left', background: '#0d1e2d', borderRadius: '8px', padding: '12px 16px' }}>
              <div style={{ fontSize: '11px', color: '#7090a0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Recovery Path</div>
              <ul style={{ margin: 0, paddingLeft: '16px', color: '#d1d5db', fontSize: '13px', lineHeight: '1.8' }}>
                {scenario.recoveryPath.map((step, i) => <li key={i}>{step}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Build CQXCanonical from scenario data — v1.0.1 canonical shape
  const confidence = Math.min(scenario.confidence ?? 0.5, 0.92);
  const riskAssessment = (scenario.risks ?? []).join(', ') || 'Monitor for changes';

  const cqx: CQXCanonical = {
    context:  scenario.context  ?? 'Signal detected in monitored environment.',
    outcome:  scenario.outcome  ?? 'Signal classification in progress.',
    meaning:  scenario.meaning  ?? 'Pattern identified — interpretation pending.',
    strengthAndRisk: { confidence, riskAssessment },
    action:   (scenario.recommendedActions ?? ['Review signal']).join(' · '),
  };

  const evidSources = (scenario.evidence ?? []).map((e, i) => ({
    id: `src-${i}`,
    name: e.source,
    confidence: e.weight,
    description: `Evidence source: ${e.source}`,
  }));
  const evidTrace: EvidenceTrace = {
    sources: evidSources,
    signalsUsed: evidSources.map(s => s.id),
    sourceCount: evidSources.length,
    canonApplied: ['stardance-canon-v3.0'],
  };

  const imsState = scenario.imsState;

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      {/* Ethics gate alert */}
      {scenario.ethicsGate && (
        <div style={{ marginBottom: '16px' }}>
          <EthicsGate
            safetyStatus={scenario.ethicsGate.safetyCheck}
            delightStatus={scenario.ethicsGate.delightCheck}
            harmonyStatus={scenario.ethicsGate.harmonyCheck}
          />
          <div style={{ marginTop: '10px', padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', color: '#f59e0b', fontSize: '12px' }}>
            ⚠ {scenario.ethicsGate.reason}
          </div>
        </div>
      )}

      {/* Signal description */}
      <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#d1d5db', background: '#0a0e1a', borderRadius: '8px', padding: '10px', marginBottom: '12px', wordBreak: 'break-all' }}>
        {scenario.description}
      </div>

      {/* Partial result warning */}
      {imsState === 'partial_complete' && (
        <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', borderRadius: '8px', color: '#f59e0b', padding: '10px 14px', marginBottom: '14px', fontSize: '12px' }}>
          ⚠ Partial result — evidence incomplete. Review before acting.
        </div>
      )}

      {/* CQX Sequence + sidebar — using Phase 5 components */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '20px', alignItems: 'start' }}>
        <CQXSequence cqx={cqx} imsState={imsState} onAction={onAction} />
        <div>
          {evidSources.length > 0 && <EvidencePanel evidence={evidTrace} />}
          <div style={{ marginTop: '12px' }}>
            <TrustRail trust={{ score: confidence, factors: [], decayActive: false }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  // Gate rendering until seed completes — prevents ReportingRoute race condition
  // where store.getSignal() fires before seedSignalStore() has stored the signals.
  const [seedReady, setSeedReady] = useState(false);

  useEffect(() => {
    fetch('/mock-scenarios.json')
      .then(r => r.json())
      .then(data => seedSignalStore(data.scenarios ?? []))
      .catch(() => {})
      .finally(() => setSeedReady(true));
  }, []);

  if (!seedReady) return null;

  return (
    <Routes>
      {/* /scout/reporting/:signalId — Reporting Surface (Build 2) */}
      <Route path="/scout/reporting/:signalId" element={<ReportingRouteWrapper />} />
      {/* /reporting/:signalId — short alias for UAT convenience */}
      <Route path="/reporting/:signalId"       element={<ReportingRouteWrapper />} />
      {/* / — Main SCOUT Observatory */}
      <Route path="*" element={<ScoutMainApp />} />
    </Routes>
  );
};

// ─── Reporting Route wrapper — reads :signalId param ─────────────────────────

const ReportingRouteWrapper: React.FC = () => {
  const { signalId = '' } = useParams<{ signalId: string }>();
  return (
    <ReportingRoute
      signalId={signalId}
      store={globalSignalStore}
      operatorId="operator-uat-001"
    />
  );
};

// ─── Main SCOUT app (all original logic) ─────────────────────────────────────

const ScoutMainApp: React.FC = () => {
  const machineRef = useRef(new IMSStateMachine());
  const orchestratorRef = useRef(new ScoutRuntimeOrchestrator(globalSignalStore));
  const [imsState, setImsState] = useState<IMSState>('idle');
  const [ctx, setCtx]           = useState<IMSContext>({ timestamp: Date.now() });
  const [signalInput, setSignalInput] = useState('');
  const [cqx, setCqx]           = useState<CQXCanonical | null>(null);
  const [evidence, setEvidence] = useState<EvidenceTrace | null>(null);
  const [currentSignal, setCurrentSignal] = useState<Signal | null>(null);

  const [scenarios, setScenarios]           = useState<MockScenario[]>([]);
  const [selectedScenarioId, setSelectedId] = useState('');
  const [activeScenario, setActiveScenario] = useState<MockScenario | null>(null);
  const [hasStoreSignals, setHasStoreSignals] = useState(false);

  useEffect(() => {
    (async () => {
      const live = await globalSignalStore.getSignalsByImsState('processing');
      if (live.length > 0) setHasStoreSignals(true);
    })();
  }, []);

  const machine = machineRef.current;

  useEffect(() => {
    fetch('/mock-scenarios.json')
      .then(res => res.json())
      .then(data => {
        const sc: MockScenario[] = data.scenarios ?? [];
        setScenarios(sc);
        if (sc.length > 0) {
          setSelectedId(sc[0].id);
          setActiveScenario(sc[0]);
          const signal = convertScenarioToSignal(sc[0]);
          orchestratorRef.current.loadSignal(signal);
          setCurrentSignal(signal);
        }
      })
      .catch(() => {});
  }, []);

  const handleScenarioChange = useCallback((id: string) => {
    setSelectedId(id);
    const sc = scenarios.find(s => s.id === id) ?? null;
    setActiveScenario(sc);
    if (sc) {
      const signal = convertScenarioToSignal(sc);
      orchestratorRef.current.loadSignal(signal);
      setCurrentSignal(signal);
    }
  }, [scenarios]);

  const syncState = () => {
    setImsState(machine.getState());
    setCtx({ ...machine.getContext() });
  };

  const handleSubmit = useCallback(async () => {
    if (!signalInput.trim()) return;
    const m = machine;
    m.setContext({ input: { raw: signalInput } });
    m.transition('validating');
    syncState();
    await new Promise((r) => setTimeout(r, 300));
    if (!signalInput.trim()) {
      m.setContext({ error: 'Signal input is empty' });
      m.transition('failed');
      syncState();
      return;
    }
    m.transition('processing');
    syncState();
    await new Promise((r) => setTimeout(r, 600));
    const classification = classifier.classify(signalInput);
    const interpretation  = interp.interpret(classification.type, classification.confidence);
    const evidSources = [
      { id: 'src-1', name: 'Pattern Matcher',     confidence: classification.confidence, description: 'Keyword and pattern analysis' },
      { id: 'src-2', name: 'Baseline Comparator', confidence: Math.min(classification.confidence + 0.05, 0.92), description: 'Baseline deviation analysis' },
    ];
    const ev = evidModel.synthesize(evidSources);
    const confidence = gates.calculate(classification.confidence, evidModel.combineConfidence(evidSources));
    const cqxData: CQXCanonical = {
      context:  'Operational signal detected in monitored environment',
      outcome:  `${classification.label} — raw input: "${signalInput.slice(0, 60)}"`,
      meaning:  interpretation.meaning,
      strengthAndRisk: { confidence, riskAssessment: interpretation.riskLevel },
      action:   interpretation.recommendedAction,
    };
    m.setContext({ result: classification, confidence });
    if (confidence >= 0.75) {
      m.transition('complete');
    } else if (confidence >= 0.45) {
      m.setContext({ warnings: ['Partial evidence — confidence below high threshold'] });
      m.transition('partial_complete');
    } else {
      m.setContext({ error: 'Confidence too low for reliable classification' });
      m.transition('failed');
    }
    setCqx(cqxData);
    setEvidence(ev);
    syncState();
  }, [signalInput]);

  const handleReset = useCallback(() => {
    machine.transition('idle');
    setSignalInput('');
    setCqx(null);
    setEvidence(null);
    syncState();
  }, []);

  const handleAction = useCallback(async (actionId: GoverneAction) => {
    const signal = currentSignal;
    if (!signal) return;
    const orchestrator = orchestratorRef.current;
    const operatorId = 'operator-uat-001';
    switch (actionId) {
      case 'escalate': {
        const result = await orchestrator.doEscalate(signal, operatorId);
        if (result.success) {
          const updated: Signal = { ...signal, imsState: result.newState };
          setCurrentSignal(updated);
          setActiveScenario(prev => prev ? { ...prev, imsState: result.newState } : prev);
        }
        break;
      }
      case 'investigate': {
        const result = orchestrator.doInvestigateAsync(signal, signal.evidence);
        if (result.executing) {
          const updated: Signal = { ...signal, imsState: 'investigating' };
          setCurrentSignal(updated);
          setActiveScenario(prev => prev ? { ...prev, imsState: 'investigating' } : prev);
        }
        break;
      }
      case 'suppress': {
        const result = orchestrator.doSuppress(signal, operatorId, 'Suppressed by operator');
        if (result.success) {
          const updated: Signal = { ...signal, imsState: result.newState };
          setCurrentSignal(updated);
          setActiveScenario(prev => prev ? { ...prev, imsState: result.newState } : prev);
        }
        break;
      }
      case 'trigger_research': {
        const result = orchestrator.doResearchAsync(signal, { id: operatorId });
        if (result.researching) {
          const updated: Signal = { ...signal, imsState: 'researching' };
          setCurrentSignal(updated);
          setActiveScenario(prev => prev ? { ...prev, imsState: 'researching' } : prev);
        }
        break;
      }
      case 'mark_learning_signal': {
        const result = orchestrator.doMarkAsLearning(signal, operatorId, 'correctly_classified');
        if (result.success) {
          const updated: Signal = { ...signal, imsState: result.newState };
          setCurrentSignal(updated);
          setActiveScenario(prev => prev ? { ...prev, imsState: result.newState } : prev);
        }
        break;
      }
      default: break;
    }
  }, [currentSignal]);

  const handleStoreAction = useCallback(async (action: GoverneAction, signal: StoredSignal) => {
    const operatorId = 'operator-uat-001';
    const orch = orchestratorRef.current;
    const runtimeSignal = signal as unknown as Signal;
    switch (action) {
      case 'escalate':             await orch.doEscalate(runtimeSignal, operatorId); break;
      case 'investigate':          orch.doInvestigateAsync(runtimeSignal, runtimeSignal.evidence); break;
      case 'suppress':             orch.doSuppress(runtimeSignal, operatorId, 'Suppressed by operator'); break;
      case 'trigger_research':     orch.doResearchAsync(runtimeSignal, { id: operatorId }); break;
      case 'mark_learning_signal': orch.doMarkAsLearning(runtimeSignal, operatorId, 'correctly_classified'); break;
      default: break;
    }
    const updated = await globalSignalStore.getSignal(signal.signalId);
    if (updated) await globalSignalStore.updateRuntimeState(signal.signalId, orch.getState(), operatorId);
  }, []);

  const showResult = imsState === 'complete' || imsState === 'partial_complete';
  const displayState: IMSState = activeScenario ? activeScenario.imsState : imsState;

  return (
    <div className="scout-root">
      {/* Phase 5.5: Scenario selector — shown when mock scenarios loaded */}
      {scenarios.length > 0 && (
        <ScenarioSelector
          scenarios={scenarios}
          selectedId={selectedScenarioId}
          onChange={handleScenarioChange}
        />
      )}

      <header className="scout-header">
        <OrbitHeader imsState={displayState} />
        <div className="scout-title">
          <h1>SCOUT Signal Observatory</h1>
          <StateIndicator imsState={displayState} />
        </div>
      </header>

      <main className="scout-main">
        {/* CC_SCOUT_19: Live signal mode — real signals from store take priority */}
        {hasStoreSignals ? (
          <SignalObservatory
            store={globalSignalStore}
            onAction={handleStoreAction}
            operatorId="operator-uat-001"
          />
        ) : activeScenario ? (
          <MockScenarioView scenario={activeScenario} onAction={handleAction} />
        ) : (
          <>
            {/* Manual signal analysis — existing Phase 5 flow unchanged */}
            {imsState === 'idle' && (
              <div className="scout-input-area">
                <label className="input-label">Load signal input</label>
                <textarea
                  className="signal-input"
                  value={signalInput}
                  onChange={(e) => setSignalInput(e.target.value)}
                  placeholder="Paste signal data, event log, or observation..."
                  rows={4}
                />
                <button
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={!signalInput.trim()}
                >
                  Analyse Signal
                </button>
              </div>
            )}

            {imsState === 'validating' && (
              <div className="scout-status">
                <span className="spinner">⟳</span> Validating signal format…
              </div>
            )}
            {imsState === 'processing' && (
              <div className="scout-status">
                <span className="spinner">◈</span> Classifying signal…
              </div>
            )}

            {showResult && cqx && (
              <div className="scout-result">
                <SignalCard
                  raw={signalInput}
                  imsState={imsState}
                  classification={ctx.result as ReturnType<SignalClassifier['classify']>}
                  timestamp={ctx.timestamp}
                />
                <div className="result-body">
                  <div className="result-main">
                    {imsState === 'partial_complete' && (
                      <div className="warning-banner">
                        ⚠ Partial result — evidence incomplete. Review before acting.
                      </div>
                    )}
                    <CQXSequence cqx={cqx} imsState={imsState} onAction={handleAction} />
                  </div>
                  <div className="result-sidebar">
                    {evidence && <EvidencePanel evidence={evidence} />}
                    <TrustRail trust={{ score: ctx.confidence ?? 0, factors: [], decayActive: false }} />
                  </div>
                </div>
              </div>
            )}

            {imsState === 'failed' && (
              <div className="scout-error">
                <div className="error-icon">✕</div>
                <div className="error-message">Signal unclassifiable</div>
                <div className="error-detail">{ctx.error ?? 'Processing failed'}</div>
              </div>
            )}

            <OperatorActionBar
              imsState={imsState}
              onReset={handleReset}
              onRetry={imsState === 'failed' ? handleReset : undefined}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default App;
