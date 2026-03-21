/**
 * NightmareOS — System Information
 * Displays comprehensive information about the OS and browser environment.
 */

'use strict';

(function () {
  function open() {
    var el = WindowManager.create({
      id: 'systeminfo',
      title: 'About NightmareOS',
      icon: 'ℹ️',
      width: 520,
      height: 500,
      content: buildUI(),
    });
    initSysInfo(el);
  }

  function buildUI() {
    return [
      '<div class="sysinfo-app">',
      '  <div class="sysinfo-logo">',
      '    <svg width="64" height="64" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">',
      '      <circle cx="40" cy="40" r="38" stroke="#00ff41" stroke-width="3"/>',
      '      <path d="M40 14 L54 34 H26 Z" fill="#00ff41"/>',
      '      <path d="M40 66 L26 46 H54 Z" fill="#00ff41" opacity="0.6"/>',
      '      <circle cx="40" cy="40" r="8" fill="#00ff41"/>',
      '    </svg>',
      '    <div class="sysinfo-title">NightmareOS</div>',
      '    <div class="sysinfo-ver" id="sysinfo-ver"></div>',
      '  </div>',
      '  <div class="sysinfo-tabs">',
      '    <button class="sysinfo-tab active" data-tab="general">General</button>',
      '    <button class="sysinfo-tab" data-tab="hardware">Hardware</button>',
      '    <button class="sysinfo-tab" data-tab="software">Software</button>',
      '    <button class="sysinfo-tab" data-tab="storage">Storage</button>',
      '  </div>',
      '  <div class="sysinfo-content" id="sysinfo-content"></div>',
      '</div>'
    ].join('\n');
  }

  function row(label, value) {
    return '<div class="sysinfo-row"><span class="sysinfo-label">' + escHtml(label) + '</span>' +
           '<span class="sysinfo-value">' + escHtml(String(value)) + '</span></div>';
  }

  function initSysInfo(el) {
    el.querySelector('#sysinfo-ver').textContent = 'Version ' + NightOS.version + ' — Web Desktop Environment';
    var contentEl = el.querySelector('#sysinfo-content');

    function showTab(tab) {
      var html = '';
      switch (tab) {
        case 'general':
          html = row('OS Name', NightOS.displayName) +
                 row('Version', NightOS.version) +
                 row('Username', NightOS.username) +
                 row('Platform', navigator.platform || 'Unknown') +
                 row('User Agent', navigator.userAgent.slice(0, 80) + '…') +
                 row('Language', navigator.language || 'Unknown') +
                 row('Timezone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown') +
                 row('Online', navigator.onLine ? 'Yes' : 'No') +
                 row('Cookies Enabled', navigator.cookieEnabled ? 'Yes' : 'No') +
                 row('Page Load Time', Math.round(performance.now()) + ' ms');
          break;
        case 'hardware':
          html = row('CPU Cores', navigator.hardwareConcurrency || 'Unknown') +
                 row('Device Memory', (navigator.deviceMemory || 'Unknown') + (navigator.deviceMemory ? ' GB' : '')) +
                 row('Screen Resolution', screen.width + ' × ' + screen.height) +
                 row('Available Screen', screen.availWidth + ' × ' + screen.availHeight) +
                 row('Color Depth', screen.colorDepth + ' bit') +
                 row('Pixel Ratio', window.devicePixelRatio || 1) +
                 row('Touch Support', ('ontouchstart' in window) ? 'Yes' : 'No') +
                 row('Max Touch Points', navigator.maxTouchPoints || 0) +
                 row('Viewport', window.innerWidth + ' × ' + window.innerHeight);
          break;
        case 'software':
          var sw = navigator.serviceWorker ? 'Supported' : 'Not supported';
          html = row('Service Worker', sw) +
                 row('Web Workers', typeof Worker !== 'undefined' ? 'Supported' : 'Not supported') +
                 row('WebGL', (function () { try { return !!document.createElement('canvas').getContext('webgl2') ? 'WebGL 2' : (!!document.createElement('canvas').getContext('webgl') ? 'WebGL 1' : 'No'); } catch (_e) { return 'No'; } })()) +
                 row('WebSocket', typeof WebSocket !== 'undefined' ? 'Supported' : 'Not supported') +
                 row('Notifications', typeof Notification !== 'undefined' ? 'Supported' : 'Not supported') +
                 row('Geolocation', 'geolocation' in navigator ? 'Supported' : 'Not supported') +
                 row('Web Audio', typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined' ? 'Supported' : 'Not supported') +
                 row('Clipboard API', navigator.clipboard ? 'Supported' : 'Not supported') +
                 row('LocalStorage', (function () { try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return 'Available'; } catch (_e) { return 'Blocked'; } })());
          break;
        case 'storage':
          var appCount = NightOS.apps.size || 0;
          var lsKeys = 0;
          var lsSize = 0;
          try {
            lsKeys = localStorage.length;
            for (var i = 0; i < localStorage.length; i++) {
              var key = localStorage.key(i);
              lsSize += (key.length + (localStorage.getItem(key) || '').length) * 2;
            }
          } catch (_e) { /* ignore */ }
          html = row('Registered Apps', appCount) +
                 row('localStorage Keys', lsKeys) +
                 row('localStorage Size', (lsSize / 1024).toFixed(1) + ' KB') +
                 row('Session Storage Keys', (function () { try { return sessionStorage.length; } catch (_e) { return 'N/A'; } })()) +
                 row('IndexedDB', typeof indexedDB !== 'undefined' ? 'Supported' : 'Not supported') +
                 row('Cache API', typeof caches !== 'undefined' ? 'Supported' : 'Not supported');
          break;
      }
      contentEl.innerHTML = html;
    }

    el.querySelectorAll('.sysinfo-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.querySelectorAll('.sysinfo-tab').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        showTab(btn.dataset.tab);
      });
    });

    showTab('general');
  }

  NightOS.registerApp('systeminfo', {
    title: 'System Info',
    icon: 'ℹ️',
    open: open,
  });
})();
