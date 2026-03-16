/**
 * NightOS — Boot Sequence
 * Runs the animated boot, then shows login, then launches desktop.
 */

'use strict';

(function () {
  const BOOT_STEPS = [
    { pct: 10,  msg: 'Loading kernel modules…' },
    { pct: 22,  msg: 'Initializing hardware drivers…' },
    { pct: 35,  msg: 'Mounting virtual filesystem…' },
    { pct: 48,  msg: 'Starting system services…' },
    { pct: 62,  msg: 'Loading desktop environment…' },
    { pct: 75,  msg: 'Applying user preferences…' },
    { pct: 88,  msg: 'Preparing workspace…' },
    { pct: 100, msg: 'Welcome to NightOS!' },
  ];

  let stepIndex = 0;

  function advanceBoot() {
    const bar    = document.getElementById('boot-bar');
    const status = document.getElementById('boot-status');

    if (stepIndex >= BOOT_STEPS.length) {
      // Show login screen
      showLogin();
      return;
    }

    const step = BOOT_STEPS[stepIndex];
    if (bar) bar.style.width = `${step.pct}%`;
    if (status) status.textContent = step.msg;
    stepIndex++;

    const delay = stepIndex === BOOT_STEPS.length ? 400 : 280 + Math.random() * 180;
    setTimeout(advanceBoot, delay);
  }

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

  /* ---- Exposed for restart ---- */
  /**
   * Start (or restart) the boot sequence.
   * @param {boolean} [resetStep=true] - When true, restarts from step 0 (initial boot).
   *   Pass false when resuming mid-boot after an OS restart to continue from the current step.
   */
  window.startBoot = function (resetStep = true) {
    if (resetStep) stepIndex = 0;
    const bar    = document.getElementById('boot-bar');
    const status = document.getElementById('boot-status');
    if (bar) bar.style.width = '0%';
    if (status) status.textContent = 'Initializing system…';

    const boot = document.getElementById('boot-screen');
    if (boot) {
      boot.classList.remove('hidden');
      boot.style.opacity = '1';
    }

    setTimeout(advanceBoot, 300);
    initLogin();
  };

  // Start on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => startBoot());
  } else {
    startBoot();
  }
})();
