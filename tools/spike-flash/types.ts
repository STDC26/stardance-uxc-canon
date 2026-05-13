// SPIKE_FLASH canonical types
// Directive: DRJ-AUTH-SPIKE_FLASH-IMMEDIATE-BUILD-v1.0

export type SourceQuality = 'rich' | 'moderate' | 'weak' | 'failed';
export type SYLBand       = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Recommendation = 'CONTINUE' | 'REFINE' | 'EXPAND' | 'REDIRECT' | 'KILL';

export type SignalCategory =
  | 'AI operational adaptation'
  | 'SignalFirst demand'
  | 'enterprise AI friction'
  | 'operator overload'
  | 'workflow intelligence gaps'
  | 'decision latency pain'
  | 'competitive intelligence demand'
  | 'AI governance pressure'
  | 'organizational adaptation pressure'
  | 'runtime cognition pain';

export type SourceHabitat =
  | 'Reddit'
  | 'LinkedIn'
  | 'careers_pages'
  | 'review_sites'
  | 'AI_communities'
  | 'operator_discussions'
  | 'founder_discussions'
  | 'workflow_forums'
  | 'enterprise_AI_discourse'
  | 'creative_signal_sources';

// ─── Input ────────────────────────────────────────────────────────────────────

export interface SpikeFlashConfig {
  objective:        string;
  signal_thesis:    string;
  target_keywords:  string[];
  source_types:     SourceHabitat[];
  market_or_domain: string;
  desired_decision: string;
}

// ─── Signals ──────────────────────────────────────────────────────────────────

export interface ExtractedSignal {
  title:            string;
  source:           SourceHabitat;
  source_quality:   SourceQuality;
  excerpt:          string;
  relevance_score:  number; // 0.0–1.0
  signal_category:  SignalCategory;
}

export interface SourceQualityEntry {
  habitat:    SourceHabitat;
  quality:    SourceQuality;
  rationale:  string;
  signal_count: number;
}

// ─── Output ───────────────────────────────────────────────────────────────────

export interface SylScore {
  band:       SYLBand;
  score:      number; // 0.0–1.0
  rationale:  string;
}

export interface SpikeFlashPayload {
  run_id:             string;
  timestamp:          string;
  config:             SpikeFlashConfig;
  top_signals:        ExtractedSignal[];
  source_quality:     SourceQualityEntry[];
  syl:                SylScore;
  recommendation:     Recommendation;
  recommendation_rationale: string;
  founder_summary:    string;
  board_summary:      string;
  ocs_orientation: {
    intent:       string;
    sensing:      string;
    orientation:  string;
    action:       string;
  };
  elapsed_ms:         number;
}
