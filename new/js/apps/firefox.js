/**
 * NightmareOS — Firefox Launcher
 * Opens Mozilla Firefox in a new browser window/tab.
 * Keyboard shortcut: Ctrl+Alt+F
 *
 * Since NightmareOS runs inside a browser, this launcher attempts to
 * open a new Firefox window via window.open(). On systems where Firefox
 * is not the current browser it provides download instructions and a
 * direct link.
 */

'use strict';

(function () {
  function open() {
    const el = WindowManager.create({
      id: 'firefox',
      title: 'Firefox Launcher',
      icon: '🦊',
      width: 540,
      height: 420,
      resizable: false,
      content: buildUI(),
    });
    initLauncher(el);
  }

  function buildUI() {
    const isFirefox = /Firefox\//.test(navigator.userAgent);
    const browserName = detectBrowser();

    return `
      <div class="ff-layout">
        <div class="ff-logo-row">
          <span class="ff-logo">🦊</span>
          <div>
            <div class="ff-title">Mozilla Firefox</div>
            <div class="ff-subtitle">Free and Open-Source Web Browser</div>
          </div>
        </div>

        ${isFirefox
          ? `<div class="ff-status ff-status-ok">
               ✅ You are already running Firefox!
               <span>Shortcut: <kbd>Ctrl+Alt+F</kbd></span>
             </div>`
          : `<div class="ff-status ff-status-warn">
               ⚠️ Current browser: <strong>${escHtml(browserName)}</strong>
               <span>Firefox is not detected. Launch it below or download it.</span>
             </div>`
        }

        <div class="ff-section">
          <h3>Launch Firefox</h3>
          <div class="ff-btn-row">
            <button class="ff-launch-btn" id="ff-open-window">
              🦊 Open Firefox Window
            </button>
            <button class="ff-launch-btn ff-launch-secondary" id="ff-open-tab">
              🌐 Open Firefox Homepage
            </button>
          </div>
          <p class="ff-note">
            Clicking "Open Firefox Window" will attempt to open a new browser window
            using your system's default handler.<br>
            If Firefox is not installed,
            <a id="ff-download-link" href="https://www.mozilla.org/firefox/" target="_blank" rel="noopener noreferrer"
               style="color:var(--accent);">download it here ↗</a>.
          </p>
        </div>

        <div class="ff-section">
          <h3>Tampermonkey Plugin</h3>
          <p class="ff-note">
            Tampermonkey is a popular userscript manager for Firefox.
            After installing Firefox, add Tampermonkey from the Firefox Add-ons store.
          </p>
          <div class="ff-btn-row">
            <button class="ff-launch-btn" id="ff-tampermonkey">
              🐒 Get Tampermonkey for Firefox
            </button>
            <button class="ff-launch-btn ff-launch-secondary" id="ff-scriptmgr">
              📜 NightmareOS Script Manager
            </button>
          </div>
        </div>

        <div class="ff-section">
          <h3>Keyboard Shortcut</h3>
          <div class="ff-shortcut-row">
            <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>F</kbd>
            <span style="color:var(--text-secondary);font-size:0.8rem;">— Open this Firefox Launcher</span>
          </div>
          <div class="ff-shortcut-row" style="margin-top:6px;">
            <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>S</kbd>
            <span style="color:var(--text-secondary);font-size:0.8rem;">— Open Script Manager</span>
          </div>
        </div>
      </div>`;
  }

  function detectBrowser() {
    const ua = navigator.userAgent;
    if (/Firefox\//.test(ua))   return 'Mozilla Firefox';
    if (/Edg\//.test(ua))       return 'Microsoft Edge';
    if (/OPR\//.test(ua))       return 'Opera';
    if (/Chrome\//.test(ua))    return 'Google Chrome';
    if (/Safari\//.test(ua))    return 'Apple Safari';
    return 'Unknown Browser';
  }

  function initLauncher(el) {
    el.querySelector('#ff-open-window').addEventListener('click', () => {
      // Attempt to open Firefox by trying the firefox:// protocol handler,
      // falling back to opening a new window to the Firefox homepage.
      try {
        window.open('firefox://', '_blank', 'noopener,noreferrer,width=1280,height=800');
      } catch (_) { /* ignore */ }
      // Always also open the Firefox start page in a new tab as a fallback
      setTimeout(() => {
        window.open('https://www.mozilla.org/firefox/', '_blank', 'noopener,noreferrer');
      }, 300);
      showNotification('Firefox Launcher', 'Opening Firefox… If it doesn\'t appear, check your system\'s default browser settings.');
    });

    el.querySelector('#ff-open-tab').addEventListener('click', () => {
      window.open('https://www.mozilla.org/firefox/', '_blank', 'noopener,noreferrer');
    });

    el.querySelector('#ff-tampermonkey').addEventListener('click', () => {
      window.open('https://addons.mozilla.org/firefox/addon/tampermonkey/', '_blank', 'noopener,noreferrer');
    });

    el.querySelector('#ff-scriptmgr').addEventListener('click', () => {
      WindowManager.close('firefox');
      NightOS.launchApp('scriptmanager');
    });
  }

  NightOS.registerApp('firefox', {
    title: 'Firefox',
    icon: '🦊',
    open,
  });
})();
