/**
 * NightmareOS — Video Player App
 * Upload and play local video files with playlist support.
 */

'use strict';

(function () {
  function open() {
    const el = WindowManager.create({
      id: 'videoplayer',
      title: 'Video Player',
      icon: '🎬',
      width: 720,
      height: 520,
      content: buildUI(),
    });
    initPlayer(el);
  }

  function buildUI() {
    return `
      <div class="vid-layout">
        <div class="vid-main">
          <div class="vid-screen-wrap" id="vid-screen-wrap">
            <video class="vid-screen" id="vid-screen" tabindex="0"
                   aria-label="Video player"></video>
            <div class="vid-overlay" id="vid-overlay">
              <div class="vid-overlay-icon" id="vid-overlay-icon">▶</div>
            </div>
            <div class="vid-drop-hint" id="vid-drop-hint">
              <div class="vid-drop-icon">🎬</div>
              <div>Drop video files here or click to open</div>
              <button class="browser-open-tab-btn" id="vid-open-btn" style="margin-top:12px;">Open Video Files</button>
            </div>
          </div>
          <div class="vid-controls">
            <div class="vid-progress-row">
              <span class="vid-time" id="vid-elapsed">0:00</span>
              <input type="range" id="vid-seek" class="vid-seek" min="0" max="100" value="0"
                     step="0.1" aria-label="Seek" />
              <span class="vid-time" id="vid-duration">0:00</span>
            </div>
            <div class="vid-btn-row">
              <button class="vid-btn" id="vid-prev" title="Previous" aria-label="Previous">⏮</button>
              <button class="vid-btn vid-play-btn" id="vid-play" title="Play/Pause" aria-label="Play">▶</button>
              <button class="vid-btn" id="vid-next" title="Next" aria-label="Next">⏭</button>
              <button class="vid-btn" id="vid-mute" title="Mute" aria-label="Mute">🔊</button>
              <input type="range" id="vid-volume" class="vid-vol-slider" min="0" max="100" value="80"
                     aria-label="Volume" />
              <button class="vid-btn" id="vid-fullscreen" title="Fullscreen" aria-label="Fullscreen"
                      style="margin-left:auto;">⛶</button>
            </div>
          </div>
        </div>
        <div class="vid-sidebar">
          <div class="vid-pl-header">
            <span>Playlist</span>
            <button class="win-toolbar-btn" id="vid-add">+ Add</button>
            <button class="win-toolbar-btn" id="vid-clear">🗑️</button>
          </div>
          <div class="vid-playlist" id="vid-playlist" role="list" aria-label="Playlist"></div>
        </div>
      </div>`;
  }

  function initPlayer(el) {
    const video      = el.querySelector('#vid-screen');
    const dropHint   = el.querySelector('#vid-drop-hint');
    const overlay    = el.querySelector('#vid-overlay');
    const overlayIcon= el.querySelector('#vid-overlay-icon');
    const openBtn    = el.querySelector('#vid-open-btn');
    const playBtn    = el.querySelector('#vid-play');
    const prevBtn    = el.querySelector('#vid-prev');
    const nextBtn    = el.querySelector('#vid-next');
    const muteBtn    = el.querySelector('#vid-mute');
    const fullBtn    = el.querySelector('#vid-fullscreen');
    const seekEl     = el.querySelector('#vid-seek');
    const volEl      = el.querySelector('#vid-volume');
    const elapsedEl  = el.querySelector('#vid-elapsed');
    const durEl      = el.querySelector('#vid-duration');
    const addBtn     = el.querySelector('#vid-add');
    const clearBtn   = el.querySelector('#vid-clear');
    const playlist   = el.querySelector('#vid-playlist');
    const screenWrap = el.querySelector('#vid-screen-wrap');

    let tracks = [];
    let current = -1;
    video.volume = 0.8;

    /* ---- File loading ---- */
    function loadFiles(files) {
      Array.from(files).forEach(f => {
        if (!f.type.startsWith('video/')) return;
        tracks.push({ name: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f) });
      });
      renderPlaylist();
      if (tracks.length > 0 && current === -1) loadTrack(0);
    }

    function loadTrack(idx) {
      if (idx < 0 || idx >= tracks.length) return;
      current = idx;
      video.src = tracks[idx].url;
      dropHint.style.display = 'none';
      renderPlaylist();
    }

    function play() {
      video.play().catch(() => {});
      playBtn.textContent = '⏸';
      overlayIcon.textContent = '⏸';
      showOverlayBriefly();
    }

    function pause() {
      video.pause();
      playBtn.textContent = '▶';
      overlayIcon.textContent = '▶';
    }

    function showOverlayBriefly() {
      overlay.style.opacity = '1';
      setTimeout(() => { overlay.style.opacity = '0'; }, 600);
    }

    /* ---- Playlist ---- */
    function renderPlaylist() {
      playlist.innerHTML = '';
      if (tracks.length === 0) {
        playlist.innerHTML = '<div style="color:var(--text-secondary);font-size:0.78rem;padding:10px;">No videos — add files</div>';
        return;
      }
      tracks.forEach((t, i) => {
        const item = document.createElement('div');
        item.className = `vid-pl-item${i === current ? ' active' : ''}`;
        item.setAttribute('role', 'listitem');
        item.textContent = `${i + 1}. ${t.name}`;
        item.addEventListener('dblclick', () => { loadTrack(i); play(); });
        item.addEventListener('click',    () => loadTrack(i));
        playlist.appendChild(item);
      });
    }

    /* ---- Video events ---- */
    video.addEventListener('timeupdate', () => {
      if (!video.duration) return;
      seekEl.value = (video.currentTime / video.duration) * 100;
      elapsedEl.textContent = fmtTime(video.currentTime);
      durEl.textContent     = fmtTime(video.duration);
    });

    video.addEventListener('loadedmetadata', () => {
      durEl.textContent = fmtTime(video.duration);
    });

    video.addEventListener('ended', () => {
      const next = current + 1;
      if (next < tracks.length) { loadTrack(next); play(); }
      else { playBtn.textContent = '▶'; }
    });

    video.addEventListener('click', () => {
      if (video.paused) play(); else pause();
    });

    /* ---- Controls ---- */
    playBtn.addEventListener('click', () => {
      if (tracks.length === 0) { openBtn.click(); return; }
      if (video.paused) play(); else pause();
    });

    prevBtn.addEventListener('click', () => {
      const idx = Math.max(0, current - 1);
      loadTrack(idx);
      play();
    });

    nextBtn.addEventListener('click', () => {
      const idx = Math.min(tracks.length - 1, current + 1);
      loadTrack(idx);
      play();
    });

    muteBtn.addEventListener('click', () => {
      video.muted = !video.muted;
      muteBtn.textContent = video.muted ? '🔇' : '🔊';
    });

    fullBtn.addEventListener('click', () => {
      if (video.requestFullscreen) video.requestFullscreen();
    });

    seekEl.addEventListener('input', () => {
      if (video.duration) video.currentTime = (seekEl.value / 100) * video.duration;
    });

    volEl.addEventListener('input', () => {
      video.volume = volEl.value / 100;
    });

    /* ---- File pickers ---- */
    function pickFiles() {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'video/*';
      inp.multiple = true;
      inp.addEventListener('change', () => loadFiles(inp.files));
      inp.click();
    }

    openBtn.addEventListener('click', pickFiles);
    addBtn.addEventListener('click',  pickFiles);

    clearBtn.addEventListener('click', () => {
      pause();
      tracks.forEach(t => { try { URL.revokeObjectURL(t.url); } catch(_) {} });
      tracks = [];
      current = -1;
      video.src = '';
      dropHint.style.display = '';
      renderPlaylist();
    });

    /* ---- Drag & drop ---- */
    screenWrap.addEventListener('dragover', e => { e.preventDefault(); });
    screenWrap.addEventListener('drop', e => {
      e.preventDefault();
      if (e.dataTransfer.files.length) loadFiles(e.dataTransfer.files);
    });

    renderPlaylist();
  }

  function fmtTime(s) {
    if (!isFinite(s) || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  NightOS.registerApp('videoplayer', {
    title: 'Video Player',
    icon: '🎬',
    open,
  });
})();
