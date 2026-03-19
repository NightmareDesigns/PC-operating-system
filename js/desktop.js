/**
 * NightOS — Desktop Core
 * Manages desktop icons, context menu, taskbar clock, start menu,
 * and keyboard navigation.
 */

'use strict';

/* ---- Global OS State ---- */
const NightOS = {
  version: '2.0.0',
  displayName: 'NightmareOS',
  username: 'User',
  platform: navigator.platform || 'Unknown',
  /** @type {Map<string, {title:string, icon:string, open:function}>} */
  apps: new Map(),
  settings: {
    wallpaper: 0,
    theme: 'dark',
    animations: true,
    fontSize: 'medium',
    volume: 80,
    matrixWallpaper: true,
    accentColor: '#4f8ef7',
    username: 'User',
    bootMessage: 'Welcome to NightmareOS!',
  },

  /** Register an application */
  registerApp(id, meta) {
    this.apps.set(id, meta);
  },

  /** Launch an app by ID */
  launchApp(id) {
    const app = this.apps.get(id);
    if (app) {
      app.open();
    } else {
      showNotification('NightmareOS', `App "${id}" not found.`);
    }
  },
};

/* ---- Wallpapers ---- */
const WALLPAPERS = [
  'radial-gradient(ellipse at 30% 30%, #1a2d5a 0%, #050c1a 60%, #050709 100%)',
  'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  'linear-gradient(135deg, #1a0533 0%, #16213e 50%, #0f3460 100%)',
  'radial-gradient(ellipse at 70% 50%, #1a3a2a 0%, #071410 70%)',
  'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)',
  'radial-gradient(ellipse at 50% 0%, #2a0a3a 0%, #050709 70%)',
  'linear-gradient(160deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
  'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
];

/* ---- Utility ---- */
function $(id) { return document.getElementById(id); }

function showNotification(title, body, duration = 3500) {
  const area = $('notification-area');
  const el = document.createElement('div');
  el.className = 'notification';
  el.innerHTML = `<div class="notification-title">${escHtml(title)}</div>
                  <div class="notification-body">${escHtml(body)}</div>`;
  area.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(40px)';
    el.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(() => el.remove(), 320);
  }, duration);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ---- Clock ---- */
function updateClock() {
  const now = new Date();
  const timeEl = $('tray-time');
  const dateEl = $('tray-date');
  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  const loginDt = $('login-datetime');
  if (loginDt) {
    loginDt.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

setInterval(updateClock, 1000);
updateClock();

/* ---- Apply Wallpaper ---- */
function applyWallpaper(index) {
  const wp = WALLPAPERS[index] || WALLPAPERS[0];
  const el = $('wallpaper');
  if (el) el.style.background = wp;
  NightOS.settings.wallpaper = index;
  saveSettings();
}

/* ---- Settings Persistence ---- */
function saveSettings() {
  try {
    localStorage.setItem('nightos_settings', JSON.stringify(NightOS.settings));
  } catch (_) { /* storage may be unavailable */ }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem('nightos_settings');
    if (raw) {
      Object.assign(NightOS.settings, JSON.parse(raw));
    }
  } catch (_) { /* ignore */ }
}

/* ---- Desktop Icons ---- */
function initDesktopIcons() {
  document.querySelectorAll('.desktop-icon').forEach(icon => {
    const appId = icon.dataset.app;

    icon.addEventListener('click', () => NightOS.launchApp(appId));

    icon.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        NightOS.launchApp(appId);
      }
    });
  });
}

/* ---- Context Menu ---- */
function initContextMenu() {
  const menu = $('context-menu');

  document.addEventListener('contextmenu', e => {
    // Allow context menu inside window content areas
    if (e.target.closest('.window-content') || e.target.closest('.terminal-input')) return;

    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - menu.offsetWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menu.offsetHeight - 8);
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove('hidden');
  });

  document.addEventListener('click', () => menu.classList.add('hidden'));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') menu.classList.add('hidden');
  });

  menu.querySelectorAll('li[data-action]').forEach(item => {
    item.addEventListener('click', e => {
      e.stopPropagation();
      menu.classList.add('hidden');
      handleContextAction(item.dataset.action);
    });
  });
}

function handleContextAction(action) {
  switch (action) {
    case 'new-folder':
      showNotification('Files', 'New folder created on desktop.');
      break;
    case 'new-file':
      NightOS.launchApp('texteditor');
      break;
    case 'new-sticky': {
      const menu = $('context-menu');
      const x = parseInt(menu.style.left, 10) || 100;
      const y = parseInt(menu.style.top, 10)  || 100;
      if (window.StickyNotes) window.StickyNotes.add(x, y);
      break;
    }
    case 'change-wallpaper':
      NightOS.launchApp('settings');
      break;
    case 'matrix-wallpaper':
      NightOS.launchApp('matrix');
      break;
    case 'settings':
      NightOS.launchApp('settings');
      break;
    case 'refresh':
      showNotification('Desktop', 'Desktop refreshed.');
      break;
    default:
      break;
  }
}

