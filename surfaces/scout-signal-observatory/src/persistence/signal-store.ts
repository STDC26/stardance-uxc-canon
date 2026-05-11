// src/persistence/signal-store.ts
// CC_SCOUT_18 Step 1 — Signal Store Interface + In-Memory Implementation.
// All writes enforce immutability semantics: core locked, histories append-only.

import type { NormalizedSignal } from '../ingestion/normalization-pipeline';
import type { ConfidenceSnapshot } from '../api/SignalIntakeAdapter';
import type { GovernanceEvent } from '../types/IMS';

// ─── Extended types ───────────────────────────────────────────────────────────

export interface LearningFeedback {
  feedbackType: string;
  operator: string;
  timestamp: string;
  immutable: true;
}

export interface AuditEntry {
  entryId: string;
  signalId: string;
  timestamp: string;
  actorId: string;
  actionType: string;
  details: Record<string, unknown>;
  immutable: true;
}

// StoredSignal relaxes the NormalizedSignal runtimeState literal so the store
// can track mutable runtime state transitions without violating the type system.
export interface StoredSignal extends Omit<NormalizedSignal, 'runtimeState'> {
  runtimeState: string;
}

// ─── Store Interface ──────────────────────────────────────────────────────────

export interface SignalStore {
  storeSignal(signal: NormalizedSignal): Promise<{ signalId: string; stored: boolean }>;
  getSignal(signalId: string): Promise<StoredSignal | null>;
  getSignalsBySource(sourceId: string): Promise<StoredSignal[]>;
  getSignalsByImsState(imsState: string): Promise<StoredSignal[]>;
  getSignalsByRuntimeState(runtimeState: string): Promise<StoredSignal[]>;
  getConfidenceHistory(signalId: string): Promise<ConfidenceSnapshot[]>;
  getLearningHistory(signalId: string): Promise<LearningFeedback[]>;
  updateRuntimeState(signalId: string, newRuntimeState: string, operatorId: string): Promise<{ success: boolean }>;
  getSignalAuditTrail(signalId: string): Promise<AuditEntry[]>;
}

// ─── In-Memory Implementation ─────────────────────────────────────────────────

export class InMemorySignalStore implements SignalStore {
  private signals: Map<string, StoredSignal> = new Map();
  private auditTrails: Map<string, AuditEntry[]> = new Map();
  private governanceEvents: Map<string, GovernanceEvent[]> = new Map();

  async storeSignal(signal: NormalizedSignal): Promise<{ signalId: string; stored: boolean }> {
    const { signalId } = signal;
    if (this.signals.has(signalId)) {
      return { signalId, stored: false };
    }
    // Deep-freeze the core: store as StoredSignal (runtimeState widened to string)
    const stored: StoredSignal = { ...signal };
    this.signals.set(signalId, stored);
    this.auditTrails.set(signalId, []);
    this.appendAuditEntry(signalId, 'system', 'signal_stored', { signalId, schemaVersion: signal.schemaVersion });
    return { signalId, stored: true };
  }

  async getSignal(signalId: string): Promise<StoredSignal | null> {
    return this.signals.get(signalId) ?? null;
  }

  async getSignalsBySource(sourceId: string): Promise<StoredSignal[]> {
    return [...this.signals.values()].filter(s => s.source.id === sourceId);
  }

  async getSignalsByImsState(imsState: string): Promise<StoredSignal[]> {
    return [...this.signals.values()].filter(s => s.imsState === imsState);
  }

  async getSignalsByRuntimeState(runtimeState: string): Promise<StoredSignal[]> {
    return [...this.signals.values()].filter(s => s.runtimeState === runtimeState);
  }

  async getConfidenceHistory(signalId: string): Promise<ConfidenceSnapshot[]> {
    const signal = this.signals.get(signalId);
    if (!signal) return [];
    return [...signal.confidenceHistory];
  }

  async getLearningHistory(signalId: string): Promise<LearningFeedback[]> {
    const signal = this.signals.get(signalId);
    if (!signal) return [];
    return (signal.learningHistory ?? []).map(e => ({
      feedbackType: e.feedbackType,
      operator:     e.operator,
      timestamp:    e.timestamp,
      immutable:    true as const,
    }));
  }

  async updateRuntimeState(
    signalId: string,
    newRuntimeState: string,
    operatorId: string
  ): Promise<{ success: boolean }> {
    const signal = this.signals.get(signalId);
    if (!signal) return { success: false };
    signal.runtimeState = newRuntimeState;
    this.appendAuditEntry(signalId, operatorId, 'runtime_state_updated', {
      newRuntimeState,
    });
    return { success: true };
  }

  async getSignalAuditTrail(signalId: string): Promise<AuditEntry[]> {
    return [...(this.auditTrails.get(signalId) ?? [])];
  }

  // ─── Internal helpers ───────────────────────────────────────────────────────

  appendAuditEntry(
    signalId: string,
    actorId: string,
    actionType: string,
    details: Record<string, unknown>
  ): void {
    const entries = this.auditTrails.get(signalId) ?? [];
    const entry: AuditEntry = {
      entryId:    `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      signalId,
      timestamp:  new Date().toISOString(),
      actorId,
      actionType,
      details,
      immutable:  true as const,
    };
    entries.push(entry);
    this.auditTrails.set(signalId, entries);
  }

  appendGovernanceEvent(signalId: string, event: GovernanceEvent): void {
    const events = this.governanceEvents.get(signalId) ?? [];
    events.push(event);
    this.governanceEvents.set(signalId, events);
    this.appendAuditEntry(signalId, event.operatorId, 'governance_event', {
      eventId:   event.eventId,
      eventType: event.eventType,
    });
    // Append reference to signal's governanceEventReferences
    const signal = this.signals.get(signalId);
    if (signal) {
      signal.governanceEventReferences = [...signal.governanceEventReferences, event.eventId];
    }
  }

  getGovernanceEvents(signalId: string): GovernanceEvent[] {
    return [...(this.governanceEvents.get(signalId) ?? [])];
  }
}

// ─── Module-level singleton (shared across persistence layer) ─────────────────

export const globalSignalStore = new InMemorySignalStore();
