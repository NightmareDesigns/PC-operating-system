/**
 * NightOS — Clock App
 * Shows a digital clock, date, and analog clock face.
 */

'use strict';

(function () {
  function open() {
    const el = WindowManager.create({
      id: 'clock',
      title: 'Clock',
      icon: '🕐',
      width: 320,
      height: 360,
      resizable: false,
      content: buildUI(),
    });
    initClock(el);
  }

  function buildUI() {
    return `
      <div class="clock-app">
        <canvas id="clock-analog" class="clock-analog" width="200" height="200"
                aria-label="Analog clock face" role="img"></canvas>
        <div class="clock-time" id="clock-digital" aria-live="polite"></div>
        <div class="clock-date-str" id="clock-date" aria-live="polite"></div>
        <div class="clock-timezone" id="clock-tz"></div>
      </div>`;
  }

  function initClock(el) {
    const canvas  = el.querySelector('#clock-analog');
    const digital = el.querySelector('#clock-digital');
    const dateEl  = el.querySelector('#clock-date');
    const tzEl    = el.querySelector('#clock-tz');
    const ctx     = canvas ? canvas.getContext('2d') : null;

    let running = true;

    function drawAnalog(now) {
      if (!ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const r  = W * 0.44;

      ctx.clearRect(0, 0, W, H);

      // Background circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(79,142,247,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Hour marks
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const inner = i % 3 === 0 ? r * 0.82 : r * 0.88;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a) * (r * 0.95), cy + Math.sin(a) * (r * 0.95));
        ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = i % 3 === 0 ? 2 : 1;
        ctx.stroke();
      }

      const h = now.getHours() % 12;
      const m = now.getMinutes();
      const s = now.getSeconds();

      function drawHand(angle, length, width, color) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          cx + Math.cos(angle - Math.PI / 2) * length,
          cy + Math.sin(angle - Math.PI / 2) * length
        );
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Hour hand
      drawHand(
        ((h + m / 60) / 12) * Math.PI * 2,
        r * 0.55, 4, 'rgba(255,255,255,0.9)'
      );

      // Minute hand
      drawHand(
        ((m + s / 60) / 60) * Math.PI * 2,
        r * 0.78, 3, 'rgba(255,255,255,0.9)'
      );

      // Second hand
      drawHand(
        (s / 60) * Math.PI * 2,
        r * 0.84, 1.5, '#4f8ef7'
      );

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#4f8ef7';
      ctx.fill();
    }

    function tick() {
      if (!running) return;
      const now = new Date();

      if (digital) {
        digital.textContent = now.toLocaleTimeString([], {
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
      }
      if (dateEl) {
        dateEl.textContent = now.toLocaleDateString([], {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
      }
      if (tzEl) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        tzEl.textContent = tz || '';
      }

      drawAnalog(now);
      requestAnimationFrame(tick);
    }

    tick();

    // Stop animation when window is closed
    const observer = new MutationObserver(() => {
      if (!document.contains(el)) {
        running = false;
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  NightOS.registerApp('clock', {
    title: 'Clock',
    icon: '🕐',
    open,
  });
})();
