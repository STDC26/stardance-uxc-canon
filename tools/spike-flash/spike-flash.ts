#!/usr/bin/env node
// SPIKE_FLASH runtime — DRJ-AUTH-SPIKE_FLASH-IMMEDIATE-BUILD-v1.0
//
// Usage:
//   npx ts-node spike-flash.ts [config.json]
//   npx ts-node spike-flash.ts                        # uses spike-flash-config.json
//
// Outputs:
//   outputs/spike_flash/<run_id>/SPIKE_FLASH_BRIEF.md
//   outputs/spike_flash/<run_id>/spike_payload.json
//   outputs/spike_flash/<run_id>/source_quality.csv

import Anthropic from '@anthropic-ai/sdk';
import * as fs    from 'fs';
import * as path  from 'path';

import type {
  SpikeFlashConfig,
  SpikeFlashPayload,
  ExtractedSignal,
  SourceQualityEntry,
} from './types';

// ─── Paths ────────────────────────────────────────────────────────────────────

const REPO_ROOT   = path.resolve(__dirname, '..', '..');
const OUTPUTS_DIR = path.join(REPO_ROOT, 'outputs', 'spike_flash');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timestamp(): string {
  return new Date().toISOString();
}

function runId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function log(msg: string) {
  process.stdout.write(`[SPIKE] ${msg}\n`);
}

function loadConfig(configPath: string): SpikeFlashConfig {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config not found: ${configPath}\nCopy spike-flash-config.example.json to spike-flash-config.json and fill in your targets.`);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildReconPrompt(config: SpikeFlashConfig): string {
  return `You are SCOUT's SPIKE_FLASH intelligence engine. Your task is rapid signal reconnaissance — directional conviction in under 2 minutes.

## SPIKE CONFIGURATION

**Objective:** ${config.objective}
**Signal Thesis:** ${config.signal_thesis}
**Target Keywords:** ${config.target_keywords.join(', ')}
**Market / Domain:** ${config.market_or_domain}
**Source Habitats:** ${config.source_types.join(', ')}
**Decision to Inform:** ${config.desired_decision}

## YOUR TASK

Conduct a rapid signal sweep across the configured habitats. Analyse what signals exist RIGHT NOW in the market. Draw on your knowledge of these communities, platforms, and discourse patterns.

Return a SINGLE JSON object matching this exact structure. No markdown fences, no preamble — pure JSON only.

{
  "top_signals": [
    {
      "title": "string — sharp, operator-readable signal title",
      "source": "one of the source habitats from config",
      "source_quality": "rich|moderate|weak|failed",
      "excerpt": "string — 1-3 sentence signal excerpt or paraphrase",
      "relevance_score": 0.0-1.0,
      "signal_category": "one of: AI operational adaptation | SignalFirst demand | enterprise AI friction | operator overload | workflow intelligence gaps | decision latency pain | competitive intelligence demand | AI governance pressure | organizational adaptation pressure | runtime cognition pain"
    }
  ],
  "source_quality": [
    {
      "habitat": "source habitat name",
      "quality": "rich|moderate|weak|failed",
      "rationale": "1-sentence assessment of this habitat's signal richness",
      "signal_count": integer
    }
  ],
  "syl": {
    "band": "LOW|MEDIUM|HIGH|CRITICAL",
    "score": 0.0-1.0,
    "rationale": "2-3 sentence SYL assessment"
  },
  "recommendation": "CONTINUE|REFINE|EXPAND|REDIRECT|KILL",
  "recommendation_rationale": "2-3 sentence directional rationale",
  "founder_summary": "≤200 word compressed signal brief — fast, directional, decision-ready. What is SCOUT seeing? What does it mean for the thesis? What should the founder do?",
  "board_summary": "≤150 word executive summary — conviction-grade, board-readable. Signal strength, market positioning, recommended next move.",
  "ocs_orientation": {
    "intent": "restate the operator's intent in 1 sentence",
    "sensing": "what signals SCOUT was configured to find",
    "orientation": "what SCOUT actually found — 2-3 sentences",
    "action": "recommended next action — 1 sentence"
  }
}

## SIGNAL REQUIREMENTS
- Extract 3-10 top signals (lean toward 5-8 for MEDIUM/HIGH SYL, 3-4 for LOW)
- Cover at least 3 different signal categories where the territory supports it
- Assess every configured habitat (mark as failed if no signal found)
- SYL scoring guide:
  - LOW (0.0-0.39): Weak habitat, thin signal, insufficient evidence for the thesis
  - MEDIUM (0.40-0.64): Some signal present, territory warrants monitoring but thesis needs refinement
  - HIGH (0.65-0.84): Clear signal habitat, pursue with confidence, thesis has market traction
  - CRITICAL (0.85-1.0): Urgent signal density, act immediately, strong market validation

Be direct. Be concrete. Operators need conviction, not hedging.`;
}

// ─── Claude call ──────────────────────────────────────────────────────────────

async function runRecon(client: Anthropic, config: SpikeFlashConfig): Promise<string> {
  log('Step 2/6 — Sweeping habitats...');

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role:    'user',
        content: buildReconPrompt(config),
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');
  return content.text;
}

// ─── Parse ────────────────────────────────────────────────────────────────────

function parseReconResponse(raw: string): Omit<SpikeFlashPayload, 'run_id' | 'timestamp' | 'config' | 'elapsed_ms'> {
  // Strip any accidental markdown fences
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

// ─── Writers ──────────────────────────────────────────────────────────────────

function writeBrief(outDir: string, payload: SpikeFlashPayload) {
  const sylBar = (score: number) => {
    const filled = Math.round(score * 20);
    return '█'.repeat(filled) + '░'.repeat(20 - filled);
  };

  const sourceTable = payload.source_quality
    .map(s => `| ${s.habitat.padEnd(28)} | ${s.quality.padEnd(8)} | ${s.signal_count} | ${s.rationale} |`)
    .join('\n');

  const signalList = payload.top_signals
    .map((s, i) =>
      `### ${i + 1}. ${s.title}\n` +
      `**Source:** ${s.source} · **Quality:** ${s.source_quality} · **Relevance:** ${Math.round(s.relevance_score * 100)}%\n` +
      `**Category:** ${s.signal_category}\n\n` +
      `${s.excerpt}`
    )
    .join('\n\n---\n\n');

  const brief = `# SPIKE_FLASH BRIEF
**Run ID:** ${payload.run_id}
**Timestamp:** ${payload.timestamp}
**Elapsed:** ${payload.elapsed_ms}ms

---

## OCS ORIENTATION

| Layer | |
|-------|---|
| **Intent** | ${payload.ocs_orientation.intent} |
| **Sensing** | ${payload.ocs_orientation.sensing} |
| **Orientation** | ${payload.ocs_orientation.orientation} |
| **Action** | ${payload.ocs_orientation.action} |

---

## SIGNAL YIELD LIKELIHOOD (SYL)

**Band:** ${payload.syl.band} · **Score:** ${Math.round(payload.syl.score * 100)}%

\`${sylBar(payload.syl.score)}\`

${payload.syl.rationale}

---

## RECOMMENDATION: ${payload.recommendation}

${payload.recommendation_rationale}

---

## FOUNDER BRIEF

${payload.founder_summary}

---

## BOARD SUMMARY

${payload.board_summary}

---

## TOP SIGNALS (${payload.top_signals.length})

${signalList}

---

## SOURCE QUALITY

| Habitat                       | Quality  | Signals | Assessment |
|-------------------------------|----------|---------|------------|
${sourceTable}

---

*SPIKE_FLASH v0.1 · SCOUT Intelligence Runtime · ${payload.timestamp}*
`;

  fs.writeFileSync(path.join(outDir, 'SPIKE_FLASH_BRIEF.md'), brief);
}

