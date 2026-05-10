// src/logic/decision-model.ts
// 3-question decision hierarchy for SCOUT
// Authority: SCOUT_CC_EXECUTION_PACKET_v1.0_CORRECTED.md Section 7

import { EvidenceTrace } from '../types/Evidence';

export interface DecisionResult {
  question1: { question: string; answer: string; confidence: number };
  question2: { question: string; answer: string; confidence: number };
  question3: { question: string; answer: string; confidence: number };
  evidence: EvidenceTrace;
  overallConfidence: number;
}

export class DecisionModel {
  private readonly QUESTIONS = {
    q1: 'What signal am I looking at?',
    q2: 'What does it mean?',
    q3: 'What should I do?',
  };

  // Derive decision result from signal classification data
  derive(
    signalType: string,
    interpretation: string,
    recommendedAction: string,
    evidence: EvidenceTrace,
    confidence: number
  ): DecisionResult {
    return {
      question1: {
        question: this.QUESTIONS.q1,
        answer: `Signal type: ${signalType}`,
        confidence,
      },
      question2: {
        question: this.QUESTIONS.q2,
        answer: interpretation,
        confidence,
      },
      question3: {
        question: this.QUESTIONS.q3,
        answer: recommendedAction,
        confidence,
      },
      evidence,
      overallConfidence: confidence,
    };
  }

  getQuestions(): typeof this.QUESTIONS {
    return this.QUESTIONS;
  }
}

export const decisionModel = new DecisionModel();
