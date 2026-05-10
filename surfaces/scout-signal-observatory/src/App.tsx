import React, { useState, useCallback, useRef } from 'react';
import { IMSState, IMSContext } from './types/IMS';
import { CQXElement } from './types/UXC';
import { EvidenceTrace } from './types/Evidence';
import { GoverneAction } from './types/Decision';
import { IMSStateMachine } from './logic/ims-state-machine';
import { ConfidenceGates } from './logic/confidence-gates';
import { SignalClassifier } from './logic/signal-classifier';
import { InterpretationModel } from './logic/interpretation-model';
import { EvidenceModel } from './logic/evidence-model';

import { OrbitHeader } from './components/OrbitHeader';
import { StateIndicator } from './components/StateIndicator';
import { SignalCard } from './components/SignalCard';
import { CQXSequence } from './components/CQXSequence';
import { EvidencePanel } from './components/EvidencePanel';
import { TrustRail } from './components/TrustRail';
import { OperatorActionBar } from './components/OperatorActionBar';

import './styles/main.css';

const classifier  = new SignalClassifier();
const gates       = new ConfidenceGates();
const interp      = new InterpretationModel();
const evidModel   = new EvidenceModel();

export const App: React.FC = () => {
  const machineRef = useRef(new IMSStateMachine());
  const [imsState, setImsState] = useState<IMSState>('idle');
  const [ctx, setCtx]           = useState<IMSContext>({ timestamp: Date.now() });
  const [signalInput, setSignalInput] = useState('');
  const [cqx, setCqx]           = useState<CQXElement | null>(null);
  const [evidence, setEvidence] = useState<EvidenceTrace | null>(null);

  const machine = machineRef.current;

  const syncState = () => {
    setImsState(machine.getState());
    setCtx({ ...machine.getContext() });
  };

  const handleSubmit = useCallback(async () => {
    if (!signalInput.trim()) return;
    const m = machine;

    // Set input + move to validating
    m.setContext({ input: { raw: signalInput } });
    m.transition('validating');
    syncState();

    // Validate — simulate async
    await new Promise((r) => setTimeout(r, 300));
    if (!signalInput.trim()) {
      m.setContext({ error: 'Signal input is empty' });
      m.transition('failed');
      syncState();
      return;
    }

    m.transition('processing');
    syncState();

    // Process — classify + interpret
    await new Promise((r) => setTimeout(r, 600));

    const classification = classifier.classify(signalInput);
    const interpretation  = interp.interpret(classification.type, classification.confidence);
    const evidSources = [
      { id: 'src-1', name: 'Pattern Matcher',     confidence: classification.confidence, description: 'Keyword and pattern analysis' },
      { id: 'src-2', name: 'Baseline Comparator', confidence: Math.min(classification.confidence + 0.05, 0.92), description: 'Baseline deviation analysis' },
    ];
    const ev = evidModel.synthesize(evidSources);
    const confidence = gates.calculate(classification.confidence, evidModel.combineConfidence(evidSources));

    const cqxData: CQXElement = {
      context:  'Operational signal detected in monitored environment',
      outcome:  `${classification.label} — raw input: "${signalInput.slice(0, 60)}"`,
      meaning:  interpretation.meaning,          // RC-02: meaning is separate
      strengthRisk: { confidence, risk: interpretation.riskLevel },
      action:   interpretation.recommendedAction, // RC-02: action is distinct
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

  const handleAction = useCallback((_action: GoverneAction) => {
    // Operator action routed — in v1.0 logs to console; integration in v1.1
    console.log('[SCOUT] Operator action:', _action);
  }, []);

  const showResult = imsState === 'complete' || imsState === 'partial_complete';

  return (
    <div className="scout-root">
      <header className="scout-header">
        <OrbitHeader imsState={imsState} />
        <div className="scout-title">
          <h1>SCOUT Signal Observatory</h1>
          <StateIndicator imsState={imsState} />
        </div>
      </header>

      <main className="scout-main">
        {/* Input area — C0: operator initiates */}
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

        {/* Processing states */}
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

        {/* Complete / partial_complete — CQX sequence */}
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

        {/* Failed */}
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
      </main>
    </div>
  );
};

export default App;
