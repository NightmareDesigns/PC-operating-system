/**
 * NightmareOS — Workspace Sync
 * ─────────────────────────────────────────────────────────────────────
 * Saves and restores your entire NightmareOS workspace so you can pick
 * up exactly where you left off on ANY computer:
 *   • Settings & appearance
 *   • Browser bookmarks
 *   • Userscripts (custom Tampermonkey scripts)
 *   • Sticky notes
 *   • Calendar events
 *   • Custom CSS mods
 *
 * Sync methods (all optional, in increasing power):
 *   1. Export/Import JSON file — always available, zero config
 *   2. Load from any public URL — paste a raw GitHub/Gist/Pastebin URL
 *   3. GitHub Gist sync — full two-way sync with a Personal Access Token
 */

'use strict';

const WorkspaceSync = (function () {
  const SYNC_CFG_KEY = 'nightmareos_sync_config';

  /* ── Config helpers ─────────────────────────────────────────────── */
  function getCfg() {
    try { return JSON.parse(localStorage.getItem(SYNC_CFG_KEY) || '{}'); }
    catch (_) { return {}; }
  }
  function saveCfg(cfg) {
    try { localStorage.setItem(SYNC_CFG_KEY, JSON.stringify(cfg)); }
    catch (_) {}
  }

  /* ── Collect everything from localStorage + NightOS.settings ─────── */
  function collect() {
    const ws = {
      _version:       '2.0',
      _exportedAt:    new Date().toISOString(),
      _hostname:      location.hostname,
      settings:       { ...(window.NightOS?.settings || {}) },
      userscripts:    safeGet('nightmareos_userscripts',       []),
      bookmarks:      safeGet('nightmareos_bookmarks',         []),
      stickyNotes:    safeGet('nightos_stickynotes',           []),
      calendarEvents: safeGet('nightmareos_calendar_events',   {}),
      termHistory:    safeGet('nightmareos_term_history',      []),
    };
    return ws;
  }

  function safeGet(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
    catch (_) { return fallback; }
  }

  function safeSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
  }

  /* ── Apply a workspace snapshot ──────────────────────────────────── */
  function apply(ws) {
    if (!ws || typeof ws !== 'object') throw new Error('Not a valid workspace snapshot.');

    if (ws.settings && window.NightOS) {
      Object.assign(NightOS.settings, ws.settings);
      if (typeof saveSettings === 'function') saveSettings();
      // Re-apply accent colour immediately
      if (ws.settings.accentColor) {
        document.documentElement.style.setProperty('--accent', ws.settings.accentColor);
      }
      // Re-apply matrix wallpaper preference
      if (ws.settings.matrixWallpaper && window.MatrixWallpaper) {
        window.MatrixWallpaper.start();
      } else if (!ws.settings.matrixWallpaper && window.MatrixWallpaper) {
        window.MatrixWallpaper.stop();
        if (typeof applyWallpaper === 'function') applyWallpaper(ws.settings.wallpaper ?? 0);
      }
      // Re-apply custom CSS
      if (ws.settings.customCss) {
        let el = document.getElementById('nightmareos-custom-css');
        if (!el) { el = document.createElement('style'); el.id = 'nightmareos-custom-css'; document.head.appendChild(el); }
        el.textContent = ws.settings.customCss;
      }
    }

    if (Array.isArray(ws.userscripts))          safeSet('nightmareos_userscripts', ws.userscripts);
    if (Array.isArray(ws.bookmarks))             safeSet('nightmareos_bookmarks',  ws.bookmarks);
    if (Array.isArray(ws.stickyNotes))           safeSet('nightos_stickynotes',    ws.stickyNotes);
    if (ws.calendarEvents && typeof ws.calendarEvents === 'object')
      safeSet('nightmareos_calendar_events', ws.calendarEvents);
    if (Array.isArray(ws.termHistory))           safeSet('nightmareos_term_history', ws.termHistory);
  }

  /* ── 1. Export / Import file ──────────────────────────────────────── */
  function exportFile() {
    const json = JSON.stringify(collect(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href:     url,
      download: `nightmareos-${new Date().toISOString().slice(0, 10)}.json`,
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function importFile() {
    return new Promise((resolve, reject) => {
      const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
      inp.addEventListener('change', () => {
        const f = inp.files[0];
        if (!f) return reject(new Error('No file selected'));
        const reader = new FileReader();
        reader.onload = ev => {
          try { const ws = JSON.parse(ev.target.result); apply(ws); resolve(ws); }
          catch (e) { reject(e); }
        };
        reader.readAsText(f);
      });
      inp.click();
    });
  }

  /* ── 2. Load from public URL ─────────────────────────────────────── */
  async function loadFromUrl(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    const ws = await res.json();
    apply(ws);
    return ws;
  }

  /* ── 3. GitHub Gist sync ─────────────────────────────────────────── */
  const GIST_FILE = 'nightmareos-workspace.json';

  async function gistSave(token, gistId) {
    if (!token) throw new Error('GitHub token required');
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      throw new Error('GitHub Gist sync requires a secure (HTTPS) connection to protect your token.');
    }
    const payload = { files: { [GIST_FILE]: { content: JSON.stringify(collect(), null, 2) } } };
    let url = 'https://api.github.com/gists';
    let method = 'POST';
    if (gistId) { url += '/' + gistId; method = 'PATCH'; }
    else { Object.assign(payload, { description: 'NightmareOS Workspace', public: false }); }

    const res = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json(); // contains .id for new gists
  }

  async function gistLoad(token, gistId) {
    if (!gistId) throw new Error('Gist ID required');
    if (token && location.protocol !== 'https:' && location.hostname !== 'localhost') {
      throw new Error('GitHub Gist sync requires a secure (HTTPS) connection to protect your token.');
    }
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`https://api.github.com/gists/${gistId}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const gist = await res.json();
    const file = gist.files[GIST_FILE];
    if (!file) throw new Error(`"${GIST_FILE}" not found in Gist`);
    const ws = JSON.parse(file.content);
    apply(ws);
    return ws;
  }

  /* ── Auto-load on startup ────────────────────────────────────────── */
  async function autoLoad() {
    const cfg = getCfg();
    try {
      if (cfg.gistId) {
        await gistLoad(cfg.githubToken || '', cfg.gistId);
        return { method: 'gist', id: cfg.gistId };
      }
      if (cfg.syncUrl) {
        await loadFromUrl(cfg.syncUrl);
        return { method: 'url', url: cfg.syncUrl };
      }
    } catch (err) {
      console.warn('[WorkspaceSync] Auto-load failed:', err.message);
      return null;
    }
    return null;
  }

  /* ── Public API ─────────────────────────────────────────────────── */
  return { collect, apply, exportFile, importFile, loadFromUrl, gistSave, gistLoad, autoLoad, getCfg, saveCfg };
})();

window.WorkspaceSync = WorkspaceSync;
