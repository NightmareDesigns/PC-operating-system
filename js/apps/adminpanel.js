/**
 * NightmareOS — Admin Panel
 * System tweaks, user settings, startup config, mods, and security.
 */

'use strict';

(function () {
  function open() {
    const el = WindowManager.create({
      id: 'adminpanel',
      title: 'Admin Panel',
      icon: '🛡️',
      width: 740,
      height: 520,
      content: buildUI(),
    });
    initAdmin(el);
  }

  function buildUI() {
    return `
      <div class="admin-layout">
        <nav class="admin-nav" aria-label="Admin sections">
          <div class="admin-nav-item active" data-panel="user">👤 User</div>
          <div class="admin-nav-item" data-panel="tweaks">⚡ Tweaks</div>
          <div class="admin-nav-item" data-panel="startup">🚀 Startup</div>
          <div class="admin-nav-item" data-panel="mods">🔧 Mods</div>
          <div class="admin-nav-item" data-panel="security">🔒 Security</div>
          <div class="admin-nav-item" data-panel="info">ℹ️ System Info</div>
        </nav>
        <div class="admin-content" id="admin-content"></div>
      </div>`;
  }

  /* ---- Panel builders ---- */
  function panelUser() {
    const username = NightOS.settings.username || 'User';
    return `
      <div class="admin-section">
        <h3>User Account</h3>
        <div class="admin-row">
          <div class="admin-label">Display Name<small>Shown on desktop and login</small></div>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="text" class="admin-input" id="adm-username"
                   value="${escHtml(username)}" maxlength="30" placeholder="Enter name…" />
            <button class="win-toolbar-btn" id="adm-username-save">Apply</button>
          </div>
        </div>
        <div class="admin-row">
          <div class="admin-label">Login Password<small>Leave blank for no password</small></div>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="password" class="admin-input" id="adm-password"
                   placeholder="New password…" maxlength="64" autocomplete="new-password" />
            <button class="win-toolbar-btn" id="adm-password-save">Set</button>
          </div>
        </div>
      </div>
      <div class="admin-section">
        <h3>Boot Message</h3>
        <div class="admin-row">
          <div class="admin-label">Custom Boot Message<small>Shown on the final boot step</small></div>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="text" class="admin-input" id="adm-boot-msg"
                   value="${escHtml(NightOS.settings.bootMessage || 'Welcome to NightmareOS!')}"
                   maxlength="80" placeholder="Boot message…" />
            <button class="win-toolbar-btn" id="adm-boot-msg-save">Apply</button>
          </div>
        </div>
      </div>`;
  }

  function panelTweaks() {
    return `
      <div class="admin-section">
        <h3>Visual Tweaks</h3>
        <div class="admin-row">
          <div class="admin-label">Matrix Rain Background<small>Animated Matrix desktop background</small></div>
          <label class="toggle">
            <input type="checkbox" id="adm-matrix-wp" ${NightOS.settings.matrixWallpaper ? 'checked' : ''} />
            <span class="toggle-track"></span>
          </label>
        </div>
        <div class="admin-row">
          <div class="admin-label">Window Animations<small>Smooth open/close transitions</small></div>
          <label class="toggle">
            <input type="checkbox" id="adm-animations" ${NightOS.settings.animations !== false ? 'checked' : ''} />
            <span class="toggle-track"></span>
          </label>
        </div>
        <div class="admin-row">
          <div class="admin-label">Accent Color<small>Primary UI highlight color</small></div>
          <input type="color" id="adm-accent"
                 value="${NightOS.settings.accentColor || '#4f8ef7'}"
                 style="width:44px;height:34px;border:none;border-radius:4px;cursor:pointer;background:none;" />
        </div>
        <div class="admin-row">
          <div class="admin-label">Font Size</div>
          <select class="settings-select" id="adm-fontsize">
            <option value="small">Small (12px)</option>
            <option value="medium">Medium (14px)</option>
            <option value="large">Large (16px)</option>
            <option value="xlarge">X-Large (18px)</option>
          </select>
        </div>
      </div>
      <div class="admin-section">
        <h3>Desktop</h3>
        <div class="admin-row">
          <div class="admin-label">Show Desktop Icons<small>Toggle desktop icon visibility</small></div>
          <label class="toggle">
            <input type="checkbox" id="adm-show-icons" checked />
            <span class="toggle-track"></span>
          </label>
        </div>
        <div class="admin-row">
          <div class="admin-label">Taskbar Position</div>
          <select class="settings-select" id="adm-taskbar-pos">
            <option value="bottom" selected>Bottom</option>
            <option value="top">Top</option>
          </select>
        </div>
      </div>`;
  }

  function panelStartup() {
    const startApps = NightOS.settings.startupApps || [];
    const apps = [
      { id: 'terminal',    label: '💻 Terminal' },
      { id: 'filemanager', label: '📁 File Manager' },
      { id: 'clock',       label: '🕐 Clock' },
      { id: 'musicplayer', label: '🎵 Music Player' },
      { id: 'sysmonitor',  label: '📊 System Monitor' },
      { id: 'calendar',    label: '📅 Calendar' },
    ];
    const rows = apps.map(a =>
      `<div class="admin-row">
        <div class="admin-label">${a.label}</div>
        <label class="toggle">
          <input type="checkbox" class="adm-startup-chk" data-app="${a.id}"
                 ${startApps.includes(a.id) ? 'checked' : ''} />
          <span class="toggle-track"></span>
        </label>
      </div>`
    ).join('');
    return `
      <div class="admin-section">
        <h3>Startup Applications</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:12px;">
          These apps will launch automatically after login.
        </p>
        ${rows}
      </div>`;
  }

  function panelMods() {
    return `
      <div class="admin-section">
        <h3>Custom CSS</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:8px;">
          Inject custom CSS to override any NightmareOS styles.
        </p>
        <textarea id="adm-custom-css" class="admin-textarea"
                  placeholder=":root { --accent: #ff0080; } .taskbar-start { background: red; }"
                  aria-label="Custom CSS">${escHtml(NightOS.settings.customCss || '')}</textarea>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="win-toolbar-btn" id="adm-css-apply">Apply CSS</button>
          <button class="win-toolbar-btn" id="adm-css-clear">Clear</button>
        </div>
      </div>
      <div class="admin-section">
        <h3>Developer Tools</h3>
        <div class="admin-row">
          <div class="admin-label">Open Browser DevTools<small>F12 or right-click → Inspect</small></div>
          <button class="win-toolbar-btn" id="adm-devtools">Open DevTools</button>
        </div>
        <div class="admin-row">
          <div class="admin-label">Export Settings<small>Download your NightmareOS settings as JSON</small></div>
          <button class="win-toolbar-btn" id="adm-export">Export</button>
        </div>
        <div class="admin-row">
          <div class="admin-label">Import Settings<small>Load settings from a JSON file</small></div>
          <button class="win-toolbar-btn" id="adm-import">Import</button>
        </div>
      </div>`;
  }

  function panelSecurity() {
    return `
      <div class="admin-section">
        <h3>Screen Lock</h3>
        <div class="admin-row">
          <div class="admin-label">Lock after idle<small>Auto-lock screen after inactivity</small></div>
          <select class="settings-select" id="adm-lock-time">
            <option value="0" selected>Never</option>
            <option value="1">1 minute</option>
            <option value="5">5 minutes</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
          </select>
        </div>
        <div class="admin-row">
          <div class="admin-label">Lock Screen Now</div>
          <button class="win-toolbar-btn" id="adm-lock-now">🔒 Lock</button>
        </div>
      </div>
      <div class="admin-section">
        <h3>Privacy</h3>
        <div class="admin-row">
          <div class="admin-label">Clear All Data<small>Wipe all settings and saved data</small></div>
          <button class="win-toolbar-btn" id="adm-clear-all" style="color:#ff3b30;">Clear All Data</button>
        </div>
        <div class="admin-row">
          <div class="admin-label">Clear Sticky Notes<small>Delete all saved sticky notes</small></div>
          <button class="win-toolbar-btn" id="adm-clear-notes">Clear Notes</button>
        </div>
      </div>`;
  }

  function panelInfo() {
    const ua = navigator.userAgent;
    const mem = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Unknown';
    const cores = navigator.hardwareConcurrency || 'Unknown';
    return `
      <div class="admin-section">
        <h3>NightmareOS</h3>
        <table class="about-table">
          <tr><td>Version</td><td>NightmareOS 2.0.0</td></tr>
          <tr><td>WebKernel</td><td>2.0.0</td></tr>
          <tr><td>Platform</td><td>${escHtml(navigator.platform || 'Unknown')}</td></tr>
          <tr><td>CPU Cores</td><td>${cores}</td></tr>
          <tr><td>RAM</td><td>${mem}</td></tr>
          <tr><td>Screen</td><td>${window.screen.width}×${window.screen.height} @ ${window.devicePixelRatio}x</td></tr>
          <tr><td>Language</td><td>${escHtml(navigator.language || 'en-US')}</td></tr>
          <tr><td>Timezone</td><td>${escHtml(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown')}</td></tr>
          <tr><td>Online</td><td>${navigator.onLine ? '✅ Yes' : '❌ No'}</td></tr>
          <tr><td>Touch</td><td>${'ontouchstart' in window ? '✅ Yes' : '❌ No'}</td></tr>
        </table>
        <div style="margin-top:12px;font-size:0.72rem;color:var(--text-secondary);word-break:break-all;">
          ${escHtml(ua)}
        </div>
      </div>`;
  }

  const PANELS = {
    user: panelUser, tweaks: panelTweaks, startup: panelStartup,
    mods: panelMods, security: panelSecurity, info: panelInfo,
  };

  /* ---- Init ---- */
  function initAdmin(el) {
    const content = el.querySelector('#admin-content');

    function showPanel(name) {
      if (!PANELS[name]) return;
      content.innerHTML = PANELS[name]();
      bindPanel(el, name);
      el.querySelectorAll('.admin-nav-item').forEach(item =>
        item.classList.toggle('active', item.dataset.panel === name));
    }

    el.querySelectorAll('.admin-nav-item').forEach(item =>
      item.addEventListener('click', () => showPanel(item.dataset.panel)));

    showPanel('user');
  }

  function bindPanel(el, panel) {
    const FONT_SIZES = { small: '12px', medium: '14px', large: '16px', xlarge: '18px' };

    if (panel === 'user') {
      el.querySelector('#adm-username-save')?.addEventListener('click', () => {
        const val = el.querySelector('#adm-username')?.value.trim();
        if (!val) return;
        NightOS.settings.username = val;
        NightOS.username = val;
        document.querySelectorAll('.login-user, .start-username').forEach(e => e.textContent = val);
        saveSettings();
        showNotification('Admin Panel', `Username set to "${val}".`);
      });

      el.querySelector('#adm-password-save')?.addEventListener('click', () => {
        const pw = el.querySelector('#adm-password')?.value;
        NightOS.settings.loginPassword = pw || '';
        saveSettings();
        showNotification('Admin Panel', pw ? 'Password set.' : 'Password removed.');
        if (el.querySelector('#adm-password')) el.querySelector('#adm-password').value = '';
      });

      el.querySelector('#adm-boot-msg-save')?.addEventListener('click', () => {
        const msg = el.querySelector('#adm-boot-msg')?.value.trim();
        if (!msg) return;
        NightOS.settings.bootMessage = msg;
        saveSettings();
        showNotification('Admin Panel', 'Boot message updated.');
      });
    }

    if (panel === 'tweaks') {
      const matrixChk = el.querySelector('#adm-matrix-wp');
      matrixChk?.addEventListener('change', () => {
        NightOS.settings.matrixWallpaper = matrixChk.checked;
        saveSettings();
        if (matrixChk.checked) {
          if (window.MatrixWallpaper) window.MatrixWallpaper.start();
        } else {
          if (window.MatrixWallpaper) window.MatrixWallpaper.stop();
          applyWallpaper(NightOS.settings.wallpaper);
        }
      });

      const animChk = el.querySelector('#adm-animations');
      animChk?.addEventListener('change', () => {
        NightOS.settings.animations = animChk.checked;
        saveSettings();
      });

      const accentInp = el.querySelector('#adm-accent');
      accentInp?.addEventListener('input', () => {
        NightOS.settings.accentColor = accentInp.value;
        document.documentElement.style.setProperty('--accent', accentInp.value);
        saveSettings();
      });

      const fontSel = el.querySelector('#adm-fontsize');
      if (fontSel) {
        fontSel.value = NightOS.settings.fontSize || 'medium';
        fontSel.addEventListener('change', () => {
          NightOS.settings.fontSize = fontSel.value;
          document.documentElement.style.fontSize = FONT_SIZES[fontSel.value] || '14px';
          saveSettings();
        });
      }

      const iconsChk = el.querySelector('#adm-show-icons');
      iconsChk?.addEventListener('change', () => {
        const icons = document.getElementById('desktop-icons');
        if (icons) icons.style.display = iconsChk.checked ? '' : 'none';
      });

      const taskbarSel = el.querySelector('#adm-taskbar-pos');
      taskbarSel?.addEventListener('change', () => {
        const tb = document.getElementById('taskbar');
        const startMenu = document.getElementById('start-menu');
        if (!tb) return;
        if (taskbarSel.value === 'top') {
          tb.style.top = '0'; tb.style.bottom = 'auto';
          if (startMenu) { startMenu.style.bottom = 'auto'; startMenu.style.top = 'calc(var(--taskbar-height) + 6px)'; }
        } else {
          tb.style.top = ''; tb.style.bottom = '0';
          if (startMenu) { startMenu.style.top = ''; startMenu.style.bottom = 'calc(var(--taskbar-height) + 6px)'; }
        }
      });
    }

    if (panel === 'startup') {
      el.querySelectorAll('.adm-startup-chk').forEach(chk => {
        chk.addEventListener('change', () => {
          const startApps = NightOS.settings.startupApps || [];
          const appId = chk.dataset.app;
          if (chk.checked) {
            if (!startApps.includes(appId)) startApps.push(appId);
          } else {
            const idx = startApps.indexOf(appId);
            if (idx > -1) startApps.splice(idx, 1);
          }
          NightOS.settings.startupApps = startApps;
          saveSettings();
        });
      });
    }

    if (panel === 'mods') {
      const cssArea  = el.querySelector('#adm-custom-css');
      const applyBtn = el.querySelector('#adm-css-apply');
      const clearBtn = el.querySelector('#adm-css-clear');

      applyBtn?.addEventListener('click', () => {
        const css = cssArea?.value || '';
        NightOS.settings.customCss = css;
        saveSettings();
        let styleEl = document.getElementById('nightmareos-custom-css');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'nightmareos-custom-css';
          document.head.appendChild(styleEl);
        }
        styleEl.textContent = css;
        showNotification('Admin Panel', 'Custom CSS applied.');
      });

      clearBtn?.addEventListener('click', () => {
        if (cssArea) cssArea.value = '';
        NightOS.settings.customCss = '';
        saveSettings();
        const styleEl = document.getElementById('nightmareos-custom-css');
        if (styleEl) styleEl.textContent = '';
        showNotification('Admin Panel', 'Custom CSS cleared.');
      });

      el.querySelector('#adm-devtools')?.addEventListener('click', () => {
        showNotification('Admin Panel', 'Press F12 or right-click → Inspect to open DevTools.');
      });

      el.querySelector('#adm-export')?.addEventListener('click', () => {
        const data = JSON.stringify(NightOS.settings, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'nightmareos-settings.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });

      el.querySelector('#adm-import')?.addEventListener('click', () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = '.json,application/json';
        inp.addEventListener('change', () => {
          const f = inp.files[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = e => {
            try {
              const data = JSON.parse(e.target.result);
              Object.assign(NightOS.settings, data);
              saveSettings();
              showNotification('Admin Panel', 'Settings imported. Restart to apply all changes.');
            } catch (_) {
              showNotification('Admin Panel', 'Invalid settings file.');
            }
          };
          reader.readAsText(f);
        });
        inp.click();
      });
    }

    if (panel === 'security') {
      el.querySelector('#adm-lock-now')?.addEventListener('click', () => {
        WindowManager.close('adminpanel');
        if (window.lockScreen) lockScreen();
      });

      el.querySelector('#adm-clear-all')?.addEventListener('click', () => {
        if (!window.confirm('Clear ALL NightmareOS data and restart?')) return;
        let cleared = false;
        try { localStorage.clear(); cleared = true; } catch (_) {}
        if (cleared) {
          showNotification('Admin Panel', 'All data cleared. Restarting…');
          setTimeout(() => { if (window.restartOS) restartOS(); }, 1500);
        } else {
          showNotification('Admin Panel', '⚠️ Could not clear storage — browser may be restricting access.');
        }
      });

      el.querySelector('#adm-clear-notes')?.addEventListener('click', () => {
        try { localStorage.removeItem('nightos_stickynotes'); } catch (_) {}
        document.querySelectorAll('.sticky-note').forEach(n => n.remove());
        showNotification('Admin Panel', 'Sticky notes cleared.');
      });
    }
  }

  NightOS.registerApp('adminpanel', {
    title: 'Admin Panel',
    icon: '🛡️',
    open,
  });
})();
