/**
 * NightOS — Window Manager
 * Handles creating, focusing, dragging, resizing, minimizing,
 * maximizing, and closing application windows.
 */

'use strict';

const WindowManager = (() => {
  let zCounter = 100;
  /** @type {Map<string, HTMLElement>} */
  const windows = new Map();

  /**
   * Safely convert an HTML string into a sanitized DocumentFragment.
   * Removes script-like elements, inline event handlers, and javascript: URLs.
   * This allows rich markup while significantly reducing XSS risk.
   *
   * @param {string} html
   * @returns {DocumentFragment}
   */
  function createSafeFragmentFromHTML(html) {
    const range = document.createRange();
    range.selectNodeContents(document.body || document.documentElement);
    const fragment = range.createContextualFragment(html);

    /** @type {Node[]} */
    const nodesToRemove = [];

    const walker = document.createTreeWalker(
      fragment,
      NodeFilter.SHOW_ELEMENT,
      null,
      false
    );

    // Remove dangerous elements and attributes.
    // This is a conservative sanitizer intended for app-internal HTML.
    while (walker.nextNode()) {
      const el = /** @type {HTMLElement} */ (walker.currentNode);
      const tag = el.tagName.toLowerCase();

      // Strip entirely dangerous elements.
      if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object' || tag === 'embed') {
        nodesToRemove.push(el);
        continue;
      }

      // Remove inline event handlers and javascript: URLs.
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        const value = attr.value;

        // Inline event handlers (onclick, onload, etc.)
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
          continue;
        }

        // Remove dangerous URL schemes from common URL-bearing attributes.
        if (
          (name === 'href' || name === 'src' || name === 'xlink:href') &&
          typeof value === 'string'
        ) {
          const scheme = value.trim().toLowerCase();
          if (
            scheme.startsWith('javascript:') ||
            scheme.startsWith('data:')       ||
            scheme.startsWith('vbscript:')
          ) {
            el.removeAttribute(attr.name);
          }
        }
      }
    }

    for (const node of nodesToRemove) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }

    return fragment;
  }

  /* ---- Create Window ---- */
  /**
   * @param {object} opts
   * @param {string} opts.id         Unique window ID
   * @param {string} opts.title      Window title
   * @param {string} opts.icon       Emoji icon
   * @param {string|HTMLElement} opts.content  HTML string or element
   * @param {number} [opts.width=680]
   * @param {number} [opts.height=440]
   * @param {boolean} [opts.resizable=true]
   * @param {boolean} [opts.maximized=false]
   * @returns {HTMLElement} The window element
   */
  function create(opts) {
    // If window already exists, focus it
    if (windows.has(opts.id)) {
      const existing = windows.get(opts.id);
      if (existing.classList.contains('minimized')) {
        existing.classList.remove('minimized');
        updateTaskbarBtn(opts.id, false);
      }
      focus(opts.id);
      return existing;
    }

    const w = opts.width || 680;
    const h = opts.height || 440;
    const desktop = document.getElementById('desktop');
    const taskbarH = 48;
    const maxX = Math.max(0, (window.innerWidth - w) * 0.5);
    const maxY = Math.max(0, (window.innerHeight - taskbarH - h) * 0.3);
    // Slight cascade offset so new windows don't perfectly overlap
    const offset = (windows.size % 8) * 24;
    const left = Math.min(maxX + offset, window.innerWidth - w - 8);
    const top = Math.max(8, Math.min(maxY + offset, window.innerHeight - taskbarH - h - 8));

    const el = document.createElement('div');
    el.className = 'window';
    el.id = `win-${opts.id}`;
    el.style.cssText = `width:${w}px;height:${h}px;left:${left}px;top:${top}px;z-index:${++zCounter}`;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', opts.title);
    el.tabIndex = -1;

    el.innerHTML = `
      <div class="window-titlebar" data-win="${opts.id}">
        <span class="window-icon">${opts.icon || '🪟'}</span>
        <span class="window-title">${escHtml(opts.title)}</span>
        <div class="window-controls">
          <button class="win-btn minimize" title="Minimize" aria-label="Minimize">−</button>
          <button class="win-btn maximize" title="Maximize" aria-label="Maximize">⊡</button>
          <button class="win-btn close" title="Close" aria-label="Close">✕</button>
        </div>
      </div>
      <div class="window-content"></div>
      ${(opts.resizable !== false) ? '<div class="window-resize" aria-hidden="true"></div>' : ''}`;

    const contentEl = el.querySelector('.window-content');
    if (typeof opts.content === 'string') {
      // Parse and sanitize the HTML string before inserting it into the DOM
      const fragment = createSafeFragmentFromHTML(opts.content);
      contentEl.textContent = '';
      contentEl.appendChild(fragment);
    } else if (opts.content instanceof HTMLElement) {
      contentEl.appendChild(opts.content);
    }

    document.getElementById('window-container').appendChild(el);
    windows.set(opts.id, el);

    // Wire controls
    el.querySelector('.win-btn.close').addEventListener('click', () => close(opts.id));
    el.querySelector('.win-btn.minimize').addEventListener('click', () => minimize(opts.id));
    el.querySelector('.win-btn.maximize').addEventListener('click', () => toggleMaximize(el));

    // Focus on click anywhere in window
    el.addEventListener('mousedown', () => focus(opts.id), true);
    el.addEventListener('touchstart', () => focus(opts.id), { passive: true, capture: true });

    // Drag
    const titlebar = el.querySelector('.window-titlebar');
    initDrag(el, titlebar);

    // Resize
    const resizeHandle = el.querySelector('.window-resize');
    if (resizeHandle) initResize(el, resizeHandle);

    // Double-click titlebar to maximize
    titlebar.addEventListener('dblclick', () => toggleMaximize(el));

    // Add to taskbar
    addTaskbarBtn(opts.id, opts.icon, opts.title);

    // Maximize if requested
    if (opts.maximized) toggleMaximize(el);

    focus(opts.id);

    return el;
  }

  /* ---- Focus ---- */
  function focus(id) {
    const el = windows.get(id);
    if (!el) return;
    windows.forEach((w, wid) => {
      w.classList.remove('focused');
      const btn = document.querySelector(`.taskbar-app-btn[data-win="${wid}"]`);
      if (btn) btn.classList.remove('active');
    });
    el.style.zIndex = ++zCounter;
    el.classList.add('focused');
    const btn = document.querySelector(`.taskbar-app-btn[data-win="${id}"]`);
    if (btn) btn.classList.add('active');
  }

  /* ---- Close ---- */
  function close(id) {
    const el = windows.get(id);
    if (!el) return;
    el.style.transition = 'opacity 0.12s, transform 0.12s';
    el.style.opacity = '0';
    el.style.transform = 'scale(0.96)';
    setTimeout(() => {
      el.remove();
      windows.delete(id);
      removeTaskbarBtn(id);
    }, 130);
  }

  /* ---- Minimize ---- */
  function minimize(id) {
    const el = windows.get(id);
    if (!el) return;
    const isMin = el.classList.contains('minimized');
    el.classList.toggle('minimized', !isMin);
    updateTaskbarBtn(id, !isMin);
    if (isMin) focus(id);
  }

  /* ---- Maximize ---- */
  function toggleMaximize(el) {
    const isMax = el.classList.contains('maximized');
    if (!isMax) {
      // Save restore values
      el.dataset.restoreLeft = el.style.left;
      el.dataset.restoreTop = el.style.top;
      el.dataset.restoreWidth = el.style.width;
      el.dataset.restoreHeight = el.style.height;
    }
    el.classList.toggle('maximized', !isMax);
    if (isMax) {
      // Restore
      el.style.left = el.dataset.restoreLeft || '80px';
      el.style.top = el.dataset.restoreTop || '60px';
      el.style.width = el.dataset.restoreWidth || '680px';
      el.style.height = el.dataset.restoreHeight || '440px';
    }
  }

  /* ---- Taskbar integration ---- */
  function addTaskbarBtn(id, icon, title) {
    const bar = document.getElementById('taskbar-apps');
    if (!bar) return;
    const btn = document.createElement('button');
    btn.className = 'taskbar-app-btn';
    btn.dataset.win = id;
    btn.innerHTML = `${icon || '🪟'} ${escHtml(title)}`;
    btn.setAttribute('role', 'listitem');
    btn.addEventListener('click', () => {
      const win = windows.get(id);
      if (!win) return;
      if (win.classList.contains('minimized')) {
        win.classList.remove('minimized');
        focus(id);
      } else if (win.classList.contains('focused')) {
        minimize(id);
      } else {
        focus(id);
      }
    });
    bar.appendChild(btn);
  }

  function removeTaskbarBtn(id) {
    const btn = document.querySelector(`.taskbar-app-btn[data-win="${id}"]`);
    if (btn) btn.remove();
  }

  function updateTaskbarBtn(id, minimized) {
    const btn = document.querySelector(`.taskbar-app-btn[data-win="${id}"]`);
    if (!btn) return;
    btn.style.opacity = minimized ? '0.5' : '1';
    if (!minimized) btn.classList.add('active');
    else btn.classList.remove('active');
  }

  /* ---- Global drag/resize state ----
   * A single set of document-level listeners is attached once (below) instead
   * of adding new listeners for every window that is created.  The active
   * handlers are swapped in when a drag/resize starts and cleared on end.
   * ------------------------------------------------------------------ */
  let activeMoveHandler = null;
  let activeEndHandler  = null;

  document.addEventListener('mousemove', e => {
    if (activeMoveHandler) activeMoveHandler(e.clientX, e.clientY);
  });
  document.addEventListener('mouseup', () => {
    if (activeEndHandler) activeEndHandler();
  });
  document.addEventListener('touchmove', e => {
    if (!activeMoveHandler) return;
    const t = e.touches[0];
    activeMoveHandler(t.clientX, t.clientY);
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (activeEndHandler) activeEndHandler();
  });

  /* ---- Snap Preview Overlay ---- */
  const snapOverlay = document.createElement('div');
  snapOverlay.className = 'snap-overlay hidden';
  document.body.appendChild(snapOverlay);

  const SNAP_EDGE = 12; // pixels from screen edge to trigger snap

  function showSnapPreview(zone) {
    const taskbarH = 48;
    const h = window.innerHeight - taskbarH;
    snapOverlay.classList.remove('hidden');
    if (zone === 'left') {
      snapOverlay.style.cssText = `left:0;top:0;width:50%;height:${h}px`;
    } else if (zone === 'right') {
      snapOverlay.style.cssText = `left:50%;top:0;width:50%;height:${h}px`;
    } else if (zone === 'top') {
      snapOverlay.style.cssText = `left:0;top:0;width:100%;height:${h}px`;
    }
  }

  function hideSnapPreview() {
    snapOverlay.classList.add('hidden');
  }

  function snapWindow(win, zone) {
    const taskbarH = 48;
    const h = window.innerHeight - taskbarH;
    // Save restore geometry before snapping
    if (!win.dataset.restoreLeft) {
      win.dataset.restoreLeft = win.style.left;
      win.dataset.restoreTop = win.style.top;
      win.dataset.restoreWidth = win.style.width;
      win.dataset.restoreHeight = win.style.height;
    }
    if (zone === 'left') {
      win.style.left = '0px'; win.style.top = '0px';
      win.style.width = `${Math.floor(window.innerWidth / 2)}px`;
      win.style.height = `${h}px`;
    } else if (zone === 'right') {
      win.style.left = `${Math.floor(window.innerWidth / 2)}px`; win.style.top = '0px';
      win.style.width = `${Math.floor(window.innerWidth / 2)}px`;
      win.style.height = `${h}px`;
    } else if (zone === 'top') {
      toggleMaximize(win);
    }
  }

  /* ---- Drag ---- */
  function initDrag(win, handle) {
    let startX, startY, startLeft, startTop;
    let snapZone = null;

    function onMove(cx, cy) {
      const dx = cx - startX;
      const dy = cy - startY;
      const newLeft = Math.max(-(win.offsetWidth - 80), startLeft + dx);
      const newTop = Math.max(0, startTop + dy);
      const taskbarH = 48;
      const maxTop = window.innerHeight - taskbarH - 30;
      win.style.left = `${newLeft}px`;
      win.style.top = `${Math.min(newTop, maxTop)}px`;

      // Snap zone detection
      if (cx <= SNAP_EDGE) { snapZone = 'left'; showSnapPreview('left'); }
      else if (cx >= window.innerWidth - SNAP_EDGE) { snapZone = 'right'; showSnapPreview('right'); }
      else if (cy <= SNAP_EDGE) { snapZone = 'top'; showSnapPreview('top'); }
      else { snapZone = null; hideSnapPreview(); }
    }

    function onEnd() {
      handle.style.cursor = 'grab';
      document.body.style.userSelect = '';
      hideSnapPreview();
      if (snapZone) {
        snapWindow(win, snapZone);
        snapZone = null;
      }
      activeMoveHandler = null;
      activeEndHandler  = null;
    }

    function onStart(cx, cy) {
      if (win.classList.contains('maximized')) return;
      startX = cx;
      startY = cy;
      startLeft = parseInt(win.style.left, 10) || 0;
      startTop  = parseInt(win.style.top, 10)  || 0;
      handle.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      snapZone = null;
      activeMoveHandler = onMove;
      activeEndHandler  = onEnd;
    }

    // Mouse
    handle.addEventListener('mousedown', e => {
      if (e.target.classList.contains('win-btn')) return;
      e.preventDefault();
      onStart(e.clientX, e.clientY);
    });

    // Touch
    handle.addEventListener('touchstart', e => {
      if (e.target.classList.contains('win-btn')) return;
      const t = e.touches[0];
      onStart(t.clientX, t.clientY);
    }, { passive: true });
  }

  /* ---- Resize ---- */
  function initResize(win, handle) {
    let startX, startY, startW, startH;

    function onMove(cx, cy) {
      const newW = Math.max(280, startW + (cx - startX));
      const newH = Math.max(200, startH + (cy - startY));
      win.style.width  = `${newW}px`;
      win.style.height = `${newH}px`;
    }

    function onEnd() {
      document.body.style.userSelect = '';
      activeMoveHandler = null;
      activeEndHandler  = null;
    }

    function onStart(cx, cy) {
      if (win.classList.contains('maximized')) return;
      startX = cx;
      startY = cy;
      startW = win.offsetWidth;
      startH = win.offsetHeight;
      document.body.style.userSelect = 'none';
      activeMoveHandler = onMove;
      activeEndHandler  = onEnd;
    }

    handle.addEventListener('mousedown', e => { e.preventDefault(); onStart(e.clientX, e.clientY); });

    handle.addEventListener('touchstart', e => {
      const t = e.touches[0];
      onStart(t.clientX, t.clientY);
    }, { passive: true });
  }

  /* ---- Public API ---- */
  return { create, focus, close, minimize, toggleMaximize, windows };
})();

window.WindowManager = WindowManager;
