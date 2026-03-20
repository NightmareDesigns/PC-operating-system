/**
 * NightOS — Paint App
 * Canvas drawing tool with pencil, eraser, shape tools,
 * color picker, brush size, fill, and save-as-PNG.
 */

'use strict';

(function () {
  let instanceCount = 0;

  const TOOLS = ['pencil', 'eraser', 'line', 'rect', 'ellipse', 'fill'];

  function open() {
    instanceCount++;
    const id = instanceCount === 1 ? 'paint' : `paint-${instanceCount}`;
    const el = WindowManager.create({
      id,
      title: 'Paint',
      icon: '🎨',
      width: 760,
      height: 540,
      content: buildUI(),
    });
    initPaint(el);
  }

  function buildUI() {
    const toolButtons = TOOLS.map((t, i) => {
      const icons = { pencil:'✏️', eraser:'🧹', line:'╱', rect:'▭', ellipse:'⬭', fill:'🪣' };
      return `<button class="paint-tool-btn ${i===0?'active':''}" data-tool="${t}"
                      title="${t.charAt(0).toUpperCase()+t.slice(1)}" aria-label="${t}">${icons[t]}</button>`;
    }).join('');

    return `
      <div class="paint-layout">
        <!-- Toolbar -->
        <div class="paint-toolbar">
          <div class="paint-tool-group">${toolButtons}</div>
          <div class="paint-tool-sep"></div>
          <!-- Brush size -->
          <label class="paint-toolbar-label" for="paint-size">Size</label>
          <input type="range" id="paint-size" min="1" max="60" value="4"
                 style="width:80px;accent-color:var(--accent);" aria-label="Brush size" />
          <span id="paint-size-val" style="min-width:22px;font-size:0.78rem;color:var(--text-secondary);">4</span>
          <div class="paint-tool-sep"></div>
          <!-- Opacity -->
          <label class="paint-toolbar-label" for="paint-opacity">Opacity</label>
          <input type="range" id="paint-opacity" min="5" max="100" value="100"
                 style="width:70px;accent-color:var(--accent);" aria-label="Opacity" />
          <div class="paint-tool-sep"></div>
          <!-- Color -->
          <label class="paint-toolbar-label" for="paint-color">Color</label>
          <input type="color" id="paint-color" value="#4f8ef7"
                 style="width:32px;height:26px;border:none;background:none;cursor:pointer;padding:0;" aria-label="Color" />
          <!-- Palette swatches -->
          <div class="paint-palette">
            <div class="paint-swatch" style="background:#000000" data-color="#000000" title="Black"></div>
            <div class="paint-swatch" style="background:#ffffff" data-color="#ffffff" title="White"></div>
            <div class="paint-swatch" style="background:#ff3b30" data-color="#ff3b30" title="Red"></div>
            <div class="paint-swatch" style="background:#ff9500" data-color="#ff9500" title="Orange"></div>
            <div class="paint-swatch" style="background:#ffd60a" data-color="#ffd60a" title="Yellow"></div>
            <div class="paint-swatch" style="background:#30d158" data-color="#30d158" title="Green"></div>
            <div class="paint-swatch" style="background:#00e5ff" data-color="#00e5ff" title="Cyan"></div>
            <div class="paint-swatch" style="background:#4f8ef7" data-color="#4f8ef7" title="Blue"></div>
            <div class="paint-swatch" style="background:#bf5af2" data-color="#bf5af2" title="Purple"></div>
            <div class="paint-swatch" style="background:#8b4513" data-color="#8b4513" title="Brown"></div>
          </div>
          <div class="paint-tool-sep"></div>
          <button class="win-toolbar-btn" id="paint-clear" title="Clear canvas">🗑️ Clear</button>
          <button class="win-toolbar-btn" id="paint-save"  title="Save as PNG">💾 Save</button>
          <button class="win-toolbar-btn" id="paint-undo"  title="Undo">↩ Undo</button>
        </div>
        <!-- Canvas area -->
        <div class="paint-canvas-wrap" id="paint-canvas-wrap">
          <canvas id="paint-canvas" class="paint-canvas"
                  aria-label="Drawing canvas" role="img"></canvas>
        </div>
        <!-- Status bar -->
        <div class="win-statusbar">
          <span id="paint-coords">0, 0</span>
          <span id="paint-tool-status">Tool: Pencil</span>
        </div>
      </div>`;
  }

  function initPaint(el) {
    const canvas      = el.querySelector('#paint-canvas');
    const wrap        = el.querySelector('#paint-canvas-wrap');
    const ctx         = canvas.getContext('2d', { willReadFrequently: true });
    const colorInput  = el.querySelector('#paint-color');
    const sizeInput   = el.querySelector('#paint-size');
    const sizeVal     = el.querySelector('#paint-size-val');
    const opacInput   = el.querySelector('#paint-opacity');
    const coordsEl   = el.querySelector('#paint-coords');
    const statusEl   = el.querySelector('#paint-tool-status');

    let tool        = 'pencil';
    let drawing     = false;
    let startX      = 0;
    let startY      = 0;
    let brushSize   = 4;
    let color       = '#4f8ef7';
    let opacity     = 1;
    let snapShot    = null; // for shape preview
    const undoStack = [];
    const MAX_UNDO  = 20;

    /* ---- Size canvas to wrap ---- */
    function resizeCanvas() {
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width  = wrap.offsetWidth  || 600;
      canvas.height = wrap.offsetHeight || 400;
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      try { ctx.putImageData(snapshot, 0, 0); } catch (_) {}
    }

    resizeCanvas();

    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(wrap);

    /* ---- Helpers ---- */
    function saveUndo() {
      undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (undoStack.length > MAX_UNDO) undoStack.shift();
    }

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const src  = e.touches ? e.touches[0] : e;
      return {
        x: (src.clientX - rect.left) * (canvas.width  / rect.width),
        y: (src.clientY - rect.top)  * (canvas.height / rect.height),
      };
    }

    function setCtxStyle() {
      ctx.strokeStyle = color;
      ctx.fillStyle   = color;
      ctx.lineWidth   = brushSize;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.globalAlpha = opacity;
    }

    /* ---- Fill bucket (flood fill) ---- */
    function floodFill(sx, sy, fillColorHex) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data    = imgData.data;
      const w       = canvas.width;
      const h       = canvas.height;

      // Parse target and fill colors
      function hexToRgb(hex) {
        const r = parseInt(hex.slice(1,3),16);
        const g = parseInt(hex.slice(3,5),16);
        const b = parseInt(hex.slice(5,7),16);
        return [r,g,b];
      }

      const px  = (Math.round(sx) + Math.round(sy) * w) * 4;
      const tr  = data[px], tg = data[px+1], tb = data[px+2], ta = data[px+3];
      const [fr, fg, fb] = hexToRgb(fillColorHex);

      // Skip if target already matches fill
      if (tr===fr && tg===fg && tb===fb && ta===255) return;

      function match(idx) {
        return data[idx]===tr && data[idx+1]===tg && data[idx+2]===tb && data[idx+3]===ta;
      }

      const stack = [[Math.round(sx), Math.round(sy)]];
      const seen  = new Uint8Array(w * h);

      while (stack.length) {
        const [x, y] = stack.pop();
        if (x<0||x>=w||y<0||y>=h) continue;
        const i = (x + y * w) * 4;
        if (seen[x + y * w]) continue;
        if (!match(i)) continue;
        seen[x + y * w] = 1;
        data[i]   = fr;
        data[i+1] = fg;
        data[i+2] = fb;
        data[i+3] = 255;
        stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
      }
      ctx.putImageData(imgData, 0, 0);
    }

    /* ---- Draw event handlers ---- */
    function onDown(e) {
      e.preventDefault();
      drawing = true;
      const { x, y } = getPos(e);
      startX = x; startY = y;

      saveUndo();
      setCtxStyle();

      if (tool === 'fill') {
        floodFill(x, y, color);
        drawing = false;
        return;
      }

      if (tool === 'pencil' || tool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(x, y);
      } else {
        // Shape tools: save snapshot for preview
        snapShot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
    }

    function onMove(e) {
      e.preventDefault();
      const { x, y } = getPos(e);
      if (coordsEl) coordsEl.textContent = `${Math.round(x)}, ${Math.round(y)}`;

      if (!drawing) return;

      setCtxStyle();

      if (tool === 'pencil') {
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (tool === 'eraser') {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
        ctx.lineWidth   = brushSize * 3;
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
      } else if (tool === 'line') {
        if (snapShot) ctx.putImageData(snapShot, 0, 0);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (tool === 'rect') {
        if (snapShot) ctx.putImageData(snapShot, 0, 0);
        ctx.beginPath();
        ctx.rect(startX, startY, x - startX, y - startY);
        ctx.stroke();
      } else if (tool === 'ellipse') {
        if (snapShot) ctx.putImageData(snapShot, 0, 0);
        const rx = Math.abs(x - startX) / 2;
        const ry = Math.abs(y - startY) / 2;
        const cx = startX + (x - startX) / 2;
        const cy = startY + (y - startY) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function onUp() {
      if (!drawing) return;
      drawing  = false;
      snapShot = null;
      ctx.globalAlpha = 1;
    }

    canvas.addEventListener('mousedown',  onDown);
    canvas.addEventListener('mousemove',  onMove);
    canvas.addEventListener('mouseup',    onUp);
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove',  onMove, { passive: false });
    canvas.addEventListener('touchend',   onUp);

    /* ---- Tool buttons ---- */
    el.querySelectorAll('.paint-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.paint-tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tool = btn.dataset.tool;
        if (statusEl) statusEl.textContent = `Tool: ${tool.charAt(0).toUpperCase()+tool.slice(1)}`;
        // Change cursor
        const cursors = { pencil:'crosshair', eraser:'cell', line:'crosshair',
                          rect:'crosshair', ellipse:'crosshair', fill:'copy' };
        canvas.style.cursor = cursors[tool] || 'crosshair';
      });
    });

    /* ---- Palette swatches ---- */
    el.querySelectorAll('.paint-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        color = sw.dataset.color;
        colorInput.value = color;
      });
    });

    /* ---- Color input ---- */
    colorInput.addEventListener('input', () => { color = colorInput.value; });

    /* ---- Size ---- */
    sizeInput.addEventListener('input', () => {
      brushSize = Number(sizeInput.value);
      if (sizeVal) sizeVal.textContent = brushSize;
    });

    /* ---- Opacity ---- */
    opacInput.addEventListener('input', () => {
      opacity = Number(opacInput.value) / 100;
    });

    /* ---- Clear ---- */
    el.querySelector('#paint-clear').addEventListener('click', () => {
      saveUndo();
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    });

    /* ---- Save PNG ---- */
    el.querySelector('#paint-save').addEventListener('click', () => {
      const a = document.createElement('a');
      a.download = `paint-${Date.now()}.png`;
      a.href = canvas.toDataURL('image/png');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showNotification('Paint', 'Image saved as PNG.');
    });

    /* ---- Undo ---- */
    el.querySelector('#paint-undo').addEventListener('click', () => {
      if (undoStack.length) {
        ctx.putImageData(undoStack.pop(), 0, 0);
      }
    });

    /* ---- Keyboard shortcuts ---- */
    el.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        el.querySelector('#paint-undo').click();
      }
    });
  }

  NightOS.registerApp('paint', {
    title: 'Paint',
    icon: '🎨',
    open,
  });
})();
