/**
 * NightOS — File Manager App
 */

'use strict';

(function () {
  /* Virtual Filesystem */
  const FS = {
    '/': { type: 'dir', children: ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Music'] },
    '/Desktop': { type: 'dir', children: ['readme.txt'] },
    '/Documents': { type: 'dir', children: ['notes.txt', 'todo.txt', 'report.txt'] },
    '/Downloads': { type: 'dir', children: [] },
    '/Pictures': { type: 'dir', children: ['wallpaper.png', 'screenshot.png'] },
    '/Music': { type: 'dir', children: [] },
    '/Desktop/readme.txt': { type: 'file', content: 'Welcome to NightOS!\n\nThis is a cross-platform desktop OS that runs in any web browser on Windows, macOS, Linux, and Android.\n\nEnjoy exploring!' },
    '/Documents/notes.txt': { type: 'file', content: 'My Notes\n--------\n\n- Learn NightOS\n- Explore the apps\n- Have fun!' },
    '/Documents/todo.txt': { type: 'file', content: 'TODO List\n---------\n[ ] Explore File Manager\n[ ] Try the Terminal\n[ ] Calculate something\n[ ] Write a note' },
    '/Documents/report.txt': { type: 'file', content: 'NightOS Report\n==============\n\nVersion: 1.0.0\nStatus: Running\nPlatform: Web' },
    '/Pictures/wallpaper.png': { type: 'file', content: null },
    '/Pictures/screenshot.png': { type: 'file', content: null },
  };

  const ICONS = {
    dir: '📁',
    txt: '📄',
    png: '🖼️',
    jpg: '🖼️',
    mp3: '🎵',
    mp4: '🎬',
    pdf: '📕',
    file: '📄',
  };

  function getIcon(name, type) {
    if (type === 'dir') return ICONS.dir;
    const ext = name.split('.').pop().toLowerCase();
    return ICONS[ext] || ICONS.file;
  }

  function open() {
    const el = WindowManager.create({
      id: 'filemanager',
      title: 'File Manager',
      icon: '📁',
      width: 680,
      height: 440,
      content: buildUI(),
    });
    initFM(el);
  }

  function buildUI() {
    return `
      <div class="win-toolbar">
        <button class="win-toolbar-btn" data-fm="back">← Back</button>
        <button class="win-toolbar-btn" data-fm="home">🏠 Home</button>
        <div class="win-toolbar-sep"></div>
        <span class="win-toolbar-btn" style="cursor:default;background:none;border:none;" id="fm-path-display" aria-label="Current path" aria-live="polite">/</span>
      </div>
      <div class="fm-layout">
        <nav class="fm-sidebar" aria-label="Locations">
          <div class="fm-sidebar-item" data-path="/" aria-current="false">🏠 Home</div>
          <div class="fm-sidebar-item" data-path="/Desktop">🖥️ Desktop</div>
          <div class="fm-sidebar-item" data-path="/Documents">📄 Documents</div>
          <div class="fm-sidebar-item" data-path="/Downloads">⬇️ Downloads</div>
          <div class="fm-sidebar-item" data-path="/Pictures">🖼️ Pictures</div>
          <div class="fm-sidebar-item" data-path="/Music">🎵 Music</div>
        </nav>
        <main class="fm-main" id="fm-main-content" aria-label="Files">
          <div class="fm-grid" id="fm-grid"></div>
        </main>
      </div>
      <div class="win-statusbar">
        <span id="fm-status">Ready</span>
      </div>`;
  }

  function initFM(el) {
    const win = el;
    let currentPath = '/';
    const history = ['/'];
    let historyIndex = 0;

    function navigate(path) {
      if (!FS[path] || FS[path].type !== 'dir') {
        showNotification('File Manager', `Cannot open: ${path}`);
        return;
      }
      if (history[historyIndex] !== path) {
        history.splice(historyIndex + 1);
        history.push(path);
        historyIndex = history.length - 1;
      }
      currentPath = path;
      render();
    }

    function render() {
      const node = FS[currentPath];
      const grid = win.querySelector('#fm-grid');
      const pathDisplay = win.querySelector('#fm-path-display');
      const status = win.querySelector('#fm-status');

      if (pathDisplay) pathDisplay.textContent = currentPath;
      if (!grid || !node) return;

      grid.innerHTML = '';
      const children = node.children || [];

      if (children.length === 0) {
        grid.innerHTML = '<div style="color:var(--text-secondary);font-size:0.82rem;padding:16px;">Empty folder</div>';
      }

      children.forEach(name => {
        const childPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
        const child = FS[childPath] || { type: 'file' };
        const isDir = child.type === 'dir';
        const icon = getIcon(name, child.type);

        const item = document.createElement('div');
        item.className = 'fm-item';
        item.tabIndex = 0;
        item.setAttribute('role', 'button');
        item.setAttribute('aria-label', name);
        item.innerHTML = `<span class="fm-item-icon">${icon}</span><span class="fm-item-name">${escHtml(name)}</span>`;

        const activate = () => {
          if (isDir) {
            navigate(childPath);
          } else {
            openFile(childPath, name, child);
          }
        };

        item.addEventListener('dblclick', activate);
        item.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
        });
        item.addEventListener('click', () => {
          win.querySelectorAll('.fm-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          if (status) status.textContent = name;
        });

        grid.appendChild(item);
      });

      // Sidebar active state
      win.querySelectorAll('.fm-sidebar-item').forEach(s => {
        s.classList.toggle('active', s.dataset.path === currentPath);
        s.setAttribute('aria-current', s.dataset.path === currentPath ? 'true' : 'false');
      });

      if (status) status.textContent = `${children.length} items`;
    }

    function openFile(path, name, node) {
      if (node.content !== null && node.content !== undefined) {
        NightOS.launchApp('texteditor');
        // Pass content after a tick so window is created
        setTimeout(() => {
          const tedWin = document.getElementById('win-texteditor');
          if (tedWin) {
            const area = tedWin.querySelector('.editor-area');
            if (area) {
              area.value = node.content;
              const titleEl = tedWin.querySelector('.window-title');
              if (titleEl) titleEl.textContent = name;
            }
          }
        }, 80);
      } else {
        showNotification('File Manager', `Cannot preview: ${name}`);
      }
    }

    // Toolbar
    win.querySelector('[data-fm="back"]').addEventListener('click', () => {
      if (historyIndex > 0) {
        historyIndex--;
        currentPath = history[historyIndex];
        render();
      }
    });

    win.querySelector('[data-fm="home"]').addEventListener('click', () => navigate('/'));

    // Sidebar
    win.querySelectorAll('.fm-sidebar-item').forEach(item => {
      item.addEventListener('click', () => navigate(item.dataset.path));
    });

    navigate('/');
  }

  NightOS.registerApp('filemanager', {
    title: 'File Manager',
    icon: '📁',
    open,
  });
})();
