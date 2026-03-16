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
          <div class="settings-nav-item" data-panel="accessibility">♿ Accessibility</div>
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
        <div class="wallpaper-grid" id="wallpaper-grid">${wallpaperOpts}</div>
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
          <span style="font-size:0.82rem;color:var(--text-primary)">NightOS 1.0.0</span>
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
          <div class="settings-label">Clear all settings<small>Resets NightOS to defaults</small></div>
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

  function buildAboutPanel() {
    return `
      <div class="about-panel">
        <div class="about-logo">
          <svg width="72" height="72" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="38" stroke="#4f8ef7" stroke-width="2.5"/>
            <path d="M40 14 L54 34 H26 Z" fill="#4f8ef7"/>
            <path d="M40 66 L26 46 H54 Z" fill="#4f8ef7" opacity="0.6"/>
            <circle cx="40" cy="40" r="8" fill="#4f8ef7"/>
          </svg>
        </div>
        <div class="about-name">NightOS</div>
        <div class="about-version">Version 1.0.0 — Cross-Platform Desktop Environment</div>
        <table class="about-table">
          <tr><td>Kernel</td><td>NightOS WebKernel 1.0</td></tr>
          <tr><td>Build</td><td>${new Date().getFullYear()}</td></tr>
          <tr><td>Platforms</td><td>Windows · macOS · Linux · Android</td></tr>
          <tr><td>Renderer</td><td>Web Browser (HTML5 + CSS3 + ES2020)</td></tr>
          <tr><td>License</td><td>MIT</td></tr>
        </table>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-top:16px;text-align:center;line-height:1.6;">
          NightOS is a web-based desktop environment that runs<br>in any modern browser on any operating system or device.
        </p>
      </div>`;
  }

  const PANELS = {
    appearance: buildAppearancePanel,
    system:     buildSystemPanel,
    sound:      buildSoundPanel,
    accessibility: buildAccessibilityPanel,
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
      // Wallpaper selection
      panelEl.querySelectorAll('.wallpaper-option').forEach(opt => {
        const activate = () => {
          panelEl.querySelectorAll('.wallpaper-option').forEach(o => {
            o.classList.remove('selected');
            o.setAttribute('aria-pressed', 'false');
          });
          opt.classList.add('selected');
          opt.setAttribute('aria-pressed', 'true');
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
  }

  NightOS.registerApp('settings', {
    title: 'Settings',
    icon: '⚙️',
    open,
  });
})();
