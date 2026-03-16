/**
 * NightOS — Web Browser App
 * Provides a simple iframe-based browser.
 * Note: Many external sites block iframe embedding (X-Frame-Options).
 * We show a friendly message in that case.
 */

'use strict';

(function () {
  /* Safe sites that generally allow iframe embedding */
  const BOOKMARKS = [
    { label: '🔍 DuckDuckGo', url: 'https://duckduckgo.com' },
    { label: '📖 Wikipedia',  url: 'https://en.m.wikipedia.org/wiki/Main_Page' },
    { label: '🌦️ Weather',    url: 'https://wttr.in/?format=4' },
    { label: '📰 Hacker News',url: 'https://news.ycombinator.com' },
    { label: '🎮 Tic Tac Toe',url: 'https://playtictactoe.org' },
  ];

  function open() {
    const el = WindowManager.create({
      id: 'webbrowser',
      title: 'Browser',
      icon: '🌐',
      width: 860,
      height: 560,
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
        <button class="browser-nav-btn" id="br-back" title="Back" aria-label="Back">‹</button>
        <button class="browser-nav-btn" id="br-forward" title="Forward" aria-label="Forward">›</button>
        <button class="browser-nav-btn" id="br-reload" title="Reload" aria-label="Reload">↻</button>
        <input class="browser-url" id="br-url" type="url" value="https://duckduckgo.com"
               placeholder="Enter URL…" aria-label="Address bar" />
        <button class="browser-nav-btn" id="br-go" title="Go" aria-label="Navigate">→</button>
      </div>
      <div class="win-toolbar" style="flex-wrap:wrap;gap:4px;">
        ${bookmarkBtns}
      </div>
      <div id="br-content" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
        <div class="browser-blocked hidden" id="br-blocked">
          <span class="blocked-icon">🚫</span>
          <strong>Cannot display this page</strong>
          <p>This website doesn't allow embedding in an iframe.<br>
             Try the bookmarks above for supported sites, or open the URL in a new tab.</p>
          <button class="win-toolbar-btn" id="br-open-tab" style="margin-top:8px;">Open in New Tab ↗</button>
        </div>
        <iframe class="browser-frame hidden" id="br-frame"
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                title="Browser content"
                aria-label="Browser content frame"></iframe>
      </div>
      <div class="win-statusbar">
        <span id="br-status">Ready</span>
      </div>`;
  }

  function initBrowser(el) {
    const urlInput = el.querySelector('#br-url');
    const frame    = el.querySelector('#br-frame');
    const blocked  = el.querySelector('#br-blocked');
    const status   = el.querySelector('#br-status');
    const openTab  = el.querySelector('#br-open-tab');

    let currentUrl = '';
    const navHistory = [];
    let navIdx = -1;

    function navigate(rawUrl) {
      let url = rawUrl.trim();
      if (!url) return;

      // Add protocol if missing
      if (!/^https?:\/\//i.test(url)) {
        if (url.includes('.') && !url.includes(' ')) {
          url = `https://${url}`;
        } else {
          // Treat as DuckDuckGo search
          url = `https://duckduckgo.com/?q=${encodeURIComponent(url)}`;
        }
      }

      currentUrl = url;
      if (urlInput) urlInput.value = url;

      // Update history
      if (navHistory[navIdx] !== url) {
        navHistory.splice(navIdx + 1);
        navHistory.push(url);
        navIdx = navHistory.length - 1;
      }

      if (status) status.textContent = `Loading ${url}…`;

      // Show iframe, hide blocked message
      frame.classList.remove('hidden');
      blocked.classList.add('hidden');
      frame.src = url;

      if (openTab) openTab.dataset.url = url;

      // Update window title
      const titleEl = el.querySelector('.window-title');
      if (titleEl) {
        try {
          const host = new URL(url).hostname;
          titleEl.textContent = host;
        } catch (_) {
          titleEl.textContent = 'Browser';
        }
      }
    }

    function goBack() {
      if (navIdx > 0) {
        navIdx--;
        navigate(navHistory[navIdx]);
      }
    }

    function goForward() {
      if (navIdx < navHistory.length - 1) {
        navIdx++;
        navigate(navHistory[navIdx]);
      }
    }

    frame.addEventListener('load', () => {
      if (status) status.textContent = currentUrl || 'Ready';
    });

    frame.addEventListener('error', () => {
      frame.classList.add('hidden');
      blocked.classList.remove('hidden');
      if (status) status.textContent = 'Failed to load page';
    });

    el.querySelector('#br-back').addEventListener('click', goBack);
    el.querySelector('#br-forward').addEventListener('click', goForward);
    el.querySelector('#br-reload').addEventListener('click', () => {
      if (currentUrl) navigate(currentUrl);
    });
    el.querySelector('#br-go').addEventListener('click', () => navigate(urlInput.value));

    urlInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') navigate(urlInput.value);
    });

    el.querySelectorAll('.browser-bookmark').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.url));
    });

    if (openTab) {
      openTab.addEventListener('click', () => {
        if (currentUrl) window.open(currentUrl, '_blank', 'noopener,noreferrer');
      });
    }

    // Load default page
    navigate('https://duckduckgo.com');
  }

  NightOS.registerApp('webbrowser', {
    title: 'Browser',
    icon: '🌐',
    open,
  });
})();
