/**
 * NightOS — Snake Game
 * Classic Snake with score, high-score, levels, keyboard + touch/swipe controls.
 */

'use strict';

(function () {
  const GRID = 20;  // cells per row/col
  const BASE_INTERVAL = 150; // ms per tick at level 1

  const DIRECTIONS = { ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0],
                        w:[0,-1], s:[0,1], a:[-1,0], d:[1,0] };

  function open() {
    const el = WindowManager.create({
      id: 'snake',
      title: 'Snake',
      icon: '🐍',
      width: 460,
      height: 520,
      resizable: false,
      content: buildUI(),
    });
    initSnake(el);
  }

  function buildUI() {
    return `
      <div class="snake-layout">
        <div class="snake-header">
          <div class="snake-score-box">
            <span class="snake-score-label">Score</span>
            <span class="snake-score-val" id="snake-score">0</span>
          </div>
          <div class="snake-score-box">
            <span class="snake-score-label">Level</span>
            <span class="snake-score-val" id="snake-level">1</span>
          </div>
          <div class="snake-score-box">
            <span class="snake-score-label">Best</span>
            <span class="snake-score-val" id="snake-hiscore">0</span>
          </div>
        </div>
        <canvas id="snake-canvas" class="snake-canvas"
                aria-label="Snake game" role="img" tabindex="0"></canvas>
        <div class="snake-controls">
          <button class="win-toolbar-btn" id="snake-start">▶ Start</button>
          <button class="win-toolbar-btn" id="snake-pause">⏸ Pause</button>
          <button class="win-toolbar-btn" id="snake-restart">↺ Restart</button>
        </div>
        <!-- Touch D-pad -->
        <div class="snake-dpad" aria-label="Direction controls">
          <button class="dpad-btn dpad-up"    data-dir="ArrowUp"    aria-label="Up">▲</button>
          <button class="dpad-btn dpad-left"  data-dir="ArrowLeft"  aria-label="Left">◀</button>
          <button class="dpad-btn dpad-right" data-dir="ArrowRight" aria-label="Right">▶</button>
          <button class="dpad-btn dpad-down"  data-dir="ArrowDown"  aria-label="Down">▼</button>
        </div>
      </div>`;
  }

  function initSnake(el) {
    const canvas    = el.querySelector('#snake-canvas');
    const scoreEl   = el.querySelector('#snake-score');
    const levelEl   = el.querySelector('#snake-level');
    const hiscoreEl = el.querySelector('#snake-hiscore');
    const startBtn  = el.querySelector('#snake-start');
    const pauseBtn  = el.querySelector('#snake-pause');
    const restartBtn= el.querySelector('#snake-restart');
    const ctx       = canvas.getContext('2d');

    // Size canvas
    const SIZE = Math.min(380, 380);
    canvas.width  = SIZE;
    canvas.height = SIZE;
    const CELL = SIZE / GRID;

    let snake, dir, nextDir, food, score, level, hiscore, running, paused, intervalId;

    hiscore = parseInt(localStorage.getItem('nightos_snake_hiscore') || '0', 10);
    if (hiscoreEl) hiscoreEl.textContent = hiscore;

    function reset() {
      snake   = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      dir     = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      score   = 0;
      level   = 1;
      running = false;
      paused  = false;
      placeFood();
      updateUI();
      drawGame();
    }

    function placeFood() {
      let fx, fy;
      do {
        fx = Math.floor(Math.random() * GRID);
        fy = Math.floor(Math.random() * GRID);
      } while (snake.some(s => s.x === fx && s.y === fy));
      food = { x: fx, y: fy };
    }

    function updateUI() {
      if (scoreEl)  scoreEl.textContent  = score;
      if (levelEl)  levelEl.textContent  = level;
      if (hiscoreEl) hiscoreEl.textContent = hiscore;
    }

    function tick() {
      if (!running || paused) return;

      dir = { ...nextDir };
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      // Wall collision
      if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
        gameOver(); return;
      }
      // Self collision
      if (snake.some(s => s.x === head.x && s.y === head.y)) {
        gameOver(); return;
      }

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        score += 10 * level;
        if (score > hiscore) {
          hiscore = score;
          localStorage.setItem('nightos_snake_hiscore', hiscore);
        }
        // Level up every 5 foods
        if (score % (50 * level) === 0) {
          level++;
          restartInterval();
        }
        placeFood();
      } else {
        snake.pop();
      }

      updateUI();
      drawGame();
    }

    function restartInterval() {
      if (intervalId) clearInterval(intervalId);
      const interval = Math.max(60, BASE_INTERVAL - (level - 1) * 12);
      intervalId = setInterval(tick, interval);
    }

    function startGame() {
      if (running) return;
      running = true;
      paused  = false;
      restartInterval();
    }

    function pauseGame() {
      if (!running) return;
      paused = !paused;
      pauseBtn.textContent = paused ? '▶ Resume' : '⏸ Pause';
      if (!paused) drawGame();
    }

    function gameOver() {
      running = false;
      if (intervalId) clearInterval(intervalId);
      drawGame(true);
      showNotification('Snake', `Game over! Score: ${score}`);
    }

    function drawGame(over = false) {
      // Background grid
      ctx.fillStyle = '#0a0e14';
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Grid dots
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for (let x = 0; x < GRID; x++) {
        for (let y = 0; y < GRID; y++) {
          ctx.fillRect(x * CELL + CELL/2 - 1, y * CELL + CELL/2 - 1, 2, 2);
        }
      }

      // Food — pulsing red dot
      ctx.save();
      ctx.shadowColor = '#ff3b30';
      ctx.shadowBlur  = 12;
      ctx.fillStyle   = '#ff3b30';
      ctx.beginPath();
      ctx.arc(food.x * CELL + CELL/2, food.y * CELL + CELL/2, CELL * 0.4, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();

      // Snake
      snake.forEach((seg, i) => {
        const ratio = i / snake.length;
        const g = Math.round(180 + (1 - ratio) * 75);
        ctx.save();
        ctx.shadowColor = i === 0 ? '#4ade80' : 'transparent';
        ctx.shadowBlur  = i === 0 ? 10 : 0;
        ctx.fillStyle   = i === 0 ? '#4ade80' : `rgb(0,${g},60)`;
        ctx.beginPath();
        ctx.roundRect(
          seg.x * CELL + 1, seg.y * CELL + 1,
          CELL - 2, CELL - 2, 3
        );
        ctx.fill();
        ctx.restore();
      });

      // Game Over overlay
      if (over) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, SIZE, SIZE);
        ctx.fillStyle = '#ff3b30';
        ctx.font = 'bold 28px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', SIZE/2, SIZE/2 - 18);
        ctx.fillStyle = 'white';
        ctx.font = '16px system-ui';
        ctx.fillText(`Score: ${score}`, SIZE/2, SIZE/2 + 14);
        ctx.fillText('Press Restart to play again', SIZE/2, SIZE/2 + 38);
        ctx.textAlign = 'left';
      }

      // Overlay before start
      if (!running && !over) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, SIZE, SIZE);
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 26px system-ui';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur  = 12;
        ctx.fillText('🐍 SNAKE', SIZE/2, SIZE/2 - 16);
        ctx.shadowBlur  = 0;
        ctx.fillStyle = 'white';
        ctx.font = '14px system-ui';
        ctx.fillText('Press Start or arrow keys', SIZE/2, SIZE/2 + 12);
        ctx.textAlign = 'left';
      }
    }

    /* ---- Keyboard ---- */
    const keyHandler = e => {
      const d = DIRECTIONS[e.key];
      if (d) {
        e.preventDefault();
        const [dx, dy] = d;
        // Prevent reversing
        if (dx === -dir.x && dy === -dir.y) return;
        nextDir = { x: dx, y: dy };
        if (!running) startGame();
      }
      if (e.key === ' ') { e.preventDefault(); pauseGame(); }
    };

    el.addEventListener('keydown', keyHandler);
    canvas.addEventListener('click', () => canvas.focus());
    canvas.addEventListener('keydown', keyHandler);

    /* ---- D-pad (touch) ---- */
    el.querySelectorAll('.dpad-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = DIRECTIONS[btn.dataset.dir];
        if (!d) return;
        const [dx, dy] = d;
        if (dx === -dir.x && dy === -dir.y) return;
        nextDir = { x: dx, y: dy };
        if (!running) startGame();
      });
    });

    /* ---- Touch swipe ---- */
    let touchStartX = 0, touchStartY = 0;
    canvas.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    canvas.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        nextDir = dx > 0 ? { x:1, y:0 } : { x:-1, y:0 };
      } else {
        nextDir = dy > 0 ? { x:0, y:1 } : { x:0, y:-1 };
      }
      if (!running) startGame();
    }, { passive: true });

    /* ---- Buttons ---- */
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', pauseGame);
    restartBtn.addEventListener('click', () => {
      if (intervalId) clearInterval(intervalId);
      reset();
    });

    reset();

    /* ---- Cleanup on window close ---- */
    const observer = new MutationObserver(() => {
      if (!document.body.contains(el)) {
        if (intervalId) clearInterval(intervalId);
        observer.disconnect();
      }
    });
    observer.observe(document.getElementById('window-container') || document.body, { childList: true, subtree: true });
  }

  NightOS.registerApp('snake', {
    title: 'Snake',
    icon: '🐍',
    open,
  });
})();