/* ---- Start Menu ---- */
function initStartMenu() {
  const btn = $('start-btn');
  const menu = $('start-menu');

  // Detect platform
  const ua = navigator.userAgent;
  let platformName = 'Web Browser';
  if (/Android/i.test(ua)) platformName = 'Android';
  else if (/iPad|iPhone|iPod/i.test(ua)) platformName = 'iOS';
  else if (/Win/i.test(ua)) platformName = 'Windows';
  else if (/Mac/i.test(ua)) platformName = 'macOS';
  else if (/Linux/i.test(ua)) platformName = 'Linux';

  const platformEl = $('start-platform');
  if (platformEl) platformEl.textContent = `NightmareOS 2.0 · ${platformName}`;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = !menu.classList.contains('hidden');
    menu.classList.toggle('hidden', open);
    btn.setAttribute('aria-expanded', String(!open));
    if (!open) {
      const search = $('start-search');
      if (search) {
        search.value = '';
        filterStartApps('');
        setTimeout(() => search.focus(), 50);
      }
    }
  });

  document.addEventListener('click', e => {
    if (!menu.contains(e.target) && e.target !== btn) {
      menu.classList.add('hidden');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      menu.classList.add('hidden');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  // App grid items
  menu.querySelectorAll('.start-app-item').forEach(item => {
    item.addEventListener('click', () => {
      menu.classList.add('hidden');
      btn.setAttribute('aria-expanded', 'false');
      NightOS.launchApp(item.dataset.app);
    });
  });

  // Search
  const searchInput = $('start-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => filterStartApps(searchInput.value));
  }

  // Footer buttons
  $('btn-lock').addEventListener('click', () => {
    menu.classList.add('hidden');
    lockScreen();
  });

  $('btn-restart').addEventListener('click', () => {
    menu.classList.add('hidden');
    restartOS();
  });

  $('btn-shutdown').addEventListener('click', () => {
    menu.classList.add('hidden');
    shutdownOS();
  });
}

function filterStartApps(query) {
  const q = query.trim().toLowerCase();
  const grid = $('start-app-grid');
  if (!grid) return;
  grid.querySelectorAll('.start-app-item').forEach(item => {
    const name = item.querySelector('span:last-child')?.textContent.toLowerCase() || '';
    item.style.display = (!q || name.includes(q)) ? '' : 'none';
  });
}

/* ---- System Actions ---- */
function lockScreen() {
  const login = $('login-screen');
  const desktop = $('desktop');
  if (login && desktop) {
    desktop.classList.add('hidden');
    login.classList.remove('hidden');
    setTimeout(() => $('login-password')?.focus(), 100);
  }
}

function restartOS() {
  const boot = $('boot-screen');
  const desktop = $('desktop');
  if (boot && desktop) {
    desktop.classList.add('hidden');
    boot.classList.remove('hidden');
    $('boot-bar').style.width = '0%';
    $('boot-status').textContent = 'Restarting…';
    setTimeout(() => startBoot(false), 200);
  }
}

function shutdownOS() {
  document.body.innerHTML = `
    <div style="position:fixed;inset:0;background:#050709;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:16px;color:white;font-family:system-ui;">
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
        <circle cx="30" cy="30" r="28" stroke="#4f8ef7" stroke-width="2"/>
        <line x1="30" y1="14" x2="30" y2="32" stroke="#4f8ef7" stroke-width="3" stroke-linecap="round"/>
        <path d="M20 20 A14 14 0 1 0 40 20" stroke="#4f8ef7" stroke-width="3" stroke-linecap="round" fill="none"/>
      </svg>
      <p style="font-size:1.1rem;font-weight:300;letter-spacing:0.05em;">NightOS has shut down.</p>
      <p style="font-size:0.82rem;color:#8892a4;">Close this tab or refresh to restart.</p>
    </div>`;
}

/* ---- Global keyboard shortcuts ---- */
function initGlobalShortcuts() {
  document.addEventListener('keydown', e => {
    // Ctrl/Cmd + Alt + T → Terminal
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 't') {
      e.preventDefault();
      NightOS.launchApp('terminal');
    }
    // Ctrl/Cmd + Alt + F → Firefox Launcher
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'f') {
      e.preventDefault();
      NightOS.launchApp('firefox');
    }
    // Ctrl/Cmd + Alt + S → Script Manager (Tampermonkey)
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 's') {
      e.preventDefault();
      NightOS.launchApp('scriptmanager');
    }
    // Super / Win key (Meta alone) → Start menu
    // Note: browsers intercept Meta alone, so we skip
  });
}

/* ---- Init Desktop ---- */
function initDesktop() {
  loadSettings();
  // Apply accent color if customized
  if (NightOS.settings.accentColor && NightOS.settings.accentColor !== '#4f8ef7') {
    document.documentElement.style.setProperty('--accent', NightOS.settings.accentColor);
  }
  // Apply username
  NightOS.username = NightOS.settings.username || 'User';
  document.querySelectorAll('.login-user, .start-username').forEach(el => {
    el.textContent = NightOS.username;
  });
  // Start Matrix rain wallpaper by default (or apply gradient)
  if (NightOS.settings.matrixWallpaper && window.MatrixWallpaper) {
    window.MatrixWallpaper.start();
  } else {
    applyWallpaper(NightOS.settings.wallpaper);
  }
  initDesktopIcons();
  initContextMenu();
  initStartMenu();
  initGlobalShortcuts();
  // Render persisted sticky notes
  if (window.StickyNotes) window.StickyNotes.renderSaved();
  showNotification('NightmareOS', `Welcome, ${NightOS.username}! ` +
    'Running on ' + (navigator.platform || 'your device') + '.');
}

// Exposed globally so boot.js can call it
window.initDesktop = initDesktop;
window.NightOS = NightOS;
window.applyWallpaper = applyWallpaper;
window.WALLPAPERS = WALLPAPERS;
window.showNotification = showNotification;
window.escHtml = escHtml;
window.lockScreen = lockScreen;
window.restartOS = restartOS;
window.shutdownOS = shutdownOS;
window.saveSettings = saveSettings;
