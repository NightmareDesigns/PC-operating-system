/**
 * NightOS — Text Editor App
 */

'use strict';

(function () {
  let instanceCount = 0;

  function open(initialContent = '', initialTitle = 'Untitled') {
    instanceCount++;
    const id = instanceCount === 1 ? 'texteditor' : `texteditor-${instanceCount}`;

    const el = WindowManager.create({
      id,
      title: initialTitle,
      icon: '📝',
      width: 640,
      height: 480,
      content: buildUI(),
    });

    initEditor(el, id, initialContent, initialTitle);
  }

  function buildUI() {
    return `
      <div class="win-toolbar">
        <button class="win-toolbar-btn" data-te="new">📄 New</button>
        <button class="win-toolbar-btn" data-te="open">📂 Open</button>
        <button class="win-toolbar-btn" data-te="save">💾 Save</button>
        <div class="win-toolbar-sep"></div>
        <button class="win-toolbar-btn" data-te="wrap" id="te-wrap-btn">↩ Wrap</button>
        <div class="win-toolbar-sep"></div>
        <button class="win-toolbar-btn" data-te="bold">B</button>
        <button class="win-toolbar-btn" data-te="find">🔍 Find</button>
      </div>
      <textarea class="editor-area" spellcheck="true" autocomplete="off" aria-label="Editor content" placeholder="Start typing here…"></textarea>
      <div class="win-statusbar">
        <span id="te-pos">Ln 1, Col 1</span>
        <span id="te-chars">0 chars</span>
        <span id="te-words">0 words</span>
      </div>`;
  }

  function initEditor(el, id, initialContent, initialTitle) {
    const area = el.querySelector('.editor-area');
    const posEl = el.querySelector('#te-pos');
    const charsEl = el.querySelector('#te-chars');
    const wordsEl = el.querySelector('#te-words');
    let dirty = false;
    let fileName = initialTitle;

    if (initialContent) area.value = initialContent;

    function setTitle(name, isDirty) {
      fileName = name;
      dirty = isDirty;
      const titleEl = el.querySelector('.window-title');
      if (titleEl) titleEl.textContent = `${isDirty ? '● ' : ''}${name}`;
    }

    function updateStats() {
      if (!area) return;
      const text = area.value;
      const lines = text.split('\n');
      const selStart = area.selectionStart;
      const before = text.slice(0, selStart);
      const ln = before.split('\n').length;
      const col = before.split('\n').pop().length + 1;
      if (posEl) posEl.textContent = `Ln ${ln}, Col ${col}`;
      if (charsEl) charsEl.textContent = `${text.length} chars`;
      if (wordsEl) wordsEl.textContent = `${text.trim() ? text.trim().split(/\s+/).length : 0} words`;
    }

    area.addEventListener('input', () => { updateStats(); setTitle(fileName, true); });
    area.addEventListener('keyup', updateStats);
    area.addEventListener('click', updateStats);

    // Tab key inserts spaces
    area.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = area.selectionStart;
        const end = area.selectionEnd;
        area.value = area.value.slice(0, start) + '  ' + area.value.slice(end);
        area.selectionStart = area.selectionEnd = start + 2;
        updateStats();
      }
      // Ctrl+S save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
    });

    function saveFile() {
      try {
        const blob = new Blob([area.value], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        setTitle(fileName, false);
        showNotification('Text Editor', `Saved: ${a.download}`);
      } catch (_) {
        showNotification('Text Editor', 'Save failed — copy text manually.');
      }
    }

    function openFile() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.md,.js,.ts,.json,.html,.css,.py,.java,.c,.cpp,.xml,.csv';
      input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          area.value = ev.target.result;
          setTitle(file.name, false);
          updateStats();
        };
        reader.readAsText(file);
      });
      input.click();
    }

    function findReplace() {
      const term = window.prompt('Find text:');
      if (!term) return;
      const idx = area.value.indexOf(term);
      if (idx === -1) {
        showNotification('Text Editor', `"${term}" not found.`);
        return;
      }
      area.focus();
      area.setSelectionRange(idx, idx + term.length);
    }

    // Toolbar buttons
    el.querySelector('[data-te="new"]').addEventListener('click', () => {
      if (dirty && !window.confirm('Discard unsaved changes?')) return;
      area.value = '';
      setTitle('Untitled', false);
      updateStats();
    });

    el.querySelector('[data-te="open"]').addEventListener('click', openFile);
    el.querySelector('[data-te="save"]').addEventListener('click', saveFile);
    el.querySelector('[data-te="find"]').addEventListener('click', findReplace);

    const wrapBtn = el.querySelector('[data-te="wrap"]');
    let wrapped = true;
    wrapBtn.classList.add('active');
    wrapBtn.addEventListener('click', () => {
      wrapped = !wrapped;
      area.style.whiteSpace = wrapped ? 'pre-wrap' : 'pre';
      area.style.overflowX = wrapped ? 'hidden' : 'auto';
      wrapBtn.classList.toggle('active', wrapped);
    });

    el.querySelector('[data-te="bold"]').addEventListener('click', () => {
      const start = area.selectionStart;
      const end = area.selectionEnd;
      if (start === end) return;
      const selected = area.value.slice(start, end);
      const replacement = `**${selected}**`;
      area.value = area.value.slice(0, start) + replacement + area.value.slice(end);
      area.setSelectionRange(start, start + replacement.length);
      updateStats();
    });

    updateStats();
  }

  NightOS.registerApp('texteditor', {
    title: 'Text Editor',
    icon: '📝',
    open: () => open('', 'Untitled.txt'),
  });
})();
