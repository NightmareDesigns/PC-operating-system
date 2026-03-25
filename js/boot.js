/**
 * NightOS — Boot Sequence
 * Full boot pipeline: BIOS POST → Bootloader → Kernel → Login → Desktop.
 */

'use strict';

(function () {

  /* ======== BIOS POST ======== */
  const POST_LINES = [
    { text: 'Windows PE Firmware v4.17 — (C) 2024 Nightmare Designs\n', cls: 'post-title' },
    { text: 'CPU: NightCore™ i9-NM @ 4.80 GHz … ', delay: 80 },
    { text: 'OK\n', cls: 'post-ok', delay: 60 },
    { text: 'Memory test: 16384 MB ', delay: 100 },
    { text: 'OK\n', cls: 'post-ok', delay: 60 },
    { text: 'Detecting IDE drives …\n', delay: 120 },
    { text: '  Primary Master:  NM-SSD 512 GB\n', delay: 80 },
    { text: '  Primary Slave:   None\n', delay: 50 },
    { text: 'Detecting USB devices … 2 found\n', delay: 100 },
    { text: 'Initializing graphics: NightGPU RTX-NM 8 GB … ', delay: 120 },
    { text: 'OK\n', cls: 'post-ok', delay: 60 },
    { text: 'PCI bus scan … 6 devices\n', delay: 80 },
    { text: 'Network controller: NightNet Ethernet … ', delay: 100 },
    { text: 'OK\n', cls: 'post-ok', delay: 60 },
    { text: 'Audio controller: NightSound HD … ', delay: 80 },
    { text: 'OK\n', cls: 'post-ok', delay: 60 },
    { text: '\nAll POST checks passed. Booting from NM-SSD …\n', cls: 'post-ok', delay: 200 },
  ];

  function runPOST() {
    return new Promise(resolve => {
      const screen = document.getElementById('post-screen');
      const output = document.getElementById('post-output');
      if (!screen || !output) { resolve(); return; }

      screen.classList.remove('hidden');
      output.textContent = '';
      let i = 0;

      function next() {
        if (i >= POST_LINES.length) {
          setTimeout(() => {
            screen.classList.add('hidden');
            resolve();
          }, 350);
          return;
        }
        const line = POST_LINES[i++];
        const span = document.createElement('span');
        if (line.cls) span.className = line.cls;
        span.textContent = line.text;
        output.appendChild(span);
        /* auto-scroll */
        output.scrollTop = output.scrollHeight;
        setTimeout(next, line.delay || 70);
      }
      next();
    });
  }

  /* ======== BOOTLOADER ======== */
  function runBootloader() {
    return new Promise(resolve => {
      const screen = document.getElementById('bootloader-screen');
      const timerEl = document.getElementById('bootloader-timer');
      if (!screen) { resolve(0); return; }

      screen.classList.remove('hidden');
      let selected = 0;
      let countdown = 5;
      const entries = screen.querySelectorAll('.bootloader-entry');

      function highlight() {
        entries.forEach((e, idx) => e.classList.toggle('selected', idx === selected));
      }

      function finish() {
        clearInterval(tickId);
        document.removeEventListener('keydown', onKey);
        screen.classList.add('hidden');
        resolve(selected);
      }

      function onKey(e) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          selected = Math.max(0, selected - 1);
          countdown = -1;            /* stop auto-boot */
          highlight();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          selected = Math.min(entries.length - 1, selected + 1);
          countdown = -1;
          highlight();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          finish();
        }
      }

      document.addEventListener('keydown', onKey);

      /* click support */
      entries.forEach((entry, idx) => {
        entry.addEventListener('click', () => {
          selected = idx;
          highlight();
          finish();
        });
      });

      /* countdown timer */
      const tickId = setInterval(() => {
        if (countdown < 0) { if (timerEl) timerEl.textContent = '—'; return; }
        countdown--;
        if (timerEl) timerEl.textContent = String(countdown);
        if (countdown <= 0) finish();
      }, 1000);
    });
  }

  /* ======== KERNEL BOOT ======== */
  function getDisplayName() {
    return (window.NightOS && NightOS.displayName) || 'Windows PE';
  }

  function getBootMessage() {
    if (typeof loadSettings === 'function') loadSettings();
    return (window.NightOS && NightOS.settings && NightOS.settings.bootMessage) || 'Welcome to Windows PE!';
  }

  function getKernelSteps() {
    const displayName = getDisplayName();
    return [
      { pct: 5,  msg: `[  0.000000] ${displayName} kernel 6.2.0-nm booting…` },
    { pct: 10, msg: '[  0.012345] Command line: BOOT_IMAGE=/boot/vmlinuz-nm root=/dev/nmsda1' },
    { pct: 15, msg: '[  0.045678] ACPI: RSDP found at 0x000F0420' },
    { pct: 20, msg: '[  0.078901] PCI: Scanning bus 0000:00' },
    { pct: 28, msg: '[  0.123456] Loading kernel modules…' },
    { pct: 35, msg: '[  0.234567] Initializing hardware drivers…' },
    { pct: 42, msg: '[  0.345678] EXT4-fs (nmsda1): mounted filesystem' },
    { pct: 50, msg: '[  0.456789] Mounting virtual filesystem…' },
    { pct: 58, msg: '[  0.567890] NET: Registered protocol family 2 (TCP/IP)' },
    { pct: 65, msg: '[  0.678901] Starting system services…' },
      { pct: 72, msg: `[  0.789012] systemd[1]: Started ${displayName} Desktop Manager` },
      { pct: 80, msg: `[  0.890123] Loading ${displayName} desktop…` },
    { pct: 88, msg: '[  0.901234] Applying user preferences…' },
    { pct: 94, msg: '[  0.956789] Preparing workspace…' },
      { pct: 100, msg: `[  1.000000] ${getBootMessage()}` },
    ];
  }

  let stepIndex = 0;

  function advanceBoot() {
    const bar    = document.getElementById('boot-bar');
    const status = document.getElementById('boot-status');

    const kernelSteps = getKernelSteps();
    if (stepIndex >= kernelSteps.length) {
      showLogin();
      return;
    }

    const step = kernelSteps[stepIndex];
    if (bar) bar.style.width = step.pct + '%';
    if (status) status.textContent = step.msg;
    stepIndex++;

    const delay = stepIndex === kernelSteps.length ? 400 : 180 + Math.random() * 140;
    setTimeout(advanceBoot, delay);
  }

  /* ======== LOGIN ======== */
  function showLogin() {
    const boot  = document.getElementById('boot-screen');
    const login = document.getElementById('login-screen');

    if (boot) {
      boot.style.opacity = '0';
      boot.style.transition = 'opacity 0.4s';
      setTimeout(() => boot.classList.add('hidden'), 420);
    }

    if (login) {
      login.classList.remove('hidden');
      login.style.opacity = '0';
      login.style.transition = 'opacity 0.4s';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          login.style.opacity = '1';
          setTimeout(() => {
            const pw = document.getElementById('login-password');
            if (pw) pw.focus();
          }, 50);
        });
      });
    }
  }

  function doLogin() {
    const login   = document.getElementById('login-screen');
    const desktop = document.getElementById('desktop');

    if (login) {
      login.style.opacity = '0';
      login.style.transition = 'opacity 0.35s';
      setTimeout(() => login.classList.add('hidden'), 370);
    }

    if (desktop) {
      desktop.classList.remove('hidden');
      desktop.style.opacity = '0';
      desktop.style.transition = 'opacity 0.4s';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          desktop.style.opacity = '1';
          initDesktop();
        });
      });
    }
  }

  /* ---- Login form wiring ---- */
  function initLogin() {
    const btn = document.getElementById('login-btn');
    const pw  = document.getElementById('login-password');

    if (btn) btn.addEventListener('click', doLogin);

    if (pw) {
      pw.addEventListener('keydown', e => {
        if (e.key === 'Enter') doLogin();
      });
    }
  }

  /* ======== SHUTDOWN SEQUENCE ======== */
  const SHUTDOWN_LINES = [
    { text: '[SHUTDOWN] Stopping user session…\n', delay: 120 },
    { text: '[SHUTDOWN] Saving user preferences… ', delay: 200 },
    { text: 'done\n', cls: 'sd-ok', delay: 80 },
    { text: '[SHUTDOWN] Stopping Windows PE Desktop Manager… ', delay: 150 },
    { text: 'done\n', cls: 'sd-ok', delay: 80 },
    { text: '[SHUTDOWN] Stopping system services… ', delay: 200 },
    { text: 'done\n', cls: 'sd-ok', delay: 80 },
    { text: '[SHUTDOWN] Unmounting filesystems… ', delay: 180 },
    { text: 'done\n', cls: 'sd-ok', delay: 80 },
    { text: '[SHUTDOWN] Flushing disk caches… ', delay: 150 },
    { text: 'done\n', cls: 'sd-ok', delay: 80 },
    { text: '[SHUTDOWN] Deactivating swap… ', delay: 120 },
    { text: 'done\n', cls: 'sd-ok', delay: 80 },
    { text: '[SHUTDOWN] Powering off network interfaces… ', delay: 150 },
    { text: 'done\n', cls: 'sd-ok', delay: 80 },
    { text: '\nSystem halted. It is now safe to close this tab.\n', cls: 'sd-ok', delay: 300 },
  ];

  function runShutdown() {
    return new Promise(resolve => {
      const screen = document.getElementById('shutdown-screen');
      const output = document.getElementById('shutdown-output');
      if (!screen || !output) { resolve(); return; }

      const desktop = document.getElementById('desktop');
      if (desktop) desktop.classList.add('hidden');

      screen.classList.remove('hidden');
      output.textContent = '';
      let i = 0;

      function next() {
        if (i >= SHUTDOWN_LINES.length) {
          setTimeout(resolve, 600);
          return;
        }
        const line = SHUTDOWN_LINES[i++];
        const span = document.createElement('span');
        if (line.cls) span.className = line.cls;
        span.textContent = line.text;
        output.appendChild(span);
        output.scrollTop = output.scrollHeight;
        setTimeout(next, line.delay || 70);
      }
      next();
    });
  }

  /* ======== FULL BOOT PIPELINE ======== */
  /**
   * Start (or restart) the boot sequence.
   * @param {boolean} [resetStep=true] – When true, starts from POST (full cold boot).
   *   Pass false to skip POST and bootloader (warm restart).
   */
  window.startBoot = async function (resetStep = true) {
    stepIndex = 0;

    /* Hide all screens first */
    ['post-screen', 'bootloader-screen', 'boot-screen', 'login-screen', 'desktop', 'shutdown-screen']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.add('hidden'); el.style.opacity = ''; el.style.transition = ''; }
      });

    if (resetStep) {
      /* Full cold boot: POST → Bootloader → Kernel */
      await runPOST();
      const entry = await runBootloader();

      if (entry === 2) {
        /* Memory diagnostic — just show a fake message then reboot */
        const post = document.getElementById('post-screen');
        const out  = document.getElementById('post-output');
        if (post && out) {
          post.classList.remove('hidden');
          out.textContent = '';
          const span = document.createElement('span');
          span.className = 'post-ok';
          span.textContent = 'Memory diagnostic: 16384 MB tested — 0 errors found.\nRebooting…\n';
          out.appendChild(span);
          await new Promise(r => setTimeout(r, 1800));
          post.classList.add('hidden');
        }
        window.startBoot(true);
        return;
      }

      if (entry === 1) {
        /* Recovery mode — boot normally but show a notification later */
        window._recoveryMode = true;
      }
    }

    /* Kernel boot (the original NightmareOS boot screen with progress bar) */
    const boot = document.getElementById('boot-screen');
    const bar  = document.getElementById('boot-bar');
    const status = document.getElementById('boot-status');
    if (bar) bar.style.width = '0%';
    if (status) status.textContent = `Initializing ${getDisplayName()}…`;
    if (boot) {
      boot.classList.remove('hidden');
      boot.style.opacity = '1';
    }

    setTimeout(advanceBoot, 300);
    initLogin();
  };

  /* Expose shutdown for desktop.js */
  window.runShutdownSequence = async function () {
    await runShutdown();
    /* After shutdown animation, show final static screen */
    const sd = document.getElementById('shutdown-screen');
    if (sd) {
      sd.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;color:white;font-family:system-ui;">' +
        '<svg width="60" height="60" viewBox="0 0 60 60" fill="none">' +
        '<circle cx="30" cy="30" r="28" stroke="#4f8ef7" stroke-width="2"/>' +
        '<line x1="30" y1="14" x2="30" y2="32" stroke="#4f8ef7" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M20 20 A14 14 0 1 0 40 20" stroke="#4f8ef7" stroke-width="3" stroke-linecap="round" fill="none"/>' +
        '</svg>' +
        `<p style="font-size:1.1rem;font-weight:300;letter-spacing:0.05em;">${getDisplayName()} has shut down.</p>` +
        '<p style="font-size:0.82rem;color:#8892a4;">Close this tab or refresh to restart.</p>' +
        '</div>';
    }
  };

  /* Start on DOMContentLoaded */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => startBoot());
  } else {
    startBoot();
  }
})();
