/**
 * NightOS — Sticky Notes
 * Draggable, resizable, colorable post-it notes placed on the desktop.
 * Notes are persisted to localStorage.
 */

'use strict';

(function () {
  const STORE_KEY = 'nightos_stickynotes';
  const NOTE_COLORS = ['#ffd60a', '#ff9500', '#30d158', '#00e5ff', '#bf5af2', '#ff375f', '#fffbe6'];
  let notes = [];      // { id, x, y, w, h, color, text }
  let nextId = 1;

  /* ---- Persistence ---- */
  function saveNotes() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(notes));
    } catch (_) {}
  }

  function loadNotes() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        notes = JSON.parse(raw);
        nextId = Math.max(1, ...notes.map(n => n.id + 1));
      }
    } catch (_) {}
  }

  /* ---- Create a note DOM element ---- */
  function createNoteEl(note) {
    const el = document.createElement('div');
    el.className = 'sticky-note';
    el.id = `sticky-${note.id}`;
    el.style.cssText = `left:${note.x}px;top:${note.y}px;width:${note.w}px;height:${note.h}px;background:${note.color};`;
    el.setAttribute('role', 'note');
    el.setAttribute('aria-label', 'Sticky note');

    el.innerHTML = `
      <div class="sticky-header" aria-hidden="true">
        <div class="sticky-color-strip"></div>
        <div class="sticky-actions">
          <button class="sticky-btn sticky-color-btn" title="Change color" aria-label="Change note color">🎨</button>
          <button class="sticky-btn sticky-close-btn" title="Delete note" aria-label="Delete note">✕</button>
        </div>
        <div class="sticky-color-picker hidden">
          ${NOTE_COLORS.map(c =>
            `<div class="sticky-color-swatch" style="background:${c};" data-color="${c}" title="${c}"></div>`
          ).join('')}
        </div>
      </div>
      <textarea class="sticky-text" placeholder="Type a note…" aria-label="Note text">${escHtml(note.text || '')}</textarea>`;

    /* Textarea update */
    const ta = el.querySelector('.sticky-text');
    ta.addEventListener('input', () => {
      note.text = ta.value;
      saveNotes();
    });

    /* Delete */
    el.querySelector('.sticky-close-btn').addEventListener('click', e => {
      e.stopPropagation();
      el.remove();
      notes = notes.filter(n => n.id !== note.id);
      saveNotes();
    });

    /* Color picker */
    const colorBtn    = el.querySelector('.sticky-color-btn');
    const colorPicker = el.querySelector('.sticky-color-picker');
    colorBtn.addEventListener('click', e => {
      e.stopPropagation();
      colorPicker.classList.toggle('hidden');
    });
    colorPicker.querySelectorAll('.sticky-color-swatch').forEach(sw => {
      sw.addEventListener('click', e => {
        e.stopPropagation();
        note.color = sw.dataset.color;
        el.style.background = note.color;
        colorPicker.classList.add('hidden');
        saveNotes();
      });
    });
    document.addEventListener('click', () => colorPicker.classList.add('hidden'));

    /* Drag from header */
    const header = el.querySelector('.sticky-header');
    initNoteDrag(el, header, note);

    /* Resize handle (bottom-right corner via CSS resize) */
    const ro = new ResizeObserver(() => {
      note.w = el.offsetWidth;
      note.h = el.offsetHeight;
      saveNotes();
    });
    ro.observe(el);

    return el;
  }

  function initNoteDrag(el, handle, note) {
    let dragging = false, sx, sy, ex, ey;

    handle.addEventListener('mousedown', e => {
      if (e.target.classList.contains('sticky-btn') ||
          e.target.classList.contains('sticky-color-swatch')) return;
      e.preventDefault();
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      ex = el.offsetLeft; ey = el.offsetTop;
      el.style.zIndex = 9900;
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const nx = Math.max(0, ex + e.clientX - sx);
      const ny = Math.max(0, ey + e.clientY - sy);
      el.style.left = `${nx}px`;
      el.style.top  = `${ny}px`;
      note.x = nx; note.y = ny;
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      el.style.zIndex = '';
      document.body.style.userSelect = '';
      saveNotes();
    });
  }

  /* ---- Add a new note ---- */
  function addNote(x, y) {
    const note = {
      id:    nextId++,
      x:     x - 10,
      y:     y - 20,
      w:     200,
      h:     160,
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
      text:  '',
    };
    notes.push(note);
    saveNotes();
    const el = createNoteEl(note);
    const desktop = document.getElementById('desktop');
    if (desktop) desktop.appendChild(el);
    // Focus textarea
    setTimeout(() => el.querySelector('.sticky-text')?.focus(), 50);
  }

  /* ---- Render all saved notes ---- */
  function renderSavedNotes() {
    const desktop = document.getElementById('desktop');
    if (!desktop) return;
    notes.forEach(note => {
      if (!document.getElementById(`sticky-${note.id}`)) {
        desktop.appendChild(createNoteEl(note));
      }
    });
  }

  /* ---- Expose globally so desktop.js context menu can call addNote ---- */
  window.StickyNotes = { add: addNote, renderSaved: renderSavedNotes, load: loadNotes };

  loadNotes();

  /* ---- Register with NightOS so it appears as a launchable app ---- */
  function open() {
    const desktop = document.getElementById('desktop');
    const cx = desktop ? Math.round(desktop.offsetWidth / 2 - 100) : 200;
    const cy = desktop ? Math.round(desktop.offsetHeight / 2 - 80) : 150;
    // addNote offsets its argument by (-10, -20), so compensate to place
    // the note at the intended center position.
    addNote(cx + 10, cy + 20);
  }

  NightOS.registerApp('stickynotes', {
    title: 'Sticky Notes',
    icon: '📌',
    open,
  });
})();