function writePayload(outDir: string, payload: SpikeFlashPayload) {
  fs.writeFileSync(
    path.join(outDir, 'spike_payload.json'),
    JSON.stringify(payload, null, 2)
  );
}

function writeSourceQualityCsv(outDir: string, sources: SourceQualityEntry[]) {
  const header = 'habitat,quality,signal_count,rationale';
  const rows   = sources.map(s =>
    `${s.habitat},${s.quality},${s.signal_count},"${s.rationale.replace(/"/g, '""')}"`
  );
  fs.writeFileSync(path.join(outDir, 'source_quality.csv'), [header, ...rows].join('\n'));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startMs = Date.now();

  // Step 1 — Load config
  const configArg = process.argv[2] ?? path.join(__dirname, 'spike-flash-config.json');
  log(`Step 1/6 — Loading config: ${configArg}`);
  const config = loadConfig(configArg);
  log(`  Objective: ${config.objective}`);
  log(`  Keywords: ${config.target_keywords.join(', ')}`);
  log(`  Habitats: ${config.source_types.join(', ')}`);

  // Setup output directory
  const id     = runId();
  const outDir = path.join(OUTPUTS_DIR, id);
  fs.mkdirSync(outDir, { recursive: true });

  // Step 2-3 — Sweep + extract (Claude call)
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  const raw    = await runRecon(client, config);

  log('Step 3/6 — Extracting signals...');
  const recon = parseReconResponse(raw);

  log(`Step 4/6 — SYL scoring: ${recon.syl.band} (${Math.round(recon.syl.score * 100)}%)`);
  log(`Step 5/6 — Compressing summaries...`);
  log(`Step 6/6 — Recommendation: ${recon.recommendation}`);

  const elapsed = Date.now() - startMs;

  const payload: SpikeFlashPayload = {
    run_id:    id,
    timestamp: timestamp(),
    config,
    elapsed_ms: elapsed,
    ...recon,
  };

  // Write outputs
  writeBrief(outDir, payload);
  writePayload(outDir, payload);
  writeSourceQualityCsv(outDir, payload.source_quality);

  // Summary to stdout
  log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(`SPIKE_FLASH COMPLETE — ${elapsed}ms`);
  log(`SYL:            ${payload.syl.band} (${Math.round(payload.syl.score * 100)}%)`);
  log(`Signals:        ${payload.top_signals.length}`);
  log(`Recommendation: ${payload.recommendation}`);
  log('');
  log(`Outputs → ${path.relative(process.cwd(), outDir)}/`);
  log(`  SPIKE_FLASH_BRIEF.md`);
  log(`  spike_payload.json`);
  log(`  source_quality.csv`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('');
  log('FOUNDER BRIEF:');
  log('');
  log(payload.founder_summary);
}

main().catch(err => {
  process.stderr.write(`\n[SPIKE ERROR] ${err.message}\n`);
  process.exit(1);
});
