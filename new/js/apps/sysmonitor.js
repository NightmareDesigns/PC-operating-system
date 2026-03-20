/**
 * NightmareOS — System Monitor App
 * Displays simulated CPU, RAM, network usage with live canvas graphs.
 * Real usage data is unavailable in browsers; values are plausibly simulated.
 */

'use strict';

(function () {
  function open() {
    const el = WindowManager.create({
      id: 'sysmonitor',
      title: 'System Monitor',
      icon: '📊',
      width: 700,
      height: 500,
      content: buildUI(),
    });
    initMonitor(el);
  }

  function buildUI() {
    return `
      <div class="sysmon-layout">
        <!-- Gauges row -->
        <div class="sysmon-gauges">
          <div class="sysmon-gauge-card">
            <canvas class="sysmon-gauge-canvas" id="sm-cpu-gauge" width="120" height="120"
                    aria-label="CPU usage gauge"></canvas>
            <div class="sysmon-gauge-label">CPU</div>
            <div class="sysmon-gauge-val" id="sm-cpu-pct">0%</div>
          </div>
          <div class="sysmon-gauge-card">
            <canvas class="sysmon-gauge-canvas" id="sm-ram-gauge" width="120" height="120"
                    aria-label="RAM usage gauge"></canvas>
            <div class="sysmon-gauge-label">RAM</div>
            <div class="sysmon-gauge-val" id="sm-ram-pct">0%</div>
          </div>
          <div class="sysmon-gauge-card">
            <canvas class="sysmon-gauge-canvas" id="sm-net-gauge" width="120" height="120"
                    aria-label="Network usage gauge"></canvas>
            <div class="sysmon-gauge-label">Network</div>
            <div class="sysmon-gauge-val" id="sm-net-pct">0%</div>
          </div>
          <div class="sysmon-gauge-card">
            <canvas class="sysmon-gauge-canvas" id="sm-gpu-gauge" width="120" height="120"
                    aria-label="GPU usage gauge"></canvas>
            <div class="sysmon-gauge-label">GPU</div>
            <div class="sysmon-gauge-val" id="sm-gpu-pct">0%</div>
          </div>
        </div>
        <!-- History graph -->
        <canvas class="sysmon-graph" id="sm-graph" width="660" height="120"
                aria-label="Resource usage history graph"></canvas>
        <!-- Info + process list -->
        <div class="sysmon-bottom">
          <div class="sysmon-info" id="sm-info"></div>
          <div class="sysmon-procs">
            <div class="sysmon-procs-header">Running Apps</div>
            <div class="sysmon-procs-list" id="sm-procs"></div>
          </div>
        </div>
      </div>`;
  }

  function initMonitor(el) {
    const cpuGaugeEl = el.querySelector('#sm-cpu-gauge');
    const ramGaugeEl = el.querySelector('#sm-ram-gauge');
    const netGaugeEl = el.querySelector('#sm-net-gauge');
    const gpuGaugeEl = el.querySelector('#sm-gpu-gauge');
    const cpuPct     = el.querySelector('#sm-cpu-pct');
    const ramPct     = el.querySelector('#sm-ram-pct');
    const netPct     = el.querySelector('#sm-net-pct');
    const gpuPct     = el.querySelector('#sm-gpu-pct');
    const graphEl    = el.querySelector('#sm-graph');
    const graphCtx   = graphEl.getContext('2d');
    const infoEl     = el.querySelector('#sm-info');
    const procsEl    = el.querySelector('#sm-procs');

    const HISTORY_LEN = 60;
    const history = { cpu: [], ram: [], net: [], gpu: [] };

    let running  = true;
    let cpuBase  = 15 + Math.random() * 30;
    let ramBase  = 40 + Math.random() * 20;
    let rafId    = null;
    let lastTick = 0;

    /* ---- Fake smooth value generator ---- */
    function smoothVal(base, noise, min, max) {
      const next = base + (Math.random() - 0.5) * noise;
      return Math.min(max, Math.max(min, next));
    }

    /* ---- Draw arc gauge ---- */
    function drawGauge(canvas, value, color) {
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2 + 8;
      const r = W * 0.38;
      ctx.clearRect(0, 0, W, H);

      const startAngle = Math.PI * 0.75;
      const endAngle   = Math.PI * 2.25;
      const valueAngle = startAngle + (endAngle - startAngle) * (value / 100);

      // Background arc
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Value arc
      if (value > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, valueAngle);
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur  = 8;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    /* ---- Draw history graph ---- */
    function drawGraph() {
      const W = graphEl.width;
      const H = graphEl.height;
      graphCtx.clearRect(0, 0, W, H);

      const colors = {
        cpu: '#4f8ef7',
        ram: '#00ff41',
        net: '#ffd60a',
        gpu: '#bf5af2',
      };

      ['cpu', 'ram', 'net', 'gpu'].forEach(key => {
        const data = history[key];
        if (data.length < 2) return;
        const color = colors[key];
        graphCtx.beginPath();
        graphCtx.strokeStyle = color;
        graphCtx.lineWidth = 1.5;
        graphCtx.shadowColor = color;
        graphCtx.shadowBlur = 4;
        data.forEach((v, i) => {
          const x = (i / (HISTORY_LEN - 1)) * W;
          const y = H - (v / 100) * H * 0.9 - H * 0.05;
          i === 0 ? graphCtx.moveTo(x, y) : graphCtx.lineTo(x, y);
        });
        graphCtx.stroke();
        graphCtx.shadowBlur = 0;
      });

      // Legend
      let lx = 8;
      ['CPU', 'RAM', 'Net', 'GPU'].forEach((lbl, i) => {
        const c = Object.values(colors)[i];
        graphCtx.fillStyle = c;
        graphCtx.fillRect(lx, 6, 12, 4);
        graphCtx.fillStyle = 'rgba(255,255,255,0.7)';
        graphCtx.font = '10px monospace';
        graphCtx.fillText(lbl, lx + 16, 13);
        lx += 50;
      });
    }

    /* ---- Update system info ---- */
    function updateInfo(cpu, ram, net, gpu) {
      const cores = navigator.hardwareConcurrency || 4;
      const mem   = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : '~4 GB';
      const totalRam = navigator.deviceMemory || 4;
      const usedRam  = ((ram / 100) * totalRam).toFixed(1);
      infoEl.innerHTML = `
        <div class="sysmon-info-row"><span>CPU Cores</span><span>${cores}</span></div>
        <div class="sysmon-info-row"><span>Total RAM</span><span>${mem}</span></div>
        <div class="sysmon-info-row"><span>Used RAM</span><span>${usedRam} GB</span></div>
        <div class="sysmon-info-row"><span>Platform</span><span>${escHtml(navigator.platform || 'Unknown')}</span></div>
        <div class="sysmon-info-row"><span>Online</span><span>${navigator.onLine ? '✅' : '❌'}</span></div>
        <div class="sysmon-info-row"><span>Screen</span><span>${window.screen.width}×${window.screen.height}</span></div>
        <div class="sysmon-info-row"><span>Pixel Ratio</span><span>${window.devicePixelRatio}x</span></div>`;
    }

    /* ---- Update process list ---- */
    function updateProcs() {
      if (!window.WindowManager) return;
      const wins = WindowManager.windows;
      procsEl.innerHTML = '';
      if (wins.size === 0) {
        procsEl.innerHTML = '<div style="color:var(--text-secondary);font-size:0.78rem;padding:4px;">No running apps</div>';
        return;
      }
      wins.forEach((winEl, id) => {
        const title = winEl.querySelector('.window-title')?.textContent || id;
        const icon  = winEl.querySelector('.window-icon')?.textContent  || '🪟';
        const row = document.createElement('div');
        row.className = 'sysmon-proc-row';
        const cpuSim = (Math.random() * 5).toFixed(1);
        row.innerHTML = `
          <span class="sysmon-proc-icon">${escHtml(icon)}</span>
          <span class="sysmon-proc-name">${escHtml(title)}</span>
          <span class="sysmon-proc-cpu">${cpuSim}%</span>`;
        procsEl.appendChild(row);
      });
    }

    /* ---- Tick ---- */
    function tick(ts) {
      if (!running) return;
      rafId = requestAnimationFrame(tick);

      if (ts - lastTick < 1000) return; // update every second
      lastTick = ts;

      // Simulate values with smooth variation
      cpuBase = smoothVal(cpuBase, 12, 5, 95);
      ramBase = smoothVal(ramBase, 5, 25, 90);
      const netVal = smoothVal(15, 20, 0, 100);
      const gpuVal = smoothVal(20, 15, 0, 90);

      const cpuVal = Math.round(cpuBase);
      const ramVal = Math.round(ramBase);
      const netRnd = Math.round(netVal);
      const gpuRnd = Math.round(gpuVal);

      // Gauges
      const cpuColor = cpuVal > 80 ? '#ff3b30' : cpuVal > 60 ? '#ffd60a' : '#4f8ef7';
      const ramColor = ramVal > 80 ? '#ff3b30' : ramVal > 60 ? '#ffd60a' : '#00ff41';
      drawGauge(cpuGaugeEl, cpuVal, cpuColor);
      drawGauge(ramGaugeEl, ramVal, ramColor);
      drawGauge(netGaugeEl, netRnd, '#ffd60a');
      drawGauge(gpuGaugeEl, gpuRnd, '#bf5af2');

      cpuPct.textContent = `${cpuVal}%`;
      ramPct.textContent = `${ramVal}%`;
      netPct.textContent = `${netRnd}%`;
      gpuPct.textContent = `${gpuRnd}%`;

      // History
      ['cpu', 'ram', 'net', 'gpu'].forEach((k, i) => {
        const v = [cpuVal, ramVal, netRnd, gpuRnd][i];
        history[k].push(v);
        if (history[k].length > HISTORY_LEN) history[k].shift();
      });

      drawGraph();
      updateInfo(cpuVal, ramVal, netRnd, gpuRnd);
      updateProcs();
    }

    rafId = requestAnimationFrame(tick);

    // Stop when closed
    const obs = new MutationObserver(() => {
      if (!document.contains(el)) {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  NightOS.registerApp('sysmonitor', {
    title: 'System Monitor',
    icon: '📊',
    open,
  });
})();
