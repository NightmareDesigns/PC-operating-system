/**
 * NightmareOS — Script Manager (Tampermonkey-style)
 * Keyboard shortcut: Ctrl+Alt+S
 *
 * Lets users write, install, enable/disable, and run custom JavaScript
 * userscripts inside NightmareOS. Scripts are persisted to localStorage.
 * Each script has a name, description, and JS body.
 */

'use strict';

(function () {
  const STORE_KEY = 'nightmareos_userscripts';

  /* ---- Sample built-in scripts ---- */
  const BUILTIN_SCRIPTS = [
    {
      id: 'builtin-clock-24h',
      name: 'Clock — 24-hour Format',
      description: 'Switches the taskbar clock to 24-hour time format.',
      enabled: false,
      builtin: true,
      code: `// Clock 24-hour format patch
(function patch() {
  const trayTime = document.getElementById('tray-time');
  if (!trayTime) return setTimeout(patch, 500);
  const orig = trayTime.textContent;
  setInterval(() => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const s = String(now.getSeconds()).padStart(2,'0');
    trayTime.textContent = h + ':' + m + ':' + s;
  }, 1000);
  console.log('[ScriptManager] Clock 24h patch active');
})();`,
    },
    {
      id: 'builtin-matrix-intense',
      name: 'Matrix — Turbo Speed',
      description: 'Speeds up the Matrix rain wallpaper to maximum.',
      enabled: false,
      builtin: true,
      code: `// Matrix turbo speed
if (window.MatrixWallpaper) {
  window.MatrixWallpaper.stop();
  window.wpSpeed = 3;
  window.MatrixWallpaper.start();
  console.log('[ScriptManager] Matrix turbo active');
} else {
  console.warn('[ScriptManager] MatrixWallpaper not loaded');
}`,
    },
    {
      id: 'builtin-notification-test',
      name: 'Test Notification',
      description: 'Sends a test notification to the Nightmare OS desktop.',
      enabled: false,
      builtin: true,
      code: `// Test notification
if (window.showNotification) {
  showNotification('Script Manager', 'Userscript executed successfully! ✅');
} else {
  console.log('[ScriptManager] Notification system not found');
}`,
    },
    {
      id: 'builtin-rainbow-accent',
      name: 'Rainbow Accent Color',
      description: 'Cycles the UI accent color through a rainbow.',
      enabled: false,
      builtin: true,
      code: `// Rainbow accent color cycle
let hue = 0;
const timer = setInterval(() => {
  const color = 'hsl(' + hue + ',80%,60%)';
  document.documentElement.style.setProperty('--accent', color);
  hue = (hue + 2) % 360;
}, 50);
// Store timer ID so it can be cleared
window.__rainbowTimer = timer;
console.log('[ScriptManager] Rainbow mode active. To stop: clearInterval(window.__rainbowTimer)');`,
    },
  ];

  /* ---- Persistence ---- */
  let userScripts = []; // user-created scripts

  function loadScripts() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) userScripts = JSON.parse(raw);
    } catch (_) { userScripts = []; }
  }

  function saveScripts() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(userScripts)); } catch (_) {}
  }

  function allScripts() {
    return [...BUILTIN_SCRIPTS, ...userScripts];
  }

  loadScripts();

  /* ---- Run a script safely ---- */
  function runScript(script) {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(script.code);
      fn();
      showNotification('Script Manager', `"${script.name}" executed.`);
    } catch (err) {
      showNotification('Script Manager', `Error in "${script.name}": ${err.message}`);
      console.error('[ScriptManager] Error in script:', script.name, err);
    }
  }

  /* ---- Auto-run enabled scripts at startup ---- */
  function autoRunScripts() {
    allScripts().filter(s => s.enabled).forEach(runScript);
  }

  // Auto-run after a short delay to allow the desktop to fully initialize
  setTimeout(autoRunScripts, 1500);

  /* ---- UI ---- */
  function open() {
    const el = WindowManager.create({
      id: 'scriptmanager',
      title: 'Script Manager',
      icon: '📜',
      width: 760,
      height: 520,
      content: buildUI(),
    });
    initManager(el);
  }

  function buildUI() {
    return `
      <div class="sm-layout">
        <div class="sm-sidebar">
          <button class="sm-tab active" data-tab="scripts">📜 Scripts</button>
          <button class="sm-tab" data-tab="editor">✏️ Editor</button>
          <button class="sm-tab" data-tab="console">🖥️ Console</button>
          <button class="sm-tab" data-tab="about">ℹ️ About</button>
        </div>
        <div class="sm-main">
          <!-- Scripts list tab -->
          <div class="sm-panel active" id="sm-tab-scripts">
            <div class="sm-panel-toolbar">
              <button class="win-toolbar-btn" id="sm-new-btn">+ New Script</button>
              <button class="win-toolbar-btn" id="sm-import-btn">📂 Import</button>
              <button class="win-toolbar-btn" id="sm-run-all-btn">▶ Run Enabled</button>
            </div>
            <div class="sm-scripts-list" id="sm-scripts-list" role="list"></div>
          </div>

          <!-- Editor tab -->
          <div class="sm-panel" id="sm-tab-editor">
            <div class="sm-panel-toolbar">
              <input class="sm-name-input" id="sm-script-name"
                     placeholder="Script name…" maxlength="60" />
              <input class="sm-name-input sm-desc-input" id="sm-script-desc"
                     placeholder="Description (optional)…" maxlength="120"
                     style="flex:2;" />
              <button class="win-toolbar-btn" id="sm-save-btn">💾 Save</button>
              <button class="win-toolbar-btn" id="sm-run-btn">▶ Run</button>
              <button class="win-toolbar-btn" id="sm-clear-editor-btn">🗑️</button>
            </div>
            <div style="padding:4px 10px;font-size:0.7rem;color:#ffd60a;background:rgba(255,214,10,0.08);border-bottom:1px solid rgba(255,214,10,0.15);flex-shrink:0;">
              ⚠️ Scripts run with full access to ${escHtml(NightOS.displayName)}. Only run code you trust.
            </div>
            <textarea class="sm-editor" id="sm-editor"
                      placeholder="// Write your JavaScript here…
// You have access to all Nightmare OS globals:
// showNotification(title, body)
// NightOS.launchApp(id)
// WindowManager, MatrixWallpaper, etc."
                      spellcheck="false" autocomplete="off"
                      autocorrect="off" autocapitalize="off"></textarea>
            <div class="win-statusbar">
              <span id="sm-editor-status">Ready</span>
              <span id="sm-editor-chars" style="margin-left:auto;">0 chars</span>
            </div>
          </div>

          <!-- Console tab -->
          <div class="sm-panel" id="sm-tab-console">
            <div class="sm-panel-toolbar">
              <button class="win-toolbar-btn" id="sm-console-clear">Clear</button>
              <label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--text-secondary);cursor:pointer;">
                <input type="checkbox" id="sm-intercept-log" />
                Intercept console.log
              </label>
            </div>
            <div style="padding:4px 10px;font-size:0.7rem;color:#ffd60a;background:rgba(255,214,10,0.08);border-bottom:1px solid rgba(255,214,10,0.15);flex-shrink:0;">
              ⚠️ Console executes JavaScript with full ${escHtml(NightOS.displayName)} access. Only run code you trust.
            </div>
            <div class="sm-console" id="sm-console" role="log" aria-label="Console output" aria-live="polite"></div>
            <div class="sm-console-input-row">
              <span style="color:#00ff41;font-size:0.8rem;flex-shrink:0;">❯</span>
              <input type="text" class="sm-console-input" id="sm-console-input"
                     placeholder="Execute JavaScript…" autocomplete="off"
                     spellcheck="false" />
            </div>
          </div>

          <!-- About tab -->
          <div class="sm-panel" id="sm-tab-about">
            <div class="sm-about">
              <div class="sm-about-logo">📜</div>
              <div class="sm-about-title">Script Manager</div>
              <div class="sm-about-sub">${escHtml(NightOS.displayName)} · Tampermonkey-style userscript runner</div>
              <div class="sm-about-shortcuts">
                <div class="sm-about-shortcut">
                  <kbd>Ctrl+Alt+S</kbd> — Open Script Manager
                </div>
                <div class="sm-about-shortcut">
                  <kbd>Ctrl+Alt+F</kbd> — Open Firefox Launcher
                </div>
              </div>
              <p class="sm-about-desc">
                Script Manager lets you write, install, and run JavaScript userscripts
                inside ${escHtml(NightOS.displayName)}. Scripts can interact with any part of the desktop —
                change the appearance, automate tasks, display notifications, and more.<br><br>
                For the real Tampermonkey browser extension (works in actual Firefox/Chrome),
                visit <a href="https://www.tampermonkey.net" target="_blank" rel="noopener noreferrer"
                         style="color:var(--accent);">tampermonkey.net ↗</a>
              </p>
              <button class="ff-launch-btn" id="sm-ff-link" style="margin-top:12px;">
                🦊 Get Tampermonkey for Firefox
              </button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function initManager(el) {
    const scriptsList = el.querySelector('#sm-scripts-list');
    const editor      = el.querySelector('#sm-editor');
    const nameInput   = el.querySelector('#sm-script-name');
    const descInput   = el.querySelector('#sm-script-desc');
    const editorStatus= el.querySelector('#sm-editor-status');
    const editorChars = el.querySelector('#sm-editor-chars');
    const consoleEl   = el.querySelector('#sm-console');
    const consoleInput= el.querySelector('#sm-console-input');

    let editingId = null; // null = new script

    /* ---- Tab switching ---- */
    el.querySelectorAll('.sm-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        el.querySelectorAll('.sm-tab').forEach(t => t.classList.remove('active'));
        el.querySelectorAll('.sm-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        el.querySelector(`#sm-tab-${tab.dataset.tab}`)?.classList.add('active');
      });
    });

    /* ---- Script list ---- */
    function renderList() {
      scriptsList.innerHTML = '';
      const all = allScripts();
      if (all.length === 0) {
        scriptsList.innerHTML = '<div style="padding:16px;color:var(--text-secondary);font-size:0.82rem;">No scripts — click "+ New Script" to add one.</div>';
        return;
      }
      all.forEach(script => {
        const card = document.createElement('div');
        card.className = `sm-script-card${script.enabled ? ' enabled' : ''}`;
        card.setAttribute('role', 'listitem');
        const builtin = script.builtin ? '<span class="sm-builtin-badge">built-in</span>' : '';
        card.innerHTML = `
          <label class="toggle sm-script-toggle" title="${script.enabled ? 'Disable' : 'Enable'}">
            <input type="checkbox" class="sm-toggle-chk" ${script.enabled ? 'checked' : ''} />
            <span class="toggle-track"></span>
          </label>
          <div class="sm-script-info">
            <div class="sm-script-name">${escHtml(script.name)} ${builtin}</div>
            <div class="sm-script-desc">${escHtml(script.desc || script.description || '')}</div>
          </div>
          <div class="sm-script-actions">
            <button class="sm-icon-btn sm-run-one" title="Run now" aria-label="Run">▶</button>
            <button class="sm-icon-btn sm-edit-one" title="Edit" aria-label="Edit"${script.builtin ? ' disabled style="opacity:0.4;"' : ''}>✏️</button>
            <button class="sm-icon-btn sm-del-one" title="Delete" aria-label="Delete"${script.builtin ? ' disabled style="opacity:0.4;"' : ''}>🗑️</button>
          </div>`;

        // Toggle enable/disable
        const chk = card.querySelector('.sm-toggle-chk');
        chk.addEventListener('change', () => {
          if (script.builtin) {
            script.enabled = chk.checked;
          } else {
            const s = userScripts.find(s => s.id === script.id);
            if (s) s.enabled = chk.checked;
            saveScripts();
          }
          card.classList.toggle('enabled', chk.checked);
        });

        // Run
        card.querySelector('.sm-run-one').addEventListener('click', () => runScript(script));

        // Edit (user scripts only)
        if (!script.builtin) {
          card.querySelector('.sm-edit-one').addEventListener('click', () => {
            editingId = script.id;
            nameInput.value = script.name;
            descInput.value = script.description || '';
            editor.value    = script.code || '';
            editorChars.textContent = `${editor.value.length} chars`;
            editorStatus.textContent = `Editing: ${script.name}`;
            // Switch to editor tab
            el.querySelectorAll('.sm-tab').forEach(t => t.classList.remove('active'));
            el.querySelectorAll('.sm-panel').forEach(p => p.classList.remove('active'));
            el.querySelector('.sm-tab[data-tab="editor"]')?.classList.add('active');
            el.querySelector('#sm-tab-editor')?.classList.add('active');
          });

          // Delete
          card.querySelector('.sm-del-one').addEventListener('click', () => {
            if (!window.confirm(`Delete script "${script.name}"?`)) return;
            const idx = userScripts.findIndex(s => s.id === script.id);
            if (idx > -1) { userScripts.splice(idx, 1); saveScripts(); }
            renderList();
          });
        }

        scriptsList.appendChild(card);
      });
    }

    /* ---- New script ---- */
    el.querySelector('#sm-new-btn').addEventListener('click', () => {
      editingId = null;
      nameInput.value = '';
      descInput.value = '';
      editor.value    = '// Your script here\n';
      editorStatus.textContent = 'New script';
      editorChars.textContent  = '14 chars';
      el.querySelectorAll('.sm-tab').forEach(t => t.classList.remove('active'));
      el.querySelectorAll('.sm-panel').forEach(p => p.classList.remove('active'));
      el.querySelector('.sm-tab[data-tab="editor"]')?.classList.add('active');
      el.querySelector('#sm-tab-editor')?.classList.add('active');
      setTimeout(() => nameInput.focus(), 50);
    });

    /* ---- Import ---- */
    el.querySelector('#sm-import-btn').addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.js,.user.js,application/javascript,text/javascript';
      inp.multiple = true;
      inp.addEventListener('change', () => {
        Array.from(inp.files).forEach(f => {
          const reader = new FileReader();
          reader.onload = ev => {
            const code = ev.target.result;
            const name = f.name.replace(/\.user\.js$|\.js$/, '') || 'Imported Script';
            // Parse ==UserScript== metadata if present
            const nameMeta  = code.match(/@name\s+(.+)/)?.[1]?.trim() || name;
            const descMeta  = code.match(/@description\s+(.+)/)?.[1]?.trim() || '';
            userScripts.push({
              id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              name: nameMeta, description: descMeta,
              enabled: false, builtin: false, code,
            });
            saveScripts();
            renderList();
            showNotification('Script Manager', `Imported: "${nameMeta}"`);
          };
          reader.readAsText(f);
        });
      });
      inp.click();
    });

    /* ---- Run all enabled ---- */
    el.querySelector('#sm-run-all-btn').addEventListener('click', () => {
      const enabled = allScripts().filter(s => s.enabled);
      if (enabled.length === 0) { showNotification('Script Manager', 'No enabled scripts.'); return; }
      enabled.forEach(runScript);
    });

    /* ---- Editor ---- */
    editor.addEventListener('input', () => {
      editorChars.textContent = `${editor.value.length} chars`;
    });

    el.querySelector('#sm-save-btn').addEventListener('click', () => {
      const name = nameInput.value.trim() || 'Untitled Script';
      const code = editor.value;
      if (editingId) {
        const s = userScripts.find(s => s.id === editingId);
        if (s) { s.name = name; s.description = descInput.value.trim(); s.code = code; }
      } else {
        userScripts.push({
          id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name, description: descInput.value.trim(),
          enabled: false, builtin: false, code,
        });
        editingId = userScripts[userScripts.length - 1].id;
      }
      saveScripts();
      editorStatus.textContent = `Saved: ${name}`;
      renderList();
      showNotification('Script Manager', `"${name}" saved.`);
    });

    el.querySelector('#sm-run-btn').addEventListener('click', () => {
      runScript({ name: nameInput.value.trim() || 'Inline', code: editor.value });
    });

    el.querySelector('#sm-clear-editor-btn').addEventListener('click', () => {
      if (!window.confirm('Clear editor?')) return;
      editor.value = '';
      nameInput.value = '';
      descInput.value = '';
      editingId = null;
      editorStatus.textContent = 'Ready';
      editorChars.textContent  = '0 chars';
    });

    /* ---- Console ---- */
    const consoleLog = (type, ...args) => {
      const line = document.createElement('div');
      line.className = `sm-console-line sm-console-${type}`;
      line.textContent = args.map(a => {
        try { return typeof a === 'object' ? JSON.stringify(a, null, 1) : String(a); }
        catch (_) { return String(a); }
      }).join(' ');
      consoleEl.appendChild(line);
      consoleEl.scrollTop = consoleEl.scrollHeight;
    };

    // Optional log interception
    let origLog, origWarn, origError;
    el.querySelector('#sm-intercept-log').addEventListener('change', function() {
      if (this.checked) {
        origLog   = console.log;
        origWarn  = console.warn;
        origError = console.error;
        console.log   = (...a) => { origLog(...a);   consoleLog('log',   ...a); };
        console.warn  = (...a) => { origWarn(...a);  consoleLog('warn',  ...a); };
        console.error = (...a) => { origError(...a); consoleLog('error', ...a); };
      } else {
        if (origLog)   console.log   = origLog;
        if (origWarn)  console.warn  = origWarn;
        if (origError) console.error = origError;
      }
    });

    el.querySelector('#sm-console-clear').addEventListener('click', () => {
      consoleEl.innerHTML = '';
    });

    consoleInput.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const code = consoleInput.value.trim();
      if (!code) return;
      consoleLog('input', '❯ ' + code);
      consoleInput.value = '';
      try {
        // eslint-disable-next-line no-new-func
        const result = new Function(`return (${code})`)();
        if (result !== undefined) consoleLog('log', '← ' + result);
      } catch (err) {
        consoleLog('error', '✗ ' + err.message);
      }
    });

    /* ---- About ---- */
    el.querySelector('#sm-ff-link')?.addEventListener('click', () => {
      window.open('https://addons.mozilla.org/firefox/addon/tampermonkey/', '_blank', 'noopener,noreferrer');
    });

    // Restore console on window close
    const obs = new MutationObserver(() => {
      if (!document.contains(el)) {
        if (origLog)   console.log   = origLog;
        if (origWarn)  console.warn  = origWarn;
        if (origError) console.error = origError;
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    renderList();
  }

  NightOS.registerApp('scriptmanager', {
    title: 'Script Manager',
    icon: '📜',
    open,
  });
})();
