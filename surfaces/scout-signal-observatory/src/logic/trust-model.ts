// src/logic/trust-model.ts

export interface TrustState {
  score: number;          // 0.0 - 1.0
  factors: string[];
  decayActive: boolean;
}

export class TrustModel {
  private trust: TrustState = { score: 0.5, factors: [], decayActive: false };

  accumulate(factor: string, delta: number): void {
    this.trust.score = Math.min(Math.max(this.trust.score + delta, 0), 1);
    this.trust.factors.push(factor);
  }

  decay(delta: number): void {
    this.trust.score = Math.max(this.trust.score - delta, 0);
    this.trust.decayActive = true;
  }

  reset(): void {
    this.trust = { score: 0.5, factors: [], decayActive: false };
  }

  getState(): TrustState {
    return { ...this.trust };
  }
}

export const trustModel = new TrustModel();
