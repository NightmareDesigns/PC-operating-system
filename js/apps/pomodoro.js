/**
 * NightmareOS — Pomodoro Timer
 * Productivity timer with work/break cycles, session counter, and audio alerts.
 */

'use strict';

(function () {
  function open() {
    var el = WindowManager.create({
      id: 'pomodoro',
      title: 'Pomodoro Timer',
      icon: '🍅',
      width: 380,
      height: 480,
      resizable: false,
      content: buildUI(),
    });
    initPomodoro(el);
  }

  function buildUI() {
    return [
      '<div class="pomo-app">',
      '  <div class="pomo-mode-btns">',
      '    <button class="pomo-mode active" data-mode="work">Work</button>',
      '    <button class="pomo-mode" data-mode="short">Short Break</button>',
      '    <button class="pomo-mode" data-mode="long">Long Break</button>',
      '  </div>',
      '  <div class="pomo-ring">',
      '    <svg viewBox="0 0 200 200" class="pomo-svg">',
      '      <circle cx="100" cy="100" r="90" class="pomo-track"/>',
      '      <circle cx="100" cy="100" r="90" class="pomo-progress" id="pomo-progress"',
      '              stroke-dasharray="565.49" stroke-dashoffset="0"/>',
      '    </svg>',
      '    <div class="pomo-time" id="pomo-time" aria-live="polite">25:00</div>',
      '  </div>',
      '  <div class="pomo-controls">',
      '    <button class="pomo-btn" id="pomo-start">▶ Start</button>',
      '    <button class="pomo-btn" id="pomo-reset">↺ Reset</button>',
      '  </div>',
      '  <div class="pomo-sessions">',
      '    <span>Sessions completed:</span>',
      '    <span class="pomo-count" id="pomo-count">0</span>',
      '  </div>',
      '  <div class="pomo-settings">',
      '    <label>Work: <input type="number" id="pomo-work-min" value="25" min="1" max="90" class="pomo-input"/> min</label>',
      '    <label>Short: <input type="number" id="pomo-short-min" value="5" min="1" max="30" class="pomo-input"/> min</label>',
      '    <label>Long: <input type="number" id="pomo-long-min" value="15" min="1" max="60" class="pomo-input"/> min</label>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  function initPomodoro(el) {
    var durations = { work: 25, short: 5, long: 15 };
    var mode = 'work';
    var total = durations[mode] * 60;
    var remaining = total;
    var running = false;
    var timer = null;
    var sessions = 0;

    var timeEl = el.querySelector('#pomo-time');
    var progressEl = el.querySelector('#pomo-progress');
    var startBtn = el.querySelector('#pomo-start');
    var countEl = el.querySelector('#pomo-count');
    var circumference = 2 * Math.PI * 90; // 565.49

    function formatTime(sec) {
      var m = Math.floor(sec / 60);
      var s = sec % 60;
      return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function updateDisplay() {
      timeEl.textContent = formatTime(remaining);
      var offset = circumference * (1 - remaining / total);
      progressEl.setAttribute('stroke-dashoffset', String(offset));
    }

    function tick() {
      if (remaining <= 0) {
        clearInterval(timer);
        timer = null;
        running = false;
        startBtn.textContent = '▶ Start';
        if (mode === 'work') {
          sessions++;
          countEl.textContent = String(sessions);
          showNotification('Pomodoro', 'Work session complete! Time for a break. 🎉');
        } else {
          showNotification('Pomodoro', 'Break is over! Ready to focus? 💪');
        }
        playAlertBeep();
        return;
      }
      remaining--;
      updateDisplay();
    }

    function playAlertBeep() {
      try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.3;
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
        setTimeout(function () {
          var osc2 = ctx.createOscillator();
          var gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.value = 880;
          gain2.gain.value = 0.3;
          osc2.start();
          osc2.stop(ctx.currentTime + 0.25);
        }, 350);
      } catch (_e) { /* AudioContext not available */ }
    }

    startBtn.addEventListener('click', function () {
      if (running) {
        clearInterval(timer);
        timer = null;
        running = false;
        startBtn.textContent = '▶ Start';
      } else {
        running = true;
        startBtn.textContent = '⏸ Pause';
        timer = setInterval(tick, 1000);
      }
    });

    el.querySelector('#pomo-reset').addEventListener('click', function () {
      clearInterval(timer);
      timer = null;
      running = false;
      startBtn.textContent = '▶ Start';
      total = durations[mode] * 60;
      remaining = total;
      updateDisplay();
    });

    el.querySelectorAll('.pomo-mode').forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.querySelectorAll('.pomo-mode').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        mode = btn.dataset.mode;
        clearInterval(timer);
        timer = null;
        running = false;
        startBtn.textContent = '▶ Start';
        total = durations[mode] * 60;
        remaining = total;
        updateDisplay();
      });
    });

    // Settings inputs
    el.querySelector('#pomo-work-min').addEventListener('change', function (e) {
      durations.work = Math.max(1, Math.min(90, parseInt(e.target.value, 10) || 25));
      if (mode === 'work' && !running) { total = durations.work * 60; remaining = total; updateDisplay(); }
    });
    el.querySelector('#pomo-short-min').addEventListener('change', function (e) {
      durations.short = Math.max(1, Math.min(30, parseInt(e.target.value, 10) || 5));
      if (mode === 'short' && !running) { total = durations.short * 60; remaining = total; updateDisplay(); }
    });
    el.querySelector('#pomo-long-min').addEventListener('change', function (e) {
      durations.long = Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 15));
      if (mode === 'long' && !running) { total = durations.long * 60; remaining = total; updateDisplay(); }
    });

    updateDisplay();
  }

  NightOS.registerApp('pomodoro', {
    title: 'Pomodoro Timer',
    icon: '🍅',
    open: open,
  });
})();
