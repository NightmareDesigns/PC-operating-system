/**
 * NightOS — Music Player App
 * Upload and play audio files.
 * Shows a canvas spectrum/waveform visualizer using Web Audio API.
 */

'use strict';

(function () {
  function open() {
    const el = WindowManager.create({
      id: 'musicplayer',
      title: 'Music Player',
      icon: '🎵',
      width: 480,
      height: 420,
      resizable: false,
      content: buildUI(),
    });
    initPlayer(el);
  }

  function buildUI() {
    return `
      <div class="music-layout">
        <!-- Album art / visualizer -->
        <div class="music-vis-wrap">
          <canvas id="music-canvas" class="music-canvas"
                  aria-label="Audio visualizer" role="img"></canvas>
          <div class="music-disc" id="music-disc" aria-hidden="true">🎵</div>
        </div>
        <!-- Track info -->
        <div class="music-info">
          <div class="music-title" id="music-title">No track loaded</div>
          <div class="music-artist" id="music-artist">Open a file to start</div>
        </div>
        <!-- Progress -->
        <div class="music-progress-wrap">
          <span class="music-time" id="music-elapsed">0:00</span>
          <input type="range" id="music-seek" class="music-seek" min="0" max="100" value="0"
                 aria-label="Seek position" step="0.1" />
          <span class="music-time" id="music-duration">0:00</span>
        </div>
        <!-- Controls -->
        <div class="music-controls">
          <button class="music-btn" id="music-prev"    title="Previous" aria-label="Previous">⏮</button>
          <button class="music-btn music-play" id="music-play" title="Play/Pause" aria-label="Play">▶</button>
          <button class="music-btn" id="music-next"    title="Next"     aria-label="Next">⏭</button>
          <button class="music-btn" id="music-shuffle" title="Shuffle"  aria-label="Shuffle">🔀</button>
          <button class="music-btn" id="music-repeat"  title="Repeat"   aria-label="Repeat">🔁</button>
        </div>
        <!-- Volume -->
        <div class="music-volume-row">
          <span style="font-size:1rem;">🔊</span>
          <input type="range" id="music-volume" class="music-volume" min="0" max="100" value="80"
                 aria-label="Volume" style="flex:1;accent-color:var(--accent);" />
        </div>
        <!-- Playlist -->
        <div class="music-playlist-wrap">
          <div class="music-playlist-header">
            <span>Playlist</span>
            <button class="win-toolbar-btn" id="music-add">+ Add Files</button>
            <button class="win-toolbar-btn" id="music-clear-pl">🗑️ Clear</button>
          </div>
          <div class="music-playlist" id="music-playlist" role="list" aria-label="Playlist"></div>
        </div>
      </div>`;
  }

  function initPlayer(el) {
    const canvas     = el.querySelector('#music-canvas');
    const ctx        = canvas.getContext('2d');
    const disc       = el.querySelector('#music-disc');
    const titleEl    = el.querySelector('#music-title');
    const artistEl   = el.querySelector('#music-artist');
    const seekEl     = el.querySelector('#music-seek');
    const elapsedEl  = el.querySelector('#music-elapsed');
    const durEl      = el.querySelector('#music-duration');
    const playBtn    = el.querySelector('#music-play');
    const prevBtn    = el.querySelector('#music-prev');
    const nextBtn    = el.querySelector('#music-next');
    const shuffleBtn = el.querySelector('#music-shuffle');
    const repeatBtn  = el.querySelector('#music-repeat');
    const volEl      = el.querySelector('#music-volume');
    const addBtn     = el.querySelector('#music-add');
    const clearBtn   = el.querySelector('#music-clear-pl');
    const playlist   = el.querySelector('#music-playlist');

    canvas.width  = 440;
    canvas.height = 120;

    let audioCtx = null, analyser = null, source = null, dataArr = null;
    let audio        = new Audio();
    let tracks       = [];     // { name, url }
    let currentIdx   = -1;
    let shuffle      = false;
    let repeat       = false;
    let rafId        = null;
    let discRotation = 0;
    let running      = true;

    audio.volume = 0.8;

    /* ---- Web Audio setup ---- */
    function setupAnalyser() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser  = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        dataArr   = new Uint8Array(analyser.frequencyBinCount);
        source    = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
      }
    }

    /* ---- Visualizer ---- */
    function drawViz() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (analyser && !audio.paused) {
        analyser.getByteFrequencyData(dataArr);
        const W    = canvas.width;
        const H    = canvas.height;
        const bars = dataArr.length;
        const bw   = W / bars;

        for (let i = 0; i < bars; i++) {
          const v = dataArr[i] / 255;
          const bh = v * H;
          // Gradient from accent blue to purple
          const r = Math.round(79 + v * 100);
          const g = Math.round(142 + v * 50);
          const b = 247;
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(i * bw, H - bh, bw - 1, bh);
        }
      } else {
        // Idle waveform — gentle sine
        ctx.strokeStyle = 'rgba(79,142,247,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const t = Date.now() / 1000;
        for (let x = 0; x < canvas.width; x++) {
          const y = canvas.height / 2 + Math.sin(x * 0.04 + t) * 14 +
                    Math.sin(x * 0.02 + t * 0.7) * 8;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Spinning disc
      if (!audio.paused) {
        discRotation += 0.8;
        disc.style.transform = `rotate(${discRotation}deg)`;
      }

      rafId = requestAnimationFrame(drawViz);
    }

    drawViz();

    /* ---- Load track ---- */
    function loadTrack(idx) {
      if (idx < 0 || idx >= tracks.length) return;
      currentIdx = idx;
      const t = tracks[idx];
      audio.src = t.url;
      if (titleEl)  titleEl.textContent  = t.name;
      if (artistEl) artistEl.textContent = 'Local File';
      highlightPlaylist();
    }

    function play() {
      if (tracks.length === 0) {
        showNotification('Music Player', 'Add files first (+ Add Files).');
        return;
      }
      if (currentIdx === -1) loadTrack(0);
      if (!audioCtx) setupAnalyser();
      audioCtx.resume();
      audio.play().catch(() => {});
      playBtn.textContent = '⏸';
    }

    function pause() {
      audio.pause();
      playBtn.textContent = '▶';
    }

    function nextTrack() {
      if (tracks.length === 0) return;
      let idx;
      if (shuffle) {
        idx = Math.floor(Math.random() * tracks.length);
      } else {
        idx = (currentIdx + 1) % tracks.length;
      }
      loadTrack(idx);
      play();
    }

    function prevTrack() {
      if (tracks.length === 0) return;
      const idx = (currentIdx - 1 + tracks.length) % tracks.length;
      loadTrack(idx);
      play();
    }

    function highlightPlaylist() {
      playlist.querySelectorAll('.music-pl-item').forEach((item, i) => {
        item.classList.toggle('active', i === currentIdx);
      });
    }

    function renderPlaylist() {
      playlist.innerHTML = '';
      if (tracks.length === 0) {
        playlist.innerHTML = '<div style="padding:10px;font-size:0.8rem;color:var(--text-secondary);">No tracks — add files above</div>';
        return;
      }
      tracks.forEach((t, i) => {
        const item = document.createElement('div');
        item.className = `music-pl-item${i === currentIdx ? ' active' : ''}`;
        item.setAttribute('role', 'listitem');
        item.textContent = `${i + 1}. ${t.name}`;
        item.addEventListener('dblclick', () => { loadTrack(i); play(); });
        item.addEventListener('click', () => { loadTrack(i); });
        playlist.appendChild(item);
      });
    }

    /* ---- Audio events ---- */
    audio.addEventListener('ended', () => {
      if (repeat) {
        audio.currentTime = 0;
        play();
      } else {
        nextTrack();
      }
    });

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      seekEl.value = pct;
      if (elapsedEl) elapsedEl.textContent = formatTime(audio.currentTime);
      if (durEl)     durEl.textContent     = formatTime(audio.duration);
    });

    audio.addEventListener('loadedmetadata', () => {
      if (durEl) durEl.textContent = formatTime(audio.duration);
    });

    /* ---- Controls ---- */
    playBtn.addEventListener('click', () => {
      if (audio.paused) play(); else pause();
    });
    prevBtn.addEventListener('click', prevTrack);
    nextBtn.addEventListener('click', nextTrack);

    shuffleBtn.addEventListener('click', () => {
      shuffle = !shuffle;
      shuffleBtn.style.opacity = shuffle ? '1' : '0.4';
    });

    repeatBtn.addEventListener('click', () => {
      repeat = !repeat;
      repeatBtn.style.opacity = repeat ? '1' : '0.4';
    });

    seekEl.addEventListener('input', () => {
      if (audio.duration) {
        audio.currentTime = (seekEl.value / 100) * audio.duration;
      }
    });

    volEl.addEventListener('input', () => {
      audio.volume = Number(volEl.value) / 100;
    });

    /* ---- Add files ---- */
    addBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';
      input.multiple = true;
      input.addEventListener('change', () => {
        Array.from(input.files).forEach(f => {
          tracks.push({ name: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f) });
        });
        renderPlaylist();
        if (tracks.length > 0 && currentIdx === -1) loadTrack(0);
      });
      input.click();
    });

    clearBtn.addEventListener('click', () => {
      pause();
      tracks.forEach(t => { try { URL.revokeObjectURL(t.url); } catch(_) {} });
      tracks = [];
      currentIdx = -1;
      audio.src = '';
      if (titleEl) titleEl.textContent = 'No track loaded';
      if (artistEl) artistEl.textContent = 'Open a file to start';
      renderPlaylist();
    });

    /* ---- Stop when window destroyed ---- */
    const obs = new MutationObserver(() => {
      if (!document.contains(el)) {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        pause();
        if (audioCtx) audioCtx.close().catch(() => {});
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    renderPlaylist();
  }

  function formatTime(s) {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  NightOS.registerApp('musicplayer', {
    title: 'Music Player',
    icon: '🎵',
    open,
  });
})();
