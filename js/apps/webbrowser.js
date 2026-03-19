/**
 * NightmareOS — Web Browser App
 * Provides an iframe-based browser with an internal homepage.
 * Note: Many external sites block iframe embedding (X-Frame-Options).
 * A clear "Open in New Tab" button is always shown for those cases.
 */

'use strict';

(function () {
  /* Sites that generally allow iframe embedding */
  const BOOKMARKS = [
    { label: '🔍 Search',      url: '_search',                        cat: 'search' },
    { label: '🌐 DuckDuckGo',  url: 'https://duckduckgo.com',         cat: 'search' },
    { label: '📖 Wikipedia',   url: 'https://en.m.wikipedia.org/wiki/Main_Page', cat: 'info' },
    { label: '🌦️ Weather',     url: 'https://wttr.in/?format=4',      cat: 'info' },
    { label: '📰 HN',          url: 'https://news.ycombinator.com',   cat: 'news' },
    { label: '🎮 Games',       url: 'https://playtictactoe.org',      cat: 'fun' },
    { label: '📝 Pastebin',    url: 'https://pastebin.com',           cat: 'tools' },
    { label: '🗺️ Maps',        url: 'https://www.openstreetmap.org',  cat: 'info' },
    { label: '💻 CodePen',     url: 'https://codepen.io',             cat: 'dev' },
    { label: '📦 NPM',         url: 'https://npmjs.com',              cat: 'dev' },
  ];

  function open() {
    const el = WindowManager.create({
      id: 'webbrowser',
      title: 'Browser',
      icon: '🌐',
      width: 900,
      height: 600,
      content: buildUI(),
    });
    initBrowser(el);
  }

  function buildUI() {
    const bookmarkBtns = BOOKMARKS.map(b =>
      `<button class="win-toolbar-btn browser-bookmark" data-url="${escHtml(b.url)}">${escHtml(b.label)}</button>`
    ).join('');

    return `
      <div class="browser-bar">
        <button class="browser-nav-btn" id="br-back"   title="Back"    aria-label="Back">‹</button>
        <button class="browser-nav-btn" id="br-forward" title="Forward" aria-label="Forward">›</button>
        <button class="browser-nav-btn" id="br-reload"  title="Reload"  aria-label="Reload">↻</button>
        <button class="browser-nav-btn" id="br-home"    title="Home"    aria-label="Home">🏠</button>
        <input class="browser-url" id="br-url" type="text"
               placeholder="Search or enter URL…" aria-label="Address bar" autocomplete="off" />
        <button class="browser-nav-btn browser-go-btn" id="br-go" title="Go" aria-label="Navigate">→</button>
        <button class="browser-nav-btn" id="br-newtab" title="Open in new tab" aria-label="New tab">↗</button>
      </div>
      <div class="browser-bookmarks-bar" style="flex-wrap:wrap;gap:4px;padding:4px 8px;display:flex;align-items:center;">
        <span class="browser-bookmarks-label" style="font-size:11px;color:#8892a4;margin-right:4px;white-space:nowrap;">★ Bookmarks:</span>
        ${bookmarkBtns}
      </div>
      <div id="br-content" style="flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative;">
        <!-- Homepage (shown when no URL is loaded) -->
        <div class="browser-home" id="br-home-page">
          <div class="browser-home-inner">
            <div class="browser-home-logo">🌐</div>
            <div class="browser-home-title">NightmareOS Browser</div>
            <div class="browser-home-search">
              <input type="text" id="br-home-search" class="browser-home-input"
                     placeholder="Search DuckDuckGo or enter URL…" autocomplete="off" />
              <button class="browser-home-btn" id="br-home-go">Search</button>
            </div>
            <div class="browser-quicklinks">
              <div class="browser-quicklink" data-url="https://en.m.wikipedia.org/wiki/Main_Page">
                <span>📖</span><span>Wikipedia</span>
              </div>
              <div class="browser-quicklink" data-url="https://news.ycombinator.com">
                <span>📰</span><span>Hacker News</span>
              </div>
              <div class="browser-quicklink" data-url="https://codepen.io">
                <span>💻</span><span>CodePen</span>
              </div>
              <div class="browser-quicklink" data-url="https://wttr.in/?format=4">
                <span>🌦️</span><span>Weather</span>
              </div>
              <div class="browser-quicklink" data-url="https://www.openstreetmap.org">
                <span>🗺️</span><span>Maps</span>
              </div>
              <div class="browser-quicklink" data-url="https://npmjs.com">
                <span>📦</span><span>NPM</span>
              </div>
            </div>
            <p class="browser-home-note">
              ⚠️ Some websites block iframe embedding.<br>
              Use <strong>↗</strong> to open them in a real browser tab.
            </p>
          </div>
        </div>
        <!-- Blocked message -->
        <div class="browser-blocked hidden" id="br-blocked">
          <span class="blocked-icon">🚫</span>
          <strong>This page can't be displayed here</strong>
          <p>This website blocks iframe embedding for security reasons.<br>
             You can still view it in a real browser tab.</p>
          <button class="browser-open-tab-btn" id="br-open-tab">Open in New Browser Tab ↗</button>
          <button class="win-toolbar-btn" id="br-try-again" style="margin-top:6px;">↻ Try Again</button>
        </div>
        <!-- Main iframe (created dynamically to bypass WindowManager sanitizer) -->
        <div id="br-frame-container" class="browser-frame-container hidden"></div>
        <!-- Loading overlay -->
        <div class="browser-loading hidden" id="br-loading">
          <div class="browser-spinner"></div>
          <span>Loading…</span>
        </div>
      </div>
      <div class="win-statusbar">
        <span id="br-status">Home</span>
        <span id="br-ssl" style="margin-left:auto;"></span>
      </div>`;
  }

  function initBrowser(el) {
    const urlInput       = el.querySelector('#br-url');
    const frameContainer = el.querySelector('#br-frame-container');
    const blocked        = el.querySelector('#br-blocked');
    const homeEl         = el.querySelector('#br-home-page');
    const loadingEl      = el.querySelector('#br-loading');
    const status         = el.querySelector('#br-status');
    const sslEl          = el.querySelector('#br-ssl');
    const openTab        = el.querySelector('#br-open-tab');
    const tryAgain       = el.querySelector('#br-try-again');

    // Create the iframe dynamically so it bypasses the WindowManager
    // HTML sanitizer (which strips <iframe> tags for security).
    const frame = document.createElement('iframe');
    frame.className = 'browser-frame';
    frame.id = 'br-frame';
    frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups allow-presentation');
    frame.setAttribute('title', 'Browser content');
    frame.setAttribute('aria-label', 'Browser content frame');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frameContainer.appendChild(frame);

    let currentUrl = '';
    const navHistory = [];
    let navIdx = -1;
    const FRAME_LOAD_TIMEOUT_MS = 5000;
    let loadTimer = null;

    /* ---- Normalize a URL or search query ---- */
    function normalizeUrl(raw) {
      const s = raw.trim();
      if (!s) return '';
      // DuckDuckGo search
      if (s === '_search') return 'https://duckduckgo.com';
      // Already a protocol
      if (/^https?:\/\//i.test(s)) return s;
      // Looks like a domain
      if (/^[\w-]+\.[a-z]{2,}(\/.*)?$/i.test(s)) return `https://${s}`;
      // Treat as search query
      return `https://duckduckgo.com/?q=${encodeURIComponent(s)}`;
    }

    /* ---- Show/hide views ---- */
    function showHome() {
      homeEl.classList.remove('hidden');
      frameContainer.classList.add('hidden');
      blocked.classList.add('hidden');
      loadingEl.classList.add('hidden');
      if (status) status.textContent = 'Home';
      if (sslEl) sslEl.textContent = '';
    }

    function showFrame() {
      homeEl.classList.add('hidden');
      blocked.classList.add('hidden');
      frameContainer.classList.remove('hidden');
      loadingEl.classList.remove('hidden');
    }

    function showBlocked(url) {
      homeEl.classList.add('hidden');
      frameContainer.classList.add('hidden');
      blocked.classList.remove('hidden');
      loadingEl.classList.add('hidden');
      if (openTab) openTab.dataset.url = url;
      if (status) status.textContent = 'Blocked by remote server';
      if (sslEl) sslEl.textContent = '🚫';
    }

    /* ---- Navigate ---- */
    function navigate(rawUrl, opts = {}) {
      const url = normalizeUrl(rawUrl);
      if (!url) { showHome(); return; }

      currentUrl = url;
      urlInput.value = url;

      if (opts.updateHistory !== false && navHistory[navIdx] !== url) {
        navHistory.splice(navIdx + 1);
        navHistory.push(url);
        navIdx = navHistory.length - 1;
      }

      // Update SSL indicator
      if (sslEl) sslEl.textContent = url.startsWith('https://') ? '🔒' : '🔓';
      if (status) status.textContent = `Loading…`;

      showFrame();

      // Set a timeout — if the iframe doesn't fire 'load' within 10s, show blocked
      if (loadTimer) clearTimeout(loadTimer);
      loadTimer = setTimeout(() => {
        try {
          // Cross-origin will throw — if it throws, it did load (just cross-origin)
          const doc = frame.contentDocument;
          if (!doc || doc.body === null || doc.body.innerHTML === '') {
            showBlocked(url);
          } else {
            loadingEl.classList.add('hidden');
            if (status) status.textContent = url;
          }
        } catch (_) {
          // Cross-origin exception = page loaded successfully but in a different origin
          loadingEl.classList.add('hidden');
          if (status) status.textContent = url;
        }
      }, FRAME_LOAD_TIMEOUT_MS);

      frame.src = url;

      // Update title
      const titleEl = el.querySelector('.window-title');
      if (titleEl) {
        try {
          titleEl.textContent = new URL(url).hostname;
        } catch (_) {
          titleEl.textContent = 'Browser';
        }
      }
    }

    function goBack() {
      if (navIdx > 0) { navIdx--; navigate(navHistory[navIdx], { updateHistory: false }); }
    }

    function goForward() {
      if (navIdx < navHistory.length - 1) { navIdx++; navigate(navHistory[navIdx], { updateHistory: false }); }
    }

    /* ---- Frame events ---- */
    frame.addEventListener('load', () => {
      if (loadTimer) clearTimeout(loadTimer);
      loadingEl.classList.add('hidden');
      // Try to detect blocked (about:blank loaded instead of real page)
      try {
        const doc = frame.contentDocument;
        if (doc && doc.location && doc.location.href === 'about:blank' && currentUrl !== 'about:blank') {
          showBlocked(currentUrl);
          return;
        }
      } catch (_) { /* cross-origin — page loaded fine */ }
      if (status) status.textContent = currentUrl || 'Ready';
    });

    frame.addEventListener('error', () => {
      if (loadTimer) clearTimeout(loadTimer);
      showBlocked(currentUrl);
    });

    /* ---- Controls ---- */
    el.querySelector('#br-back').addEventListener('click', goBack);
    el.querySelector('#br-forward').addEventListener('click', goForward);
    el.querySelector('#br-reload').addEventListener('click', () => {
      if (currentUrl) navigate(currentUrl, { updateHistory: false });
    });
    el.querySelector('#br-home').addEventListener('click', () => {
      currentUrl = '';
      urlInput.value = '';
      showHome();
    });
    el.querySelector('#br-go').addEventListener('click', () => navigate(urlInput.value));
    el.querySelector('#br-newtab').addEventListener('click', () => {
      const u = currentUrl || urlInput.value.trim();
      if (u) window.open(normalizeUrl(u), '_blank', 'noopener,noreferrer');
    });

    urlInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') navigate(urlInput.value);
    });

    // Bookmarks
    el.querySelectorAll('.browser-bookmark').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.url));
    });

    // Open in new tab button (blocked page)
    if (openTab) {
      openTab.addEventListener('click', () => {
        const u = openTab.dataset.url || currentUrl;
        if (u) window.open(u, '_blank', 'noopener,noreferrer');
      });
    }

    if (tryAgain) {
      tryAgain.addEventListener('click', () => {
        if (currentUrl) navigate(currentUrl, { updateHistory: false });
      });
    }

    // Homepage search
    const homeSearch = el.querySelector('#br-home-search');
    const homeGo     = el.querySelector('#br-home-go');
    if (homeSearch) {
      homeSearch.addEventListener('keydown', e => {
        if (e.key === 'Enter') navigate(homeSearch.value);
      });
    }
    if (homeGo) {
      homeGo.addEventListener('click', () => navigate(homeSearch ? homeSearch.value : ''));
    }

    // Quick links on homepage
    el.querySelectorAll('.browser-quicklink').forEach(ql => {
      ql.addEventListener('click', () => navigate(ql.dataset.url));
    });

    // Start at homepage
    showHome();
  }

  NightOS.registerApp('webbrowser', {
    title: 'Browser',
    icon: '🌐',
    open,
  });
})();
