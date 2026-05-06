/**
 * theme-switcher.js
 * SD UI Canon — Drop-in Theme + Mode Switcher
 * Version: 1.0.1 · 2026-05-05
 * CHANGELOG v1.0.1: css_key 'classic' deprecated → 'vibe' (PTC R1 binding direction)
 *   - PALETTES now uses 'vibe' as canonical mode key
 *   - 'classic' accepted as deprecated alias via normalization in apply()
 *   - DEFAULT_MODE updated to 'vibe'
 */
(function () {
  'use strict';

  /* ── Token definitions ────────────────────────────────── */
  const PALETTES = {
    vega: {
      name: 'Vega',
      dark:    { bg:'#050f14',surface:'#081520',elevated:'#0d1e2d',border:'rgba(8,145,178,0.18)',text:'#e0f0f8',text2:'#7090a0',text3:'#304050',primary:'#30ABCA',primaryHover:'#0891B2',primaryLight:'rgba(8,145,178,0.15)',secondary:'#38bdf8',displayFont:'DM Sans',bodyFont:'DM Mono',signals:'#38bdf8',canon:'#a78bfa',systems:'#30ABCA',learning:'#059669',moats:'#D97706' },
      light:   { bg:'#f0f9ff',surface:'#ffffff',elevated:'#e0f2fe',border:'rgba(8,145,178,0.12)',text:'#0c1a24',text2:'#4a7080',text3:'#90b0c0',primary:'#30ABCA',primaryHover:'#0891B2',primaryLight:'rgba(8,145,178,0.10)',secondary:'#0369a1',displayFont:'DM Sans',bodyFont:'DM Mono',signals:'#0369a1',canon:'#7c3aed',systems:'#30ABCA',learning:'#059669',moats:'#D97706' },
      vibe:    { bg:'#faf7f2',surface:'#f5f0e8',elevated:'#efe9dc',border:'rgba(8,145,178,0.10)',text:'#0c1a24',text2:'#4a7080',text3:'#90b0c0',primary:'#30ABCA',primaryHover:'#0891B2',primaryLight:'rgba(8,145,178,0.10)',secondary:'#0369a1',displayFont:'DM Sans',bodyFont:'DM Mono',signals:'#0369a1',canon:'#7c3aed',systems:'#30ABCA',learning:'#059669',moats:'#D97706' },
  },
  nova: {
      name: 'Nova',
      dark:    { bg:'#07070d',surface:'#0d0d16',elevated:'#161923',border:'rgba(255,255,255,0.07)',text:'#e4e2db',text2:'#9b9890',text3:'#45433f',primary:'#E8751A',primaryHover:'#D96310',primaryLight:'rgba(232,117,26,0.15)',secondary:'#0891B2',displayFont:'Syne',bodyFont:'IBM Plex Mono',signals:'#378add',canon:'#a78bfa',systems:'#E8751A',learning:'#1d9e75',moats:'#c8973a' },
      light:   { bg:'#f7f6f2',surface:'#ffffff',elevated:'#f0ede8',border:'rgba(0,0,0,0.08)',text:'#1a1816',text2:'#5e5c58',text3:'#9e9a94',primary:'#E8751A',primaryHover:'#D96310',primaryLight:'rgba(232,117,26,0.12)',secondary:'#0891B2',displayFont:'Syne',bodyFont:'IBM Plex Mono',signals:'#0891B2',canon:'#7c3aed',systems:'#E8751A',learning:'#059669',moats:'#D97706' },
      vibe:    { bg:'#faf7f2',surface:'#f5f0e8',elevated:'#efe9dc',border:'rgba(0,0,0,0.07)',text:'#292524',text2:'#78716c',text3:'#a8a29e',primary:'#E8751A',primaryHover:'#D96310',primaryLight:'rgba(232,117,26,0.10)',secondary:'#0891B2',displayFont:'Syne',bodyFont:'IBM Plex Mono',signals:'#0891B2',canon:'#7c3aed',systems:'#E8751A',learning:'#059669',moats:'#D97706' },
    },
    hydra: {
      name: 'Hydra',
      dark:    { bg:'#0A0A0A',surface:'#141414',elevated:'#1E1E1E',border:'rgba(200,184,154,0.10)',text:'#F0E8D8',text2:'#908070',text3:'#383028',primary:'#C8B89A',primaryHover:'#B8A888',primaryLight:'rgba(200,184,154,0.12)',secondary:'#A89878',displayFont:'Syne',bodyFont:'IBM Plex Mono',signals:'#C8B89A',canon:'#a78bfa',systems:'#1A1A1A',learning:'#059669',moats:'#D97706' },
      light:   { bg:'#f4f1ea',surface:'#faf8f4',elevated:'#ede8de',border:'rgba(26,26,26,0.09)',text:'#1A1A1A',text2:'#4A4A4A',text3:'#9A9488',primary:'#1A1A1A',primaryHover:'#2A2A2A',primaryLight:'rgba(26,26,26,0.10)',secondary:'#C8B89A',displayFont:'Syne',bodyFont:'IBM Plex Mono',signals:'#4A4A4A',canon:'#7c3aed',systems:'#1A1A1A',learning:'#059669',moats:'#D97706' },
      vibe:    { bg:'#f0ebe0',surface:'#e8e1d0',elevated:'#dfd7c4',border:'rgba(26,26,26,0.10)',text:'#1A1A1A',text2:'#4A4A4A',text3:'#9A9488',primary:'#1A1A1A',primaryHover:'#2A2A2A',primaryLight:'rgba(26,26,26,0.08)',secondary:'#C8B89A',displayFont:'Syne',bodyFont:'IBM Plex Mono',signals:'#4A4A4A',canon:'#7c3aed',systems:'#1A1A1A',learning:'#059669',moats:'#D97706' },
    },
  };

  const SIGNAL_COLORS = { pass:'#059669', caution:'#D97706', fail:'#DC2626', info:'#2563EB' };

  /* UIS canonical defaults */
  const DEFAULT_PALETTE = 'vega';
  const DEFAULT_MODE    = 'vibe';    /* canonical key — classic is a deprecated alias */

  /* ── Storage wrapper ──────────────────────────────────── */
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };

  /* ── Apply palette to DOM ─────────────────────────────── */
  function applySDPalette(palKey, rawMode) {
    const modeKey = (rawMode === 'classic') ? 'vibe' : rawMode;
    const pal = PALETTES[palKey];
    if (!pal) return console.warn('[sd-ui-canon] Unknown palette:', palKey);
    const t = pal[modeKey] || pal.vibe;
    const r = document.documentElement.style;

    r.setProperty('--bg',           t.bg);
    r.setProperty('--surface',      t.surface);
    r.setProperty('--elevated',     t.elevated);
    r.setProperty('--border',       t.border);
    r.setProperty('--text',         t.text);
    r.setProperty('--text-2',       t.text2);
    r.setProperty('--text-3',       t.text3);
    r.setProperty('--accent',       t.primary);
    r.setProperty('--accent-hover', t.primaryHover);
    r.setProperty('--accent-dim',   t.primaryLight);
    r.setProperty('--secondary',    t.secondary);
    r.setProperty('--signals',      t.signals);
    r.setProperty('--canon',        t.canon);
    r.setProperty('--systems',      t.systems);
    r.setProperty('--learning',     t.learning);
    r.setProperty('--moats',        t.moats);
    r.setProperty('--signal-pass',    SIGNAL_COLORS.pass);
    r.setProperty('--signal-caution', SIGNAL_COLORS.caution);
    r.setProperty('--signal-fail',    SIGNAL_COLORS.fail);
    r.setProperty('--signal-info',    SIGNAL_COLORS.info);
    r.setProperty('--font-display', `"${t.displayFont}"`);
    r.setProperty('--font-body',    `"${t.bodyFont}"`);

    /* Apply fonts to body and display elements */
    document.body.style.fontFamily = `"${t.bodyFont}", "IBM Plex Mono", ui-monospace, monospace`;
    document.querySelectorAll('[data-sd-display]').forEach(el => {
      el.style.fontFamily = `"${t.displayFont}", Georgia, serif`;
    });

    /* data attributes for CSS selector hooks (sd-tokens.css) */
    document.documentElement.dataset.palette = palKey;
    document.documentElement.dataset.mode    = modeKey;

    store.set('sd-palette', palKey);
    store.set('sd-mode',    modeKey);

    /* Emit change event */
    document.dispatchEvent(new CustomEvent('sd:palette-change', {
      detail: { palette: palKey, mode: modeKey, tokens: t }
    }));
  }

  /* ── Switcher UI state sync ───────────────────────────── */
  function syncUI(palKey, modeKey) {
    document.querySelectorAll('[data-palette]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.palette === palKey);
    });
    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === modeKey);
    });
  }

  /* ── Public API ───────────────────────────────────────── */
  window.SD = window.SD || {};

  const _savedMode = store.get('sd-mode') || DEFAULT_MODE;
  window.SD.activePalette = store.get('sd-palette') || DEFAULT_PALETTE;
  window.SD.activeMode    = _savedMode === 'classic' ? 'vibe' : _savedMode; // normalize deprecated alias

  window.SD.handlePalette = function (btn) {
    window.SD.activePalette = btn.dataset.palette;
    applySDPalette(window.SD.activePalette, window.SD.activeMode);
    syncUI(window.SD.activePalette, window.SD.activeMode);
  };

  window.SD.handleMode = function (btn) {
    window.SD.activeMode = btn.dataset.mode;
    applySDPalette(window.SD.activePalette, window.SD.activeMode);
    syncUI(window.SD.activePalette, window.SD.activeMode);
  };

  window.SD.applyPalette = applySDPalette;
  window.SD.PALETTES     = PALETTES;

  /* ── Init on DOMContentLoaded ─────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    applySDPalette(window.SD.activePalette, window.SD.activeMode);
    syncUI(window.SD.activePalette, window.SD.activeMode);
  });

})();
