/**
 * NightmareOS — App Store
 * Browse and launch web-based apps, plus information about
 * running Windows/desktop software in a web environment.
 */

'use strict';

(function () {
  const APPS = [
    /* Productivity */
    { cat: 'Productivity', name: 'Google Docs',    icon: '📄', url: 'https://docs.google.com',       desc: 'Word processing online' },
    { cat: 'Productivity', name: 'Google Sheets',  icon: '📊', url: 'https://sheets.google.com',     desc: 'Spreadsheets online' },
    { cat: 'Productivity', name: 'Google Slides',  icon: '📽️', url: 'https://slides.google.com',     desc: 'Presentations online' },
    { cat: 'Productivity', name: 'Notion',          icon: '📝', url: 'https://notion.so',             desc: 'Notes and wikis' },
    { cat: 'Productivity', name: 'Trello',          icon: '📋', url: 'https://trello.com',            desc: 'Task management boards' },
    { cat: 'Productivity', name: 'Excalidraw',      icon: '✏️', url: 'https://excalidraw.com',        desc: 'Collaborative whiteboard' },
    /* Dev Tools */
    { cat: 'Developer',    name: 'CodePen',         icon: '🖊️', url: 'https://codepen.io',            desc: 'Front-end code playground' },
    { cat: 'Developer',    name: 'GitHub',           icon: '🐙', url: 'https://github.com',            desc: 'Code hosting & versioning' },
    { cat: 'Developer',    name: 'StackBlitz',       icon: '⚡', url: 'https://stackblitz.com',        desc: 'Online IDE for web apps' },
    { cat: 'Developer',    name: 'RegExr',           icon: '🔍', url: 'https://regexr.com',            desc: 'RegEx testing tool' },
    { cat: 'Developer',    name: 'JSON Formatter',   icon: '{ }', url: 'https://jsonformatter.org',   desc: 'Format and validate JSON' },
    /* Media */
    { cat: 'Media',        name: 'YouTube',          icon: '▶️', url: 'https://youtube.com',           desc: 'Watch videos' },
    { cat: 'Media',        name: 'SoundCloud',       icon: '🎵', url: 'https://soundcloud.com',        desc: 'Stream music' },
    { cat: 'Media',        name: 'Spotify Web',      icon: '🎧', url: 'https://open.spotify.com',      desc: 'Music streaming' },
    /* Games */
    { cat: 'Games',        name: 'Tic Tac Toe',      icon: '⭕', url: 'https://playtictactoe.org',     desc: 'Classic game' },
    { cat: 'Games',        name: 'Chess.com',        icon: '♟️', url: 'https://www.chess.com/play/computer', desc: 'Play chess' },
    { cat: 'Games',        name: 'Skribbl.io',       icon: '🎨', url: 'https://skribbl.io',            desc: 'Draw and guess game' },
    /* Utilities */
    { cat: 'Utilities',    name: 'Wikipedia',        icon: '📖', url: 'https://en.m.wikipedia.org/wiki/Main_Page', desc: 'Encyclopedia' },
    { cat: 'Utilities',    name: 'Weather',          icon: '🌦️', url: 'https://wttr.in/?format=4',    desc: 'Weather information' },
    { cat: 'Utilities',    name: 'WolframAlpha',     icon: '🧮', url: 'https://www.wolframalpha.com',  desc: 'Computational knowledge' },
    { cat: 'Utilities',    name: 'OpenStreetMap',    icon: '🗺️', url: 'https://www.openstreetmap.org', desc: 'Open-source maps' },
    { cat: 'Utilities',    name: 'Pastebin',         icon: '📋', url: 'https://pastebin.com',          desc: 'Paste and share text' },
  ];

  const CATEGORIES = ['All', ...new Set(APPS.map(a => a.cat))];

  function open() {
    const el = WindowManager.create({
      id: 'appstore',
      title: 'App Store',
      icon: '🏪',
      width: 780,
      height: 540,
      content: buildUI(),
    });
    initStore(el);
  }

  function buildUI() {
    const catBtns = CATEGORIES.map((c, i) =>
      `<button class="appstore-cat-btn${i === 0 ? ' active' : ''}" data-cat="${escHtml(c)}">${escHtml(c)}</button>`
    ).join('');

    const appCards = APPS.map(a => `
      <div class="appstore-card" data-cat="${escHtml(a.cat)}" data-name="${escHtml(a.name.toLowerCase())}">
        <div class="appstore-card-icon">${a.icon}</div>
        <div class="appstore-card-info">
          <div class="appstore-card-name">${escHtml(a.name)}</div>
          <div class="appstore-card-cat">${escHtml(a.cat)}</div>
          <div class="appstore-card-desc">${escHtml(a.desc)}</div>
        </div>
        <div class="appstore-card-actions">
          <button class="appstore-open-btn" data-url="${escHtml(a.url)}">Open ↗</button>
          <button class="appstore-browser-btn" data-url="${escHtml(a.url)}">In Browser</button>
        </div>
      </div>`).join('');

    return `
      <div class="appstore-layout">
        <div class="appstore-header">
          <input type="search" id="appstore-search" class="start-search"
                 placeholder="Search apps…" aria-label="Search apps" style="width:220px;" />
          <div class="appstore-cats">${catBtns}</div>
        </div>
        <div class="appstore-grid" id="appstore-grid">${appCards}</div>
        <div class="appstore-win-info" id="appstore-win-panel">
          <div class="appstore-win-header">
            <span class="appstore-win-icon">🖥️</span>
            <span>Windows Software Compatibility</span>
          </div>
          <div class="appstore-win-body">
            <p>NightmareOS runs entirely in your web browser. It <strong>cannot natively execute</strong>
               Windows <code>.exe</code> or <code>.msi</code> files.</p>
            <p>To run Windows software you can use one of these approaches:</p>
            <div class="appstore-win-options">
              <div class="appstore-win-opt">
                <span>🍷</span>
                <div>
                  <strong>Wine / Proton</strong><br>
                  <small>On Linux/macOS, Wine lets you run Windows apps natively.
                  Proton is used by Steam for gaming.</small>
                </div>
                <button class="appstore-open-btn" data-url="https://www.winehq.org">Info ↗</button>
              </div>
              <div class="appstore-win-opt">
                <span>☁️</span>
                <div>
                  <strong>Shadow / GeForce NOW</strong><br>
                  <small>Cloud gaming and cloud PCs let you run Windows apps
                  streamed to your browser.</small>
                </div>
                <button class="appstore-open-btn" data-url="https://shadow.tech">Info ↗</button>
              </div>
              <div class="appstore-win-opt">
                <span>📦</span>
                <div>
                  <strong>Rollapp</strong><br>
                  <small>Run Windows and Linux apps in the browser via Rollapp's
                  cloud streaming service.</small>
                </div>
                <button class="appstore-open-btn" data-url="https://www.rollapp.com">Open ↗</button>
              </div>
              <div class="appstore-win-opt">
                <span>🖥️</span>
                <div>
                  <strong>Virtual Machine</strong><br>
                  <small>Run a full Windows VM in VirtualBox or Hyper-V on your
                  local machine for complete compatibility.</small>
                </div>
                <button class="appstore-open-btn" data-url="https://www.virtualbox.org">Info ↗</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function initStore(el) {
    const grid    = el.querySelector('#appstore-grid');
    const search  = el.querySelector('#appstore-search');
    let activecat = 'All';

    function filter() {
      const q = search.value.trim().toLowerCase();
      el.querySelectorAll('.appstore-card').forEach(card => {
        const matchCat  = activecat === 'All' || card.dataset.cat === activecat;
        const matchName = !q || card.dataset.name.includes(q);
        card.style.display = (matchCat && matchName) ? '' : 'none';
      });
    }

    el.querySelectorAll('.appstore-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.appstore-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activecat = btn.dataset.cat;
        filter();
      });
    });

    search.addEventListener('input', filter);

    // Open in new tab
    el.querySelectorAll('.appstore-open-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        window.open(btn.dataset.url, '_blank', 'noopener,noreferrer');
      });
    });

    // Open in built-in browser
    el.querySelectorAll('.appstore-browser-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // Close this window and open in browser
        const url = btn.dataset.url;
        NightOS.launchApp('webbrowser');
        // Pass URL after a short delay so the browser window finishes initializing
        setTimeout(() => {
          // Find the browser's URL input and navigate
          const brWin = document.getElementById('win-webbrowser');
          if (brWin) {
            const inp = brWin.querySelector('#br-url');
            const goBtn = brWin.querySelector('#br-go');
            if (inp) { inp.value = url; }
            if (goBtn) goBtn.click();
          }
        }, 200);
      });
    });
  }

  NightOS.registerApp('appstore', {
    title: 'App Store',
    icon: '🏪',
    open,
  });
})();
