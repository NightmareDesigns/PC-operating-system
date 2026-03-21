/**
 * NightmareOS — Password Generator
 * Generates strong random passwords with customizable options.
 */

'use strict';

(function () {
  function open() {
    var el = WindowManager.create({
      id: 'passwordgen',
      title: 'Password Generator',
      icon: '🔐',
      width: 440,
      height: 460,
      resizable: false,
      content: buildUI(),
    });
    initPwGen(el);
  }

  function buildUI() {
    return [
      '<div class="pwgen-app">',
      '  <div class="pwgen-output-wrap">',
      '    <input type="text" class="pwgen-output" id="pwgen-output" readonly aria-label="Generated password"/>',
      '    <button class="pwgen-copy" id="pwgen-copy" title="Copy to clipboard">📋</button>',
      '  </div>',
      '  <div class="pwgen-strength" id="pwgen-strength"></div>',
      '  <div class="pwgen-options">',
      '    <label class="pwgen-opt">',
      '      Length: <input type="range" id="pwgen-len" min="8" max="64" value="20" class="pwgen-range"/>',
      '      <span id="pwgen-len-val">20</span>',
      '    </label>',
      '    <label class="pwgen-opt">',
      '      <input type="checkbox" id="pwgen-upper" checked/> Uppercase (A-Z)',
      '    </label>',
      '    <label class="pwgen-opt">',
      '      <input type="checkbox" id="pwgen-lower" checked/> Lowercase (a-z)',
      '    </label>',
      '    <label class="pwgen-opt">',
      '      <input type="checkbox" id="pwgen-digits" checked/> Digits (0-9)',
      '    </label>',
      '    <label class="pwgen-opt">',
      '      <input type="checkbox" id="pwgen-symbols" checked/> Symbols (!@#$…)',
      '    </label>',
      '    <label class="pwgen-opt">',
      '      <input type="checkbox" id="pwgen-ambiguous"/> Exclude ambiguous (0O, l1I)',
      '    </label>',
      '  </div>',
      '  <button class="pwgen-generate" id="pwgen-generate">🔄 Generate Password</button>',
      '  <div class="pwgen-history-title">Recent Passwords</div>',
      '  <div class="pwgen-history" id="pwgen-history" role="list" aria-label="Password history"></div>',
      '</div>'
    ].join('\n');
  }

  function initPwGen(el) {
    var outputEl = el.querySelector('#pwgen-output');
    var strengthEl = el.querySelector('#pwgen-strength');
    var lenSlider = el.querySelector('#pwgen-len');
    var lenVal = el.querySelector('#pwgen-len-val');
    var historyEl = el.querySelector('#pwgen-history');
    var history = [];

    lenSlider.addEventListener('input', function () {
      lenVal.textContent = lenSlider.value;
    });

    function getCharset() {
      var upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      var lower = 'abcdefghijklmnopqrstuvwxyz';
      var digits = '0123456789';
      var symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?/~';
      var ambiguousChars = '0OoIl1';

      var charset = '';
      if (el.querySelector('#pwgen-upper').checked) charset += upper;
      if (el.querySelector('#pwgen-lower').checked) charset += lower;
      if (el.querySelector('#pwgen-digits').checked) charset += digits;
      if (el.querySelector('#pwgen-symbols').checked) charset += symbols;

      if (el.querySelector('#pwgen-ambiguous').checked) {
        charset = charset.split('').filter(function (c) {
          return ambiguousChars.indexOf(c) === -1;
        }).join('');
      }

      return charset || 'abcdefghijklmnopqrstuvwxyz';
    }

    function generate() {
      var len = parseInt(lenSlider.value, 10) || 20;
      var charset = getCharset();
      var pw = '';
      var arr = new Uint32Array(len);
      crypto.getRandomValues(arr);
      for (var i = 0; i < len; i++) {
        pw += charset[arr[i] % charset.length];
      }
      outputEl.value = pw;

      // Strength meter
      var score = 0;
      if (len >= 12) score++;
      if (len >= 20) score++;
      if (/[A-Z]/.test(pw)) score++;
      if (/[a-z]/.test(pw)) score++;
      if (/[0-9]/.test(pw)) score++;
      if (/[^A-Za-z0-9]/.test(pw)) score++;

      var labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong', 'Excellent', 'Maximum'];
      var colors = ['#ff4444', '#ff8800', '#ffcc00', '#88cc00', '#44bb44', '#22aa88', '#00ddaa'];
      var idx = Math.min(score, labels.length - 1);

      strengthEl.innerHTML = '<div class="pwgen-meter"><div class="pwgen-meter-fill" style="width:' +
        Math.round(((idx + 1) / labels.length) * 100) + '%;background:' + colors[idx] + '"></div></div>' +
        '<span style="color:' + colors[idx] + '">' + labels[idx] + '</span>';

      // Add to history
      history.unshift(pw);
      if (history.length > 5) history.pop();
      renderHistory();
    }

    function renderHistory() {
      historyEl.innerHTML = history.map(function (pw) {
        return '<div class="pwgen-hist-item" role="listitem">' +
          '<span class="pwgen-hist-pw">' + escHtml(pw) + '</span>' +
          '<button class="pwgen-hist-copy" title="Copy">📋</button></div>';
      }).join('');

      historyEl.querySelectorAll('.pwgen-hist-copy').forEach(function (btn, i) {
        btn.addEventListener('click', function () {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(history[i]).then(function () {
              showNotification('Password Generator', 'Password copied!');
            });
          }
        });
      });
    }

    el.querySelector('#pwgen-generate').addEventListener('click', generate);

    el.querySelector('#pwgen-copy').addEventListener('click', function () {
      if (navigator.clipboard && outputEl.value) {
        navigator.clipboard.writeText(outputEl.value).then(function () {
          showNotification('Password Generator', 'Password copied to clipboard!');
        });
      }
    });

    generate();
  }

  NightOS.registerApp('passwordgen', {
    title: 'Password Generator',
    icon: '🔐',
    open: open,
  });
})();
