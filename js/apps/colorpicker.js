/**
 * NightmareOS — Color Picker Tool
 * Pick colors with a visual picker and clipboard copy.
 * Saved colors persist in localStorage.
 */

'use strict';

(function () {
  const STORE_KEY = 'nightmareos_saved_colors';

  function loadSavedColors() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]'); }
    catch (_) { return []; }
  }

  function saveSavedColors(list) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, 30))); }
    catch (_) { /* quota exceeded */ }
  }

  function open() {
    const el = WindowManager.create({
      id: 'colorpicker',
      title: 'Color Picker',
      icon: '🎯',
      width: 380,
      height: 460,
      content: buildUI(),
    });
    initPicker(el);
  }

  function buildUI() {
    return `
      <div class="colorpicker-app">
        <div class="colorpicker-preview" id="cp-preview" style="background:#4f8ef7;"></div>
        <div class="colorpicker-inputs">
          <label>
            <span>HEX</span>
            <input type="text" id="cp-hex" class="colorpicker-input" value="#4f8ef7" maxlength="7" aria-label="Hex color" />
          </label>
          <label>
            <span>R</span>
            <input type="number" id="cp-r" class="colorpicker-input colorpicker-rgb" min="0" max="255" value="79" aria-label="Red" />
          </label>
          <label>
            <span>G</span>
            <input type="number" id="cp-g" class="colorpicker-input colorpicker-rgb" min="0" max="255" value="142" aria-label="Green" />
          </label>
          <label>
            <span>B</span>
            <input type="number" id="cp-b" class="colorpicker-input colorpicker-rgb" min="0" max="255" value="247" aria-label="Blue" />
          </label>
        </div>
        <div class="colorpicker-picker-row">
          <input type="color" id="cp-native" class="colorpicker-native" value="#4f8ef7" aria-label="Color picker" />
          <button class="colorpicker-btn" id="cp-copy">📋 Copy HEX</button>
          <button class="colorpicker-btn" id="cp-save">💾 Save</button>
        </div>
        <div class="colorpicker-saved-section">
          <div class="colorpicker-saved-header">Saved Colors</div>
          <div class="colorpicker-saved" id="cp-saved" role="list" aria-label="Saved colors"></div>
        </div>
      </div>`;
  }

  function initPicker(el) {
    const preview = el.querySelector('#cp-preview');
    const hexInput = el.querySelector('#cp-hex');
    const rInput = el.querySelector('#cp-r');
    const gInput = el.querySelector('#cp-g');
    const bInput = el.querySelector('#cp-b');
    const nativePicker = el.querySelector('#cp-native');
    const savedEl = el.querySelector('#cp-saved');

    function setColor(hex) {
      hex = hex.replace(/^#/, '');
      if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      if (!/^[0-9a-fA-F]{6}$/.test(hex)) return;
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      preview.style.background = `#${hex}`;
      hexInput.value = `#${hex}`;
      rInput.value = r;
      gInput.value = g;
      bInput.value = b;
      nativePicker.value = `#${hex}`;
    }

    function rgbToHex(r, g, b) {
      return '#' + [r, g, b].map(v =>
        Math.max(0, Math.min(255, parseInt(v, 10) || 0)).toString(16).padStart(2, '0')
      ).join('');
    }

    hexInput.addEventListener('input', () => setColor(hexInput.value));
    [rInput, gInput, bInput].forEach(inp => {
      inp.addEventListener('input', () => {
        setColor(rgbToHex(rInput.value, gInput.value, bInput.value));
      });
    });

    nativePicker.addEventListener('input', () => setColor(nativePicker.value));

    el.querySelector('#cp-copy').addEventListener('click', () => {
      const hex = hexInput.value;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(hex).then(() => {
          if (typeof showNotification === 'function')
            showNotification('Color Picker', `Copied ${hex} to clipboard.`);
        }).catch(() => {});
      }
    });

    el.querySelector('#cp-save').addEventListener('click', () => {
      const hex = hexInput.value;
      const colors = loadSavedColors();
      if (!colors.includes(hex)) {
        colors.unshift(hex);
        saveSavedColors(colors);
        renderSaved();
      }
    });

    function renderSaved() {
      const colors = loadSavedColors();
      savedEl.innerHTML = colors.map(c =>
        `<div class="colorpicker-swatch" role="listitem" data-color="${escHtml(c)}" style="background:${c};" title="${escHtml(c)}"></div>`
      ).join('');
      savedEl.querySelectorAll('.colorpicker-swatch').forEach(sw => {
        sw.addEventListener('click', () => setColor(sw.dataset.color));
      });
    }

    renderSaved();
  }

  NightOS.registerApp('colorpicker', {
    title: 'Color Picker',
    icon: '🎯',
    open,
  });
})();
