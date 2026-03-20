/**
 * NightOS — Settings App
 */

'use strict';

(function () {
  const FONT_SIZES = { small: '12px', medium: '14px', large: '16px', xlarge: '18px' };

  function open() {
    const el = WindowManager.create({
      id: 'settings',
      title: 'Settings',
      icon: '⚙️',
      width: 640,
      height: 480,
      content: buildUI(),
    });
    initSettings(el);
  }

  function buildUI() {
    return `
      <div class="settings-layout">
        <nav class="settings-nav" aria-label="Settings categories">
          <div class="settings-nav-item active" data-panel="appearance">🎨 Appearance</div>
          <div class="settings-nav-item" data-panel="system">🖥️ System</div>
          <div class="settings-nav-item" data-panel="sound">🔊 Sound</div>
          <div class="settings-nav-item" data-panel="notifications">🔔 Notifications</div>
          <div class="settings-nav-item" data-panel="privacy">🔒 Privacy</div>
          <div class="settings-nav-item" data-panel="accessibility">♿ Accessibility</div>
          <div class="settings-nav-item" data-panel="shortcuts">⌨️ Shortcuts</div>
          <div class="settings-nav-item" data-panel="about">ℹ️ About</div>
        </nav>
        <div class="settings-panel" id="settings-panel-content">
          ${buildAppearancePanel()}
        </div>
      </div>`;
  }

  function buildAppearancePanel() {
    const wallpaperOpts = WALLPAPERS.map((wp, i) =>
      `<div class="wallpaper-option ${NightOS.settings.wallpaper === i ? 'selected' : ''}"
            data-wp="${i}" style="background:${wp};"
            tabindex="0" role="button" aria-label="Wallpaper ${i + 1}"
            aria-pressed="${NightOS.settings.wallpaper === i}"></div>`
    ).join('');

    return `
      <div class="settings-section">
        <h3>Wallpaper</h3>
        <div class="settings-row">
          <div class="settings-label">Matrix Rain Background<small>Animated Matrix rain as desktop background</small></div>
          <label class="toggle">
            <input type="checkbox" id="setting-matrix-wp" ${NightOS.settings.matrixWallpaper ? 'checked' : ''} />
            <span class="toggle-track"></span>
          </label>
        </div>
        <div class="wallpaper-grid" id="wallpaper-grid" style="${NightOS.settings.matrixWallpaper ? 'opacity:0.4;pointer-events:none;' : ''}">${wallpaperOpts}</div>
      </div>
      <div class="settings-section">
        <h3>Accent Color</h3>
        <div class="settings-row">
          <div class="settings-label">UI Accent Color<small>Applied to buttons and highlights</small></div>
          <input type="color" id="setting-accent" value="${NightOS.settings.accentColor || '#4f8ef7'}"
                 style="width:40px;height:32px;border:none;border-radius:4px;cursor:pointer;background:none;" />
        </div>
      </div>
      <div class="settings-section">
        <h3>Display</h3>
        <div class="settings-row">
          <div class="settings-label">Font Size<small>Adjusts UI text size</small></div>
          <select class="settings-select" id="setting-fontsize">
            <option value="small">Small</option>
            <option value="medium" selected>Medium</option>
            <option value="large">Large</option>
            <option value="xlarge">X-Large</option>
          </select>
        </div>
        <div class="settings-row">
          <div class="settings-label">Animations<small>Enable window animations</small></div>
          <label class="toggle">
            <input type="checkbox" id="setting-animations" ${NightOS.settings.animations ? 'checked' : ''} />
            <span class="toggle-track"></span>
          </label>
        </div>
      </div>`;
  }

  function buildSystemPanel() {
    const ua = navigator.userAgent;
    return `
      <div class="settings-section">
        <h3>Platform</h3>
        <div class="settings-row">
          <div class="settings-label">OS</div>
          <span style="font-size:0.82rem;color:var(--text-primary)">NightmareOS 2.0.0</span>
        </div>
        <div class="settings-row">
          <div class="settings-label">Platform</div>
          <span style="font-size:0.82rem;color:var(--text-primary)">${escHtml(navigator.platform || 'Unknown')}</span>
        </div>
        <div class="settings-row">
          <div class="settings-label">Browser</div>
          <span style="font-size:0.82rem;color:var(--text-primary);max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
                title="${escHtml(ua)}">${escHtml(ua.slice(0, 60))}…</span>
        </div>
        <div class="settings-row">
          <div class="settings-label">Screen</div>
          <span style="font-size:0.82rem;color:var(--text-primary)">${window.screen.width}×${window.screen.height} (${window.devicePixelRatio}x DPR)</span>
        </div>
        <div class="settings-row">
          <div class="settings-label">Language</div>
          <span style="font-size:0.82rem;color:var(--text-primary)">${escHtml(navigator.language || 'en-US')}</span>
        </div>
        <div class="settings-row">
          <div class="settings-label">Online</div>
          <span style="font-size:0.82rem;color:var(--text-primary)">${navigator.onLine ? '✅ Yes' : '❌ No'}</span>
        </div>
      </div>
      <div class="settings-section">
        <h3>Storage</h3>
        <div class="settings-row">
          <div class="settings-label">Clear all settings<small>Resets NightmareOS to defaults</small></div>
          <button class="win-toolbar-btn" id="btn-clear-storage" style="min-width:100px;">Clear Data</button>
        </div>
      </div>`;
  }

  function buildSoundPanel() {
    return `
      <div class="settings-section">
        <h3>Volume</h3>
        <div class="settings-row">
          <div class="settings-label">Master Volume</div>
          <input type="range" id="setting-volume" min="0" max="100"
                 value="${NightOS.settings.volume}"
                 style="width:140px;accent-color:var(--accent);"
                 aria-label="Master volume" />
        </div>
        <div class="settings-row">
          <div class="settings-label">System Sounds<small>Play sounds for notifications</small></div>
          <label class="toggle">
            <input type="checkbox" id="setting-sounds" checked />
            <span class="toggle-track"></span>
          </label>
        </div>
      </div>`;
  }

  function buildAccessibilityPanel() {
    return `
      <div class="settings-section">
        <h3>Accessibility</h3>
        <div class="settings-row">
          <div class="settings-label">High Contrast<small>Increase text contrast</small></div>
          <label class="toggle">
            <input type="checkbox" id="setting-contrast" />
            <span class="toggle-track"></span>
          </label>
        </div>
        <div class="settings-row">
          <div class="settings-label">Reduce Motion<small>Disable animations</small></div>
          <label class="toggle">
            <input type="checkbox" id="setting-reduce-motion" />
            <span class="toggle-track"></span>
          </label>
        </div>
        <div class="settings-row">
          <div class="settings-label">Focus Indicators<small>Enhanced keyboard focus</small></div>
          <label class="toggle">
            <input type="checkbox" id="setting-focus" checked />
            <span class="toggle-track"></span>
          </label>
        </div>
      </div>`;
  }

  function buildNotificationsPanel() {
    return `
      <div class="settings-section">
        <h3>Notifications</h3>
        <div class="settings-row">
          <div class="settings-label">Desktop Notifications<small>Show popup notifications</small></div>
          <label class="toggle">
            <input type="checkbox" id="setting-notif-enabled" ${NightOS.settings.notifications !== false ? 'checked' : ''} />
            <span class="toggle-track"></span>
          </label>
        </div>
        <div class="settings-row">
          <div class="settings-label">Notification Duration<small>How long notifications stay visible</small></div>
          <select class="settings-select" id="setting-notif-duration">
            <option value="2000" ${NightOS.settings.notifDuration === 2000 ? 'selected' : ''}>Short (2s)</option>
            <option value="3500" ${!NightOS.settings.notifDuration || NightOS.settings.notifDuration === 3500 ? 'selected' : ''}>Normal (3.5s)</option>
            <option value="6000" ${NightOS.settings.notifDuration === 6000 ? 'selected' : ''}>Long (6s)</option>
          </select>
        </div>
        <div class="settings-row">
          <div class="settings-label">Sound on Notification<small>Play a sound for each notification</small></div>
          <label class="toggle">
            <input type="checkbox" id="setting-notif-sound" ${NightOS.settings.notifSound ? 'checked' : ''} />
            <span class="toggle-track"></span>
          </label>
        </div>
      </div>`;
  }

  function buildPrivacyPanel() {
    let storageUsed = '–';
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        total += (key.length + (localStorage.getItem(key) || '').length) * 2;
      }
      if (total < 1024) storageUsed = total + ' B';
      else if (total < 1024 * 1024) storageUsed = (total / 1024).toFixed(1) + ' KB';
      else storageUsed = (total / (1024 * 1024)).toFixed(2) + ' MB';
    } catch (_) {}

    return `
      <div class="settings-section">
        <h3>Privacy &amp; Storage</h3>
        <div class="settings-row">
          <div class="settings-label">LocalStorage Used<small>Data stored by NightmareOS</small></div>
          <span style="font-size:0.82rem;color:var(--text-primary)">${storageUsed}</span>
        </div>
        <div class="settings-row">
          <div class="settings-label">Clear Browser History<small>Remove all browsing history</small></div>
          <button class="win-toolbar-btn" id="btn-clear-history" style="min-width:100px;">Clear History</button>
        </div>
        <div class="settings-row">
          <div class="settings-label">Clear Terminal History<small>Remove saved terminal commands</small></div>
          <button class="win-toolbar-btn" id="btn-clear-term-history" style="min-width:100px;">Clear History</button>
        </div>
        <div class="settings-row">
          <div class="settings-label">Clear Todo List<small>Remove all saved tasks</small></div>
          <button class="win-toolbar-btn" id="btn-clear-todos" style="min-width:100px;">Clear Todos</button>
        </div>
        <div class="settings-row">
          <div class="settings-label">Clear Saved Colors<small>Remove color picker history</small></div>
          <button class="win-toolbar-btn" id="btn-clear-colors" style="min-width:100px;">Clear Colors</button>
        </div>
        <div class="settings-row">
          <div class="settings-label">Clear All Data<small>Resets NightmareOS to defaults</small></div>
          <button class="win-toolbar-btn" id="btn-clear-all" style="min-width:100px;color:#ef4444;">Clear All</button>
        </div>
      </div>`;
  }

  function buildShortcutsPanel() {
    const shortcuts = [
      ['Ctrl/Cmd + Alt + T', 'Open Terminal'],
      ['Ctrl/Cmd + Alt + F', 'Open Firefox Launcher'],
      ['Ctrl/Cmd + Alt + S', 'Open Script Manager'],
      ['Enter', 'Sign in (Login Screen)'],
      ['Escape', 'Close Start Menu / Context Menu'],
      ['Ctrl + C', 'Cancel command (Terminal)'],
      ['Ctrl + L', 'Clear screen (Terminal)'],
      ['Arrow Up/Down', 'Navigate command history (Terminal)'],
    ];

    return `
      <div class="settings-section">
        <h3>Keyboard Shortcuts</h3>
        <table class="shortcuts-table">
          <thead><tr><th>Shortcut</th><th>Action</th></tr></thead>
          <tbody>
            ${shortcuts.map(([key, action]) =>
              `<tr><td><kbd>${escHtml(key)}</kbd></td><td>${escHtml(action)}</td></tr>`
            ).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function buildAboutPanel() {
    return `
      <div class="about-panel">
        <div class="about-logo">
          <svg width="72" height="72" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="38" stroke="#00ff41" stroke-width="2.5"/>
            <path d="M40 14 L54 34 H26 Z" fill="#00ff41"/>
            <path d="M40 66 L26 46 H54 Z" fill="#00ff41" opacity="0.6"/>
            <circle cx="40" cy="40" r="8" fill="#00ff41"/>
          </svg>
        </div>
        <div class="about-name">NightmareOS</div>
        <div class="about-version">Version 2.0.0 — Web Desktop Environment</div>
        <table class="about-table">
          <tr><td>Kernel</td><td>NightmareOS WebKernel 2.0</td></tr>
          <tr><td>Build</td><td>${new Date().getFullYear()}</td></tr>
          <tr><td>Platforms</td><td>Windows · macOS · Linux · Android · iOS</td></tr>
          <tr><td>Renderer</td><td>Web Browser (HTML5 + CSS3 + ES2020)</td></tr>
          <tr><td>License</td><td>MIT</td></tr>
        </table>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-top:16px;text-align:center;line-height:1.6;">
          NightmareOS is a web-based desktop environment that runs<br>in any modern browser on any operating system or device.
        </p>
      </div>`;
  }

  const PANELS = {
    appearance: buildAppearancePanel,
    system:     buildSystemPanel,
    sound:      buildSoundPanel,
    notifications: buildNotificationsPanel,
    privacy:    buildPrivacyPanel,
    accessibility: buildAccessibilityPanel,
    shortcuts:  buildShortcutsPanel,
    about:      buildAboutPanel,
  };

  function initSettings(el) {
    const panelEl = el.querySelector('#settings-panel-content');
    let activePanel = 'appearance';

    function showPanel(name) {
      activePanel = name;
      if (panelEl && PANELS[name]) {
        panelEl.innerHTML = PANELS[name]();
        bindPanelEvents(el, name);
      }
      el.querySelectorAll('.settings-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.panel === name);
      });
    }

    el.querySelectorAll('.settings-nav-item').forEach(item => {
      item.addEventListener('click', () => showPanel(item.dataset.panel));
    });

    bindPanelEvents(el, 'appearance');
  }

  function bindPanelEvents(el, panel) {
    const panelEl = el.querySelector('#settings-panel-content');
    if (!panelEl) return;

    if (panel === 'appearance') {
      // Matrix wallpaper toggle
      const matrixWpCheck = panelEl.querySelector('#setting-matrix-wp');
      const wallpaperGrid = panelEl.querySelector('#wallpaper-grid');
      if (matrixWpCheck) {
        matrixWpCheck.addEventListener('change', () => {
          NightOS.settings.matrixWallpaper = matrixWpCheck.checked;
          saveSettings();
          if (matrixWpCheck.checked) {
            if (window.MatrixWallpaper) window.MatrixWallpaper.start();
            if (wallpaperGrid) { wallpaperGrid.style.opacity = '0.4'; wallpaperGrid.style.pointerEvents = 'none'; }
          } else {
            if (window.MatrixWallpaper) window.MatrixWallpaper.stop();
            applyWallpaper(NightOS.settings.wallpaper);
            if (wallpaperGrid) { wallpaperGrid.style.opacity = ''; wallpaperGrid.style.pointerEvents = ''; }
          }
        });
      }

      // Accent color
      const accentInput = panelEl.querySelector('#setting-accent');
      if (accentInput) {
        accentInput.addEventListener('input', () => {
          NightOS.settings.accentColor = accentInput.value;
          document.documentElement.style.setProperty('--accent', accentInput.value);
          saveSettings();
        });
      }

      // Wallpaper selection
      panelEl.querySelectorAll('.wallpaper-option').forEach(opt => {
        const activate = () => {
          panelEl.querySelectorAll('.wallpaper-option').forEach(o => {
            o.classList.remove('selected');
            o.setAttribute('aria-pressed', 'false');
          });
          opt.classList.add('selected');
          opt.setAttribute('aria-pressed', 'true');
          // If matrix is active, disable it first
          if (NightOS.settings.matrixWallpaper && window.MatrixWallpaper) {
            window.MatrixWallpaper.stop();
            NightOS.settings.matrixWallpaper = false;
            if (matrixWpCheck) matrixWpCheck.checked = false;
            if (wallpaperGrid) { wallpaperGrid.style.opacity = ''; wallpaperGrid.style.pointerEvents = ''; }
            saveSettings();
          }
          applyWallpaper(parseInt(opt.dataset.wp, 10));
        };
        opt.addEventListener('click', activate);
        opt.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
        });
      });

      const fontSel = panelEl.querySelector('#setting-fontsize');
      if (fontSel) {
        fontSel.value = NightOS.settings.fontSize || 'medium';
        fontSel.addEventListener('change', () => {
          NightOS.settings.fontSize = fontSel.value;
          document.documentElement.style.fontSize = FONT_SIZES[fontSel.value] || '14px';
          saveSettings();
        });
      }

      const animCheck = panelEl.querySelector('#setting-animations');
      if (animCheck) {
        animCheck.addEventListener('change', () => {
          NightOS.settings.animations = animCheck.checked;
          saveSettings();
        });
      }
    }

    if (panel === 'system') {
      const clearBtn = panelEl.querySelector('#btn-clear-storage');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          if (window.confirm('Clear all NightOS settings and restart?')) {
            try { localStorage.removeItem('nightos_settings'); } catch (_) { /* ignore */ }
            showNotification('Settings', 'Settings cleared. Restarting…');
            setTimeout(() => restartOS(), 1500);
          }
        });
      }
    }

    if (panel === 'sound') {
      const vol = panelEl.querySelector('#setting-volume');
      if (vol) {
        vol.addEventListener('input', () => {
          NightOS.settings.volume = parseInt(vol.value, 10);
          saveSettings();
        });
      }
    }

    if (panel === 'accessibility') {
      const contrast = panelEl.querySelector('#setting-contrast');
      if (contrast) {
        contrast.addEventListener('change', () => {
          document.documentElement.classList.toggle('high-contrast', contrast.checked);
        });
      }
      const reduceMotion = panelEl.querySelector('#setting-reduce-motion');
      if (reduceMotion) {
        reduceMotion.addEventListener('change', () => {
          document.documentElement.classList.toggle('reduce-motion', reduceMotion.checked);
        });
      }
    }

    if (panel === 'notifications') {
      const notifEnabled = panelEl.querySelector('#setting-notif-enabled');
      if (notifEnabled) {
        notifEnabled.addEventListener('change', () => {
          NightOS.settings.notifications = notifEnabled.checked;
          saveSettings();
        });
      }
      const notifDuration = panelEl.querySelector('#setting-notif-duration');
      if (notifDuration) {
        notifDuration.addEventListener('change', () => {
          NightOS.settings.notifDuration = parseInt(notifDuration.value, 10);
          saveSettings();
        });
      }
      const notifSound = panelEl.querySelector('#setting-notif-sound');
      if (notifSound) {
        notifSound.addEventListener('change', () => {
          NightOS.settings.notifSound = notifSound.checked;
          saveSettings();
        });
      }
    }

    if (panel === 'privacy') {
      const clearHistory = panelEl.querySelector('#btn-clear-history');
      if (clearHistory) {
        clearHistory.addEventListener('click', () => {
          try { localStorage.removeItem('nightmareos_browser_history'); } catch (_) {}
          showNotification('Settings', 'Browsing history cleared.');
        });
      }
      const clearTermHistory = panelEl.querySelector('#btn-clear-term-history');
      if (clearTermHistory) {
        clearTermHistory.addEventListener('click', () => {
          try { localStorage.removeItem('nightmareos_term_history'); } catch (_) {}
          showNotification('Settings', 'Terminal history cleared.');
        });
      }
      const clearTodos = panelEl.querySelector('#btn-clear-todos');
      if (clearTodos) {
        clearTodos.addEventListener('click', () => {
          try { localStorage.removeItem('nightmareos_todos'); } catch (_) {}
          showNotification('Settings', 'Todo list cleared.');
        });
      }
      const clearColors = panelEl.querySelector('#btn-clear-colors');
      if (clearColors) {
        clearColors.addEventListener('click', () => {
          try { localStorage.removeItem('nightmareos_saved_colors'); } catch (_) {}
          showNotification('Settings', 'Saved colors cleared.');
        });
      }
      const clearAll = panelEl.querySelector('#btn-clear-all');
      if (clearAll) {
        clearAll.addEventListener('click', () => {
          if (window.confirm('Clear ALL NightmareOS data and restart?')) {
            try { localStorage.clear(); } catch (_) {}
            showNotification('Settings', 'All data cleared. Restarting…');
            setTimeout(() => restartOS(), 1500);
          }
        });
      }
    }
  }

  NightOS.registerApp('settings', {
    title: 'Settings',
    icon: '⚙️',
    open,
  });
})();
