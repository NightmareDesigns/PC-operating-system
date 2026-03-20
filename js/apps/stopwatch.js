/**
 * NightmareOS — Stopwatch & Timer App
 * Provides a stopwatch with lap times and a countdown timer.
 */

'use strict';

(function () {
  function open() {
    const el = WindowManager.create({
      id: 'stopwatch',
      title: 'Stopwatch & Timer',
      icon: '⏱️',
      width: 400,
      height: 480,
      content: buildUI(),
    });
    initStopwatch(el);
  }

  function buildUI() {
    return `
      <div class="stopwatch-app">
        <div class="stopwatch-tabs">
          <button class="stopwatch-tab active" data-tab="stopwatch">⏱️ Stopwatch</button>
          <button class="stopwatch-tab" data-tab="timer">⏳ Timer</button>
        </div>
        <div class="stopwatch-panel" id="sw-stopwatch-panel">
          <div class="stopwatch-display" id="sw-display">00:00.00</div>
          <div class="stopwatch-controls">
            <button class="stopwatch-btn sw-start" id="sw-start">▶ Start</button>
            <button class="stopwatch-btn sw-lap" id="sw-lap" disabled>⏲ Lap</button>
            <button class="stopwatch-btn sw-reset" id="sw-reset" disabled>↺ Reset</button>
          </div>
          <div class="stopwatch-laps" id="sw-laps" role="list" aria-label="Lap times"></div>
        </div>
        <div class="stopwatch-panel hidden" id="sw-timer-panel">
          <div class="timer-inputs">
            <label>
              <input type="number" id="timer-min" class="timer-input" min="0" max="99" value="5" aria-label="Minutes" />
              <span>min</span>
            </label>
            <label>
              <input type="number" id="timer-sec" class="timer-input" min="0" max="59" value="0" aria-label="Seconds" />
              <span>sec</span>
            </label>
          </div>
          <div class="stopwatch-display" id="timer-display">05:00</div>
          <div class="stopwatch-controls">
            <button class="stopwatch-btn sw-start" id="timer-start">▶ Start</button>
            <button class="stopwatch-btn sw-reset" id="timer-reset" disabled>↺ Reset</button>
          </div>
          <div class="timer-status" id="timer-status"></div>
        </div>
      </div>`;
  }

  function initStopwatch(el) {
    /* ---- Tab switching ---- */
    el.querySelectorAll('.stopwatch-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        el.querySelectorAll('.stopwatch-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        el.querySelector('#sw-stopwatch-panel').classList.toggle('hidden', tab.dataset.tab !== 'stopwatch');
        el.querySelector('#sw-timer-panel').classList.toggle('hidden', tab.dataset.tab !== 'timer');
      });
    });

    /* ---- Stopwatch ---- */
    let swRunning = false, swStart = 0, swElapsed = 0, swInterval = null;
    let lapCount = 0, lastLapTime = 0;
    const swDisplay = el.querySelector('#sw-display');
    const swLaps = el.querySelector('#sw-laps');
    const startBtn = el.querySelector('#sw-start');
    const lapBtn = el.querySelector('#sw-lap');
    const resetBtn = el.querySelector('#sw-reset');

    function formatMs(ms) {
      const totalSec = Math.floor(ms / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      const cs = Math.floor((ms % 1000) / 10);
      return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
    }

    function updateSwDisplay() {
      const now = swRunning ? (performance.now() - swStart + swElapsed) : swElapsed;
      swDisplay.textContent = formatMs(now);
    }

    startBtn.addEventListener('click', () => {
      if (swRunning) {
        // Pause
        swElapsed += performance.now() - swStart;
        swRunning = false;
        clearInterval(swInterval);
        startBtn.textContent = '▶ Start';
        lapBtn.disabled = true;
      } else {
        // Start
        swStart = performance.now();
        swRunning = true;
        swInterval = setInterval(updateSwDisplay, 30);
        startBtn.textContent = '⏸ Pause';
        lapBtn.disabled = false;
        resetBtn.disabled = false;
      }
    });

    lapBtn.addEventListener('click', () => {
      if (!swRunning) return;
      lapCount++;
      const total = performance.now() - swStart + swElapsed;
      const lapTime = total - lastLapTime;
      lastLapTime = total;
      const lapEl = document.createElement('div');
      lapEl.className = 'stopwatch-lap-item';
      lapEl.setAttribute('role', 'listitem');
      lapEl.innerHTML = `<span>Lap ${lapCount}</span><span>${formatMs(lapTime)}</span><span>${formatMs(total)}</span>`;
      swLaps.insertBefore(lapEl, swLaps.firstChild);
    });

    resetBtn.addEventListener('click', () => {
      swRunning = false;
      clearInterval(swInterval);
      swElapsed = 0;
      lapCount = 0;
      lastLapTime = 0;
      swDisplay.textContent = '00:00.00';
      startBtn.textContent = '▶ Start';
      lapBtn.disabled = true;
      resetBtn.disabled = true;
      swLaps.innerHTML = '';
    });

    /* ---- Timer ---- */
    let timerInterval = null, timerRunning = false, timerRemaining = 0;
    const timerDisplay = el.querySelector('#timer-display');
    const timerStartBtn = el.querySelector('#timer-start');
    const timerResetBtn = el.querySelector('#timer-reset');
    const timerStatus = el.querySelector('#timer-status');
    const timerMin = el.querySelector('#timer-min');
    const timerSec = el.querySelector('#timer-sec');

    function formatTimer(sec) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function getTimerTotal() {
      return (parseInt(timerMin.value, 10) || 0) * 60 + (parseInt(timerSec.value, 10) || 0);
    }

    function updateTimerDisplay() {
      timerDisplay.textContent = formatTimer(timerRemaining);
    }

    timerMin.addEventListener('input', () => {
      if (!timerRunning) { timerRemaining = getTimerTotal(); updateTimerDisplay(); }
    });
    timerSec.addEventListener('input', () => {
      if (!timerRunning) { timerRemaining = getTimerTotal(); updateTimerDisplay(); }
    });

    timerStartBtn.addEventListener('click', () => {
      if (timerRunning) {
        // Pause
        timerRunning = false;
        clearInterval(timerInterval);
        timerStartBtn.textContent = '▶ Start';
      } else {
        if (timerRemaining <= 0) timerRemaining = getTimerTotal();
        if (timerRemaining <= 0) return;
        timerRunning = true;
        timerStartBtn.textContent = '⏸ Pause';
        timerResetBtn.disabled = false;
        timerStatus.textContent = '';
        timerInterval = setInterval(() => {
          timerRemaining--;
          updateTimerDisplay();
          if (timerRemaining <= 0) {
            clearInterval(timerInterval);
            timerRunning = false;
            timerStartBtn.textContent = '▶ Start';
            timerStatus.textContent = '⏰ Time is up!';
            timerDisplay.classList.add('timer-done');
            setTimeout(() => timerDisplay.classList.remove('timer-done'), 3000);
            if (typeof showNotification === 'function')
              showNotification('Timer', '⏰ Time is up!');
          }
        }, 1000);
      }
    });

    timerResetBtn.addEventListener('click', () => {
      clearInterval(timerInterval);
      timerRunning = false;
      timerRemaining = getTimerTotal();
      updateTimerDisplay();
      timerStartBtn.textContent = '▶ Start';
      timerResetBtn.disabled = true;
      timerStatus.textContent = '';
    });
  }

  NightOS.registerApp('stopwatch', {
    title: 'Stopwatch & Timer',
    icon: '⏱️',
    open,
  });
})();
