import { useState, useRef, useCallback } from 'react';
import { IMSState, IMSContext } from '../types/IMS';
import { IMSStateMachine } from '../logic/ims-state-machine';

export function useIMS() {
  const machineRef = useRef(new IMSStateMachine());
  const [state, setState] = useState<IMSState>('idle');
  const [context, setContext] = useState<IMSContext>({ timestamp: Date.now() });

  const sync = useCallback(() => {
    setState(machineRef.current.getState());
    setContext({ ...machineRef.current.getContext() });
  }, []);

  const transition = useCallback((toState: IMSState): boolean => {
    const result = machineRef.current.transition(toState);
    sync();
    return result;
  }, [sync]);

  const setCtx = useCallback((updates: Partial<IMSContext>) => {
    machineRef.current.setContext(updates);
    sync();
  }, [sync]);

  return { state, context, transition, setCtx, machine: machineRef.current };
}
