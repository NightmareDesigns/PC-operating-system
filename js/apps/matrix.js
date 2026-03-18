/**
 * NightOS — Matrix Rain App
 * Classic Matrix-style falling code animation on a black canvas.
 * Features: color selection, speed, density, fullscreen mode,
 * set-as-wallpaper toggle.
 */

'use strict';

(function () {
  /* Halfwidth Katakana + digits + Latin — authentic Matrix charset */
  const CHARS =
    'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ' +
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*+-=<>';

  const PRESETS = {
    green:  { head: '#ffffff', trail: '#00ff41', glow: '#00ff41' },
    cyan:   { head: '#ffffff', trail: '#00e5ff', glow: '#00e5ff' },
    blue:   { head: '#aad4ff', trail: '#4f8ef7', glow: '#4f8ef7' },
    red:    { head: '#ffdddd', trail: '#ff3b30', glow: '#ff3b30' },
    purple: { head: '#e8d5ff', trail: '#bf5af2', glow: '#bf5af2' },
    gold:   { head: '#fffacd', trail: '#ffd60a', glow: '#ffd60a' },
  };

  /* ---- Wallpaper overlay canvas ---- */
  let wpCanvas = null;
  let wpCtx = null;
  let wpRunning = false;
  let wpDrops = [];
  let wpRafId = null;
  let wpFontSize = 14;
  let wpColor = PRESETS.green;
  let wpSpeed = 1;

  function startWallpaperMatrix() {
    const wallpaperEl = document.getElementById('wallpaper');
    if (!wallpaperEl) return;

    stopWallpaperMatrix();

    // Create canvas inside wallpaper div
    wpCanvas = document.createElement('canvas');
    wpCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    wallpaperEl.style.background = '#000';
    wallpaperEl.appendChild(wpCanvas);

    wpCanvas.width  = wallpaperEl.offsetWidth  || window.innerWidth;
    wpCanvas.height = wallpaperEl.offsetHeight || (window.innerHeight - 48);
    wpCtx = wpCanvas.getContext('2d');

    const cols = Math.floor(wpCanvas.width / wpFontSize);
    wpDrops = Array.from({ length: cols }, () => Math.random() * -50 | 0);

    wpRunning = true;

    function drawWp() {
      if (!wpRunning) return;
      wpCtx.fillStyle = 'rgba(0,0,0,0.05)';
      wpCtx.fillRect(0, 0, wpCanvas.width, wpCanvas.height);

      wpCtx.font = `${wpFontSize}px monospace`;

      for (let i = 0; i < wpDrops.length; i++) {
        const ch = CHARS[Math.random() * CHARS.length | 0];
        const x  = i * wpFontSize;
        const y  = wpDrops[i] * wpFontSize;

        // Head character brighter
        const isHead = Math.random() > 0.92;
        wpCtx.fillStyle = isHead ? wpColor.head : wpColor.trail;
        wpCtx.shadowColor = wpColor.glow;
        wpCtx.shadowBlur  = isHead ? 8 : 3;
        wpCtx.fillText(ch, x, y);

        if (y > wpCanvas.height && Math.random() > 0.975) {
          wpDrops[i] = 0;
        }
        wpDrops[i] += wpSpeed * 0.5;
      }
      wpRafId = requestAnimationFrame(drawWp);
    }

    drawWp();
  }

  function stopWallpaperMatrix() {
    wpRunning = false;
    if (wpRafId) cancelAnimationFrame(wpRafId);
    wpRafId = null;
    if (wpCanvas) {
      wpCanvas.remove();
      wpCanvas = null;
    }
    const wallpaperEl = document.getElementById('wallpaper');
    if (wallpaperEl) wallpaperEl.style.background = '';
  }

  /* Expose so settings.js can toggle it */
  window.MatrixWallpaper = { start: startWallpaperMatrix, stop: stopWallpaperMatrix };

  /* ---- App Window ---- */
  function open() {
    const el = WindowManager.create({
      id: 'matrix',
      title: 'Matrix Rain',
      icon: '🟩',
      width: 700,
      height: 480,
      content: buildUI(),
    });
    initMatrix(el);
  }

  function buildUI() {
    return `
      <div class="matrix-layout">
        <canvas class="matrix-canvas" id="matrix-canvas" aria-label="Matrix rain animation"></canvas>
        <div class="matrix-controls" role="group" aria-label="Matrix controls">
          <div class="matrix-ctrl-row">
            <label class="matrix-ctrl-label">Color</label>
            <div class="matrix-color-btns" id="matrix-color-btns">
              <button class="matrix-color-btn active" data-color="green"  style="background:#00ff41" aria-label="Green" title="Green"></button>
              <button class="matrix-color-btn" data-color="cyan"   style="background:#00e5ff" aria-label="Cyan"  title="Cyan"></button>
              <button class="matrix-color-btn" data-color="blue"   style="background:#4f8ef7" aria-label="Blue"  title="Blue"></button>
              <button class="matrix-color-btn" data-color="red"    style="background:#ff3b30" aria-label="Red"   title="Red"></button>
              <button class="matrix-color-btn" data-color="purple" style="background:#bf5af2" aria-label="Purple" title="Purple"></button>
              <button class="matrix-color-btn" data-color="gold"   style="background:#ffd60a" aria-label="Gold"  title="Gold"></button>
            </div>
          </div>
          <div class="matrix-ctrl-row">
            <label class="matrix-ctrl-label" for="matrix-speed">Speed</label>
            <input type="range" id="matrix-speed" min="1" max="10" value="5"
                   style="flex:1;accent-color:var(--accent);" aria-label="Animation speed" />
            <span class="matrix-ctrl-val" id="matrix-speed-val">5</span>
          </div>
          <div class="matrix-ctrl-row">
            <label class="matrix-ctrl-label" for="matrix-size">Char Size</label>
            <input type="range" id="matrix-size" min="8" max="28" value="14"
                   style="flex:1;accent-color:var(--accent);" aria-label="Character size" />
            <span class="matrix-ctrl-val" id="matrix-size-val">14</span>
          </div>
          <div class="matrix-ctrl-row">
            <label class="matrix-ctrl-label" for="matrix-density">Density</label>
            <input type="range" id="matrix-density" min="1" max="10" value="5"
                   style="flex:1;accent-color:var(--accent);" aria-label="Rain density" />
            <span class="matrix-ctrl-val" id="matrix-density-val">5</span>
          </div>
          <div class="matrix-ctrl-row" style="gap:8px;margin-top:4px;">
            <button class="win-toolbar-btn" id="matrix-pause">⏸ Pause</button>
            <button class="win-toolbar-btn" id="matrix-reset">↺ Reset</button>
            <button class="win-toolbar-btn" id="matrix-wallpaper">🖼️ Set Wallpaper</button>
          </div>
          <div class="matrix-ctrl-row" style="justify-content:center;margin-top:4px;">
            <span id="matrix-wp-status" style="font-size:0.75rem;color:var(--text-secondary);"></span>
          </div>
        </div>
      </div>`;
  }

  function initMatrix(el) {
    const canvas     = el.querySelector('#matrix-canvas');
    const pauseBtn   = el.querySelector('#matrix-pause');
    const resetBtn   = el.querySelector('#matrix-reset');
    const wpBtn      = el.querySelector('#matrix-wallpaper');
    const wpStatus   = el.querySelector('#matrix-wp-status');
    const speedInput = el.querySelector('#matrix-speed');
    const sizeInput  = el.querySelector('#matrix-size');
    const densInput  = el.querySelector('#matrix-density');
    const colorBtns  = el.querySelectorAll('.matrix-color-btn');

    let ctx        = canvas.getContext('2d');
    let drops      = [];
    let fontSize   = 14;
    let speed      = 5;
    let density    = 5;
    let paused     = false;
    let running    = true;
    let rafId      = null;
    let color      = { ...PRESETS.green };
    let wpActive   = false;

    function resize() {
      canvas.width  = canvas.offsetWidth  || 500;
      canvas.height = canvas.offsetHeight || 340;
      initDrops();
    }

    function initDrops() {
      const cols = Math.floor(canvas.width / fontSize);
      drops = Array.from({ length: cols }, () => Math.random() * -30 | 0);
    }

    function draw() {
      if (!running) return;
      if (!paused) {
        // Fade with semi-transparent black — lower alpha = longer trails
        ctx.fillStyle = `rgba(0,0,0,${0.04 + (10 - density) * 0.005})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = `bold ${fontSize}px monospace`;

        for (let i = 0; i < drops.length; i++) {
          const ch = CHARS[Math.random() * CHARS.length | 0];
          const x  = i * fontSize;
          const y  = drops[i] * fontSize;

          // Occasional bright head
          const isHead = Math.random() > 0.93;
          ctx.fillStyle   = isHead ? color.head : color.trail;
          ctx.shadowColor = color.glow;
          ctx.shadowBlur  = isHead ? 12 : 4;
          ctx.fillText(ch, x, y);

          if (y > canvas.height && Math.random() > (0.99 - density * 0.003)) {
            drops[i] = 0;
          }
          drops[i] += speed * 0.12;
        }
      }

      rafId = requestAnimationFrame(draw);
    }

    // Sync wallpaper settings
    function syncWp() {
      wpFontSize = fontSize;
      wpColor    = { ...color };
      wpSpeed    = speed;
    }

    resize();
    draw();

    /* Pause / Resume */
    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      pauseBtn.textContent = paused ? '▶ Resume' : '⏸ Pause';
    });

    /* Reset */
    resetBtn.addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      initDrops();
    });

    /* Wallpaper toggle */
    wpBtn.addEventListener('click', () => {
      wpActive = !wpActive;
      syncWp();
      if (wpActive) {
        startWallpaperMatrix();
        wpStatus.textContent = '✅ Matrix wallpaper active';
        wpBtn.classList.add('active');
      } else {
        stopWallpaperMatrix();
        // Restore current wallpaper gradient
        applyWallpaper(NightOS.settings.wallpaper);
        wpStatus.textContent = '';
        wpBtn.classList.remove('active');
      }
    });

    /* Speed */
    speedInput.addEventListener('input', () => {
      speed = Number(speedInput.value);
      el.querySelector('#matrix-speed-val').textContent = speed;
      if (wpActive) syncWp();
    });

    /* Char size */
    sizeInput.addEventListener('input', () => {
      fontSize = Number(sizeInput.value);
      el.querySelector('#matrix-size-val').textContent = fontSize;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      initDrops();
      if (wpActive) { syncWp(); startWallpaperMatrix(); }
    });

    /* Density */
    densInput.addEventListener('input', () => {
      density = Number(densInput.value);
      el.querySelector('#matrix-density-val').textContent = density;
      if (wpActive) syncWp();
    });

    /* Color presets */
    colorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        colorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        color = { ...PRESETS[btn.dataset.color] };
        if (wpActive) { syncWp(); startWallpaperMatrix(); }
      });
    });

    /* Stop when window is destroyed */
    const observer = new MutationObserver(() => {
      if (!document.contains(el)) {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        if (wpActive) {
          stopWallpaperMatrix();
          applyWallpaper(NightOS.settings.wallpaper);
        }
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    /* Resize canvas when window size changes */
    const resizeObs = new ResizeObserver(() => { resize(); });
    resizeObs.observe(canvas);
  }

  NightOS.registerApp('matrix', {
    title: 'Matrix Rain',
    icon: '🟩',
    open,
  });
})();
