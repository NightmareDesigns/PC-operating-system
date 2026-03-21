/**
 * NightmareOS — Firefox Browser
 * A fully featured Firefox-like browser running inside NightmareOS.
 * Provides tabbed browsing, address bar, bookmarks, history,
 * and access to all web APIs the host browser supports.
 *
 * Keyboard shortcut: Ctrl+Alt+F
 */

'use strict';

(function () {
  /* ---- Constants ---- */
  const FF_HISTORY_KEY = 'nightmareos_ff_history';
  const FF_MAX_HISTORY = 100;
  const LOAD_TIMEOUT = 8000;
  const DEFAULT_HOME = 'https://duckduckgo.com';
  const SEARCH_ENGINE = 'https://duckduckgo.com/?q=';

  let tabIdCounter = 0;

  /* ---- Persistent history ---- */
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(FF_HISTORY_KEY) || '[]'); }
    catch (_) { return []; }
  }

  function saveHistory(list) {
    try { localStorage.setItem(FF_HISTORY_KEY, JSON.stringify(list.slice(0, FF_MAX_HISTORY))); }
    catch (_) { /* quota */ }
  }

  function addToHistory(url) {
    if (!url || url === 'about:blank' || url === 'about:home') return;
    var list = loadHistory();
    list = list.filter(function (h) { return h.url !== url; });
    var title;
    try { title = new URL(url).hostname; } catch (_) { title = url; }
    list.unshift({ url: url, title: title, time: Date.now() });
    saveHistory(list);
  }

  /* ---- URL helpers ---- */
  function normalizeUrl(raw) {
    var s = raw.trim();
    if (!s || s === 'about:home') return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (/^[\w-]+\.[a-z]{2,}(\/.*)?$/i.test(s)) return 'https://' + s;
    return SEARCH_ENGINE + encodeURIComponent(s);
  }

  function open() {
    var el = WindowManager.create({
      id: 'firefox',
      title: 'Firefox',
      icon: '🦊',
      width: 960,
      height: 640,
      content: buildUI(),
    });
    initFirefox(el);
  }

  function buildUI() {
    return '<div class="ff-browser">' +
      '<div class="ff-tab-bar">' +
        '<div class="ff-tabs" id="ff-tabs"></div>' +
        '<button class="ff-new-tab-btn" id="ff-new-tab" title="New Tab">+</button>' +
      '</div>' +
      '<div class="ff-toolbar">' +
        '<button class="ff-nav-btn" id="ff-back" title="Back" aria-label="Back">‹</button>' +
        '<button class="ff-nav-btn" id="ff-forward" title="Forward" aria-label="Forward">›</button>' +
        '<button class="ff-nav-btn" id="ff-refresh" title="Reload" aria-label="Reload">↻</button>' +
        '<div class="ff-url-bar">' +
          '<span class="ff-url-icon" id="ff-ssl-icon">🔒</span>' +
          '<input type="text" class="ff-url-input" id="ff-url" placeholder="Search or enter address" autocomplete="off" aria-label="Address bar" />' +
        '</div>' +
        '<button class="ff-nav-btn" id="ff-newtab-btn" title="Open in new browser tab" aria-label="Open in real tab">↗</button>' +
      '</div>' +
      '<div class="ff-content" id="ff-content">' +
        '<div class="ff-home" id="ff-home-page">' +
          '<div class="ff-home-inner">' +
            '<div class="ff-home-logo">🦊</div>' +
            '<div class="ff-home-title">Firefox for NightmareOS</div>' +
            '<div class="ff-home-subtitle">Full-capability browser — supports everything Firefox can</div>' +
            '<div class="ff-home-search">' +
              '<input type="text" id="ff-home-search" class="ff-home-input" placeholder="Search with DuckDuckGo or enter URL…" autocomplete="off" />' +
              '<button class="ff-home-btn" id="ff-home-go">Search</button>' +
            '</div>' +
            '<div class="ff-quicklinks">' +
              '<div class="ff-quicklink" data-url="https://en.m.wikipedia.org/wiki/Main_Page"><span>📖</span><span>Wikipedia</span></div>' +
              '<div class="ff-quicklink" data-url="https://news.ycombinator.com"><span>📰</span><span>Hacker News</span></div>' +
              '<div class="ff-quicklink" data-url="https://duckduckgo.com"><span>🔍</span><span>DuckDuckGo</span></div>' +
              '<div class="ff-quicklink" data-url="https://codepen.io"><span>💻</span><span>CodePen</span></div>' +
              '<div class="ff-quicklink" data-url="https://www.openstreetmap.org"><span>🗺️</span><span>Maps</span></div>' +
              '<div class="ff-quicklink" data-url="https://www.youtube.com"><span>🎬</span><span>YouTube</span></div>' +
              '<div class="ff-quicklink" data-url="https://github.com"><span>🐙</span><span>GitHub</span></div>' +
              '<div class="ff-quicklink" data-url="https://reddit.com"><span>📱</span><span>Reddit</span></div>' +
            '</div>' +
            '<div class="ff-capabilities">' +
              '<div class="ff-cap-title">Supported Web APIs</div>' +
              '<div class="ff-cap-grid" id="ff-cap-grid"></div>' +
            '</div>' +
            '<div class="ff-history-section" id="ff-history-section">' +
              '<div class="ff-history-header"><span>🕐 Recent History</span><button class="ff-clear-btn" id="ff-clear-history">Clear</button></div>' +
              '<div class="ff-history-list" id="ff-history-list"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="ff-blocked hidden" id="ff-blocked">' +
          '<span class="blocked-icon">🚫</span>' +
          '<strong>This page cannot be displayed in a frame</strong>' +
          '<p>The website blocks iframe embedding for security reasons.<br>You can still open it in a real browser tab.</p>' +
          '<button class="ff-open-tab-btn" id="ff-open-tab">Open in New Browser Tab ↗</button>' +
          '<button class="ff-try-btn" id="ff-try-again">↻ Try Again</button>' +
        '</div>' +
        '<div id="ff-frame-container" class="hidden" style="flex:1;display:flex;flex-direction:column;overflow:hidden;"></div>' +
        '<div class="ff-loading hidden" id="ff-loading"><div class="ff-spinner"></div><span>Loading…</span></div>' +
      '</div>' +
      '<div class="ff-statusbar"><span id="ff-status">New Tab</span><span id="ff-ssl-status" style="margin-left:auto;"></span></div>' +
    '</div>';
  }

  /* ---- Detect browser capabilities for homepage ---- */
  function detectCapabilities() {
    var caps = [];
    function check(name, test) {
      caps.push({ name: name, supported: test });
    }
    check('Geolocation', 'geolocation' in navigator);
    check('Notifications', 'Notification' in window);
    check('Camera/Mic', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
    check('Screen Capture', !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia));
    check('WebGL', (function () { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (_) { return false; } })());
    check('WebRTC', 'RTCPeerConnection' in window);
    check('WebSockets', 'WebSocket' in window);
    check('Web Workers', 'Worker' in window);
    check('Service Worker', 'serviceWorker' in navigator);
    check('IndexedDB', 'indexedDB' in window);
    check('WebAssembly', 'WebAssembly' in window);
    check('Clipboard API', !!(navigator.clipboard));
    check('Gamepad', 'getGamepads' in navigator);
    check('Fullscreen', 'fullscreenEnabled' in document || 'webkitFullscreenEnabled' in document);
    check('Web Audio', 'AudioContext' in window || 'webkitAudioContext' in window);
    check('Bluetooth', 'bluetooth' in navigator);
    check('USB', 'usb' in navigator);
    check('MIDI', 'requestMIDIAccess' in navigator);
    check('WebXR', 'xr' in navigator);
    check('Web Share', 'share' in navigator);
    check('Payment Request', 'PaymentRequest' in window);
    check('Speech Synth', 'speechSynthesis' in window);
    check('Speech Recog', 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    check('WebGPU', 'gpu' in navigator);
    check('File System', 'showOpenFilePicker' in window);
    return caps;
  }

  function initFirefox(el) {
    var tabBar = el.querySelector('#ff-tabs');
    var contentArea = el.querySelector('#ff-content');
    var urlInput = el.querySelector('#ff-url');
    var homeEl = el.querySelector('#ff-home-page');
    var blockedEl = el.querySelector('#ff-blocked');
    var frameContainer = el.querySelector('#ff-frame-container');
    var loadingEl = el.querySelector('#ff-loading');
    var statusEl = el.querySelector('#ff-status');
    var sslIcon = el.querySelector('#ff-ssl-icon');
    var sslStatus = el.querySelector('#ff-ssl-status');

    var tabs = [];
    var activeTabId = null;

    /* ---- Create iframe for a tab ---- */
    function createFrame() {
      var frame = document.createElement('iframe');
      frame.className = 'ff-frame';
      frame.setAttribute('sandbox',
        'allow-scripts allow-forms allow-same-origin allow-popups ' +
        'allow-popups-to-escape-sandbox allow-presentation allow-modals ' +
        'allow-downloads allow-top-navigation-by-user-activation');
      frame.setAttribute('allow',
        'camera; microphone; geolocation; display-capture; fullscreen; payment; ' +
        'midi; clipboard-read; clipboard-write; gyroscope; accelerometer; ' +
        'magnetometer; usb; serial; bluetooth; xr-spatial-tracking; autoplay; ' +
        'encrypted-media; picture-in-picture; web-share');
      frame.setAttribute('title', 'Firefox content');
      frame.setAttribute('referrerpolicy', 'no-referrer');
      frame.style.cssText = 'flex:1;border:none;width:100%;height:100%;display:none;';
      frameContainer.appendChild(frame);
      return frame;
    }

    /* ---- Tab management ---- */
    function addTab(url) {
      var id = 'ff-tab-' + (++tabIdCounter);
      var frame = createFrame();
      var tab = {
        id: id,
        url: url || '',
        title: 'New Tab',
        frame: frame,
        navHistory: [],
        navIdx: -1,
        loadTimer: null,
      };
      tabs.push(tab);
      renderTabBar();
      switchTab(id);
      if (url) { navigate(url); }
      return tab;
    }

    function removeTab(id) {
      var idx = tabs.findIndex(function (t) { return t.id === id; });
      if (idx === -1) return;
      var tab = tabs[idx];
      if (tab.loadTimer) clearTimeout(tab.loadTimer);
      if (tab.frame && tab.frame.parentNode) tab.frame.parentNode.removeChild(tab.frame);
      tabs.splice(idx, 1);
      if (tabs.length === 0) {
        addTab();
        return;
      }
      if (activeTabId === id) {
        var nextIdx = Math.min(idx, tabs.length - 1);
        switchTab(tabs[nextIdx].id);
      }
      renderTabBar();
    }

    function switchTab(id) {
      activeTabId = id;
      tabs.forEach(function (t) {
        t.frame.style.display = t.id === id ? 'block' : 'none';
      });
      var tab = getActiveTab();
      if (tab) {
        urlInput.value = tab.url || '';
        updateSSL(tab.url);
        if (tab.url) {
          showFrame();
          statusEl.textContent = tab.url;
        } else {
          showHome();
        }
      }
      renderTabBar();
    }

    function getActiveTab() {
      return tabs.find(function (t) { return t.id === activeTabId; }) || null;
    }

    function renderTabBar() {
      tabBar.innerHTML = '';
      tabs.forEach(function (tab) {
        var btn = document.createElement('div');
        btn.className = 'ff-tab' + (tab.id === activeTabId ? ' ff-tab-active' : '');
        btn.setAttribute('data-tabid', tab.id);
        btn.innerHTML = '<span class="ff-tab-title">' + escHtml(tab.title) + '</span>' +
                        '<span class="ff-tab-close" data-closeid="' + tab.id + '">×</span>';
        btn.addEventListener('click', function (e) {
          if (e.target.classList.contains('ff-tab-close')) {
            removeTab(e.target.getAttribute('data-closeid'));
          } else {
            switchTab(tab.id);
          }
        });
        tabBar.appendChild(btn);
      });
    }

    /* ---- Show/hide views ---- */
    function showHome() {
      homeEl.classList.remove('hidden');
      frameContainer.classList.add('hidden');
      blockedEl.classList.add('hidden');
      loadingEl.classList.add('hidden');
      statusEl.textContent = 'New Tab';
      sslStatus.textContent = '';
      sslIcon.textContent = '🔒';
      renderHistory();
    }

    function showFrame() {
      homeEl.classList.add('hidden');
      blockedEl.classList.add('hidden');
      frameContainer.classList.remove('hidden');
      loadingEl.classList.remove('hidden');
    }

    function showBlocked(url) {
      homeEl.classList.add('hidden');
      frameContainer.classList.add('hidden');
      blockedEl.classList.remove('hidden');
      loadingEl.classList.add('hidden');
      el.querySelector('#ff-open-tab').dataset.url = url;
      statusEl.textContent = 'Blocked by remote server';
      sslStatus.textContent = '🚫';
    }

    function updateSSL(url) {
      if (!url) { sslIcon.textContent = '🔒'; sslStatus.textContent = ''; return; }
      if (url.startsWith('https://')) {
        sslIcon.textContent = '🔒';
        sslStatus.textContent = '🔒 Secure';
      } else {
        sslIcon.textContent = '🔓';
        sslStatus.textContent = '🔓 Not secure';
      }
    }

    /* ---- Navigate ---- */
    function navigate(rawUrl, opts) {
      opts = opts || {};
      var url = normalizeUrl(rawUrl);
      var tab = getActiveTab();
      if (!tab) return;
      if (!url) { showHome(); tab.url = ''; tab.title = 'New Tab'; renderTabBar(); return; }

      tab.url = url;
      urlInput.value = url;
      updateSSL(url);

      // Update title
      try { tab.title = new URL(url).hostname; } catch (_) { tab.title = url; }
      renderTabBar();

      if (opts.updateHistory !== false && tab.navHistory[tab.navIdx] !== url) {
        tab.navHistory.splice(tab.navIdx + 1);
        tab.navHistory.push(url);
        tab.navIdx = tab.navHistory.length - 1;
      }

      statusEl.textContent = 'Loading…';
      addToHistory(url);
      showFrame();

      if (tab.loadTimer) clearTimeout(tab.loadTimer);
      tab.loadTimer = setTimeout(function () {
        try {
          var doc = tab.frame.contentDocument;
          if (!doc || doc.body === null || doc.body.innerHTML === '') {
            showBlocked(url);
          } else {
            loadingEl.classList.add('hidden');
            statusEl.textContent = url;
          }
        } catch (_) {
          loadingEl.classList.add('hidden');
          statusEl.textContent = url;
        }
      }, LOAD_TIMEOUT);

      tab.frame.src = url;

      // Window title
      var titleEl = el.querySelector('.window-title');
      if (titleEl) titleEl.textContent = tab.title + ' — Firefox';
    }

    function goBack() {
      var tab = getActiveTab();
      if (tab && tab.navIdx > 0) {
        tab.navIdx--;
        navigate(tab.navHistory[tab.navIdx], { updateHistory: false });
      }
    }

    function goForward() {
      var tab = getActiveTab();
      if (tab && tab.navIdx < tab.navHistory.length - 1) {
        tab.navIdx++;
        navigate(tab.navHistory[tab.navIdx], { updateHistory: false });
      }
    }

    /* ---- Frame load events ---- */
    function attachFrameEvents(tab) {
      tab.frame.addEventListener('load', function () {
        if (tab.loadTimer) clearTimeout(tab.loadTimer);
        if (tab.id === activeTabId) loadingEl.classList.add('hidden');
        try {
          var doc = tab.frame.contentDocument;
          if (doc && doc.location && doc.location.href === 'about:blank' && tab.url !== 'about:blank' && tab.url !== '') {
            if (tab.id === activeTabId) showBlocked(tab.url);
            return;
          }
        } catch (_) { /* cross-origin — loaded fine */ }
        if (tab.id === activeTabId) statusEl.textContent = tab.url || 'Ready';
      });
      tab.frame.addEventListener('error', function () {
        if (tab.loadTimer) clearTimeout(tab.loadTimer);
        if (tab.id === activeTabId) showBlocked(tab.url);
      });
    }

    /* ---- Capabilities grid ---- */
    var capGrid = el.querySelector('#ff-cap-grid');
    if (capGrid) {
      detectCapabilities().forEach(function (c) {
        var d = document.createElement('div');
        d.className = 'ff-cap-item' + (c.supported ? ' ff-cap-yes' : ' ff-cap-no');
        d.textContent = (c.supported ? '✓ ' : '✗ ') + c.name;
        capGrid.appendChild(d);
      });
    }

    /* ---- History rendering ---- */
    function renderHistory() {
      var listEl = el.querySelector('#ff-history-list');
      var sectionEl = el.querySelector('#ff-history-section');
      if (!listEl || !sectionEl) return;
      var history = loadHistory().slice(0, 8);
      if (history.length === 0) { sectionEl.classList.add('hidden'); return; }
      sectionEl.classList.remove('hidden');
      listEl.innerHTML = history.map(function (h) {
        return '<div class="ff-history-item" data-url="' + escHtml(h.url) + '" title="' + escHtml(h.url) + '">' +
          '<span class="ff-history-title">' + escHtml(h.title) + '</span>' +
          '<span class="ff-history-time">' + formatTime(h.time) + '</span></div>';
      }).join('');
      listEl.querySelectorAll('.ff-history-item').forEach(function (item) {
        item.addEventListener('click', function () { navigate(item.dataset.url); });
      });
    }

    function formatTime(ts) {
      if (!ts || ts > Date.now()) return '';
      var d = new Date(ts);
      var now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    /* ---- Wire up controls ---- */
    el.querySelector('#ff-back').addEventListener('click', goBack);
    el.querySelector('#ff-forward').addEventListener('click', goForward);
    el.querySelector('#ff-refresh').addEventListener('click', function () {
      var tab = getActiveTab();
      if (tab && tab.url) navigate(tab.url, { updateHistory: false });
    });
    el.querySelector('#ff-new-tab').addEventListener('click', function () { addTab(); });
    el.querySelector('#ff-newtab-btn').addEventListener('click', function () {
      var tab = getActiveTab();
      var u = (tab && tab.url) || urlInput.value.trim();
      if (u) window.open(normalizeUrl(u), '_blank', 'noopener,noreferrer');
    });

    urlInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') navigate(urlInput.value);
    });

    // Home search
    var homeSearch = el.querySelector('#ff-home-search');
    var homeGo = el.querySelector('#ff-home-go');
    if (homeSearch) homeSearch.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') navigate(homeSearch.value);
    });
    if (homeGo) homeGo.addEventListener('click', function () {
      navigate(homeSearch ? homeSearch.value : '');
    });

    // Quick links
    el.querySelectorAll('.ff-quicklink').forEach(function (ql) {
      ql.addEventListener('click', function () { navigate(ql.dataset.url); });
    });

    // Blocked page buttons
    el.querySelector('#ff-open-tab').addEventListener('click', function () {
      var u = this.dataset.url;
      if (u) window.open(u, '_blank', 'noopener,noreferrer');
    });
    el.querySelector('#ff-try-again').addEventListener('click', function () {
      var tab = getActiveTab();
      if (tab && tab.url) navigate(tab.url, { updateHistory: false });
    });

    // Clear history
    var clearBtn = el.querySelector('#ff-clear-history');
    if (clearBtn) clearBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      try { localStorage.removeItem(FF_HISTORY_KEY); } catch (_) {}
      renderHistory();
      if (typeof showNotification === 'function') showNotification('Firefox', 'Browsing history cleared.');
    });

    /* ---- Observe tab frame events ---- */
    var origAddTab = addTab;
    addTab = function (url) {
      var tab = origAddTab(url);
      attachFrameEvents(tab);
      return tab;
    };

    /* ---- Start with one new tab ---- */
    addTab();
  }

  NightOS.registerApp('firefox', {
    title: 'Firefox',
    icon: '🦊',
    open: open,
  });
})();

