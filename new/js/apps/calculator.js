/**
 * NightOS — Calculator App
 */

'use strict';

(function () {
  function open() {
    const el = WindowManager.create({
      id: 'calculator',
      title: 'Calculator',
      icon: '🔢',
      width: 300,
      height: 440,
      resizable: false,
      content: buildUI(),
    });
    initCalc(el);
  }

  function buildUI() {
    const keys = [
      { label: 'C',   cls: 'clear',  action: 'clear' },
      { label: '±',   cls: 'op',     action: 'sign' },
      { label: '%',   cls: 'op',     action: '%' },
      { label: '÷',   cls: 'op',     action: '/' },

      { label: '7',   cls: '',       action: '7' },
      { label: '8',   cls: '',       action: '8' },
      { label: '9',   cls: '',       action: '9' },
      { label: '×',   cls: 'op',     action: '*' },

      { label: '4',   cls: '',       action: '4' },
      { label: '5',   cls: '',       action: '5' },
      { label: '6',   cls: '',       action: '6' },
      { label: '−',   cls: 'op',     action: '-' },

      { label: '1',   cls: '',       action: '1' },
      { label: '2',   cls: '',       action: '2' },
      { label: '3',   cls: '',       action: '3' },
      { label: '+',   cls: 'op',     action: '+' },

      { label: '0',   cls: 'span2',  action: '0' },
      { label: '.',   cls: '',       action: '.' },
      { label: '=',   cls: 'equals', action: '=' },
    ];

    const keyHTML = keys.map(k =>
      `<button class="calc-key ${k.cls}" data-action="${escHtml(k.action)}" aria-label="${escHtml(k.label)}"
        ${k.cls === 'span2' ? 'style="grid-column:span 2"' : ''}>${escHtml(k.label)}</button>`
    ).join('');

    return `
      <div class="calc-layout">
        <div class="calc-display">
          <div class="calc-expr" id="calc-expr" aria-live="polite"></div>
          <div class="calc-result" id="calc-result" aria-live="assertive">0</div>
        </div>
        <div class="calc-keys" role="group" aria-label="Calculator keys">
          ${keyHTML}
        </div>
      </div>`;
  }

  function initCalc(el) {
    let display = '0';
    let expr = '';
    let operator = null;
    let prevValue = null;
    let justEvaluated = false;

    const resultEl = el.querySelector('#calc-result');
    const exprEl = el.querySelector('#calc-expr');

    function updateDisplay() {
      if (resultEl) resultEl.textContent = display;
      if (exprEl) exprEl.textContent = expr;
    }

    function handleAction(action) {
      const isNum = /^[0-9]$/.test(action);

      if (action === 'clear') {
        display = '0'; expr = ''; operator = null; prevValue = null; justEvaluated = false;
        updateDisplay(); return;
      }

      if (action === 'sign') {
        if (display !== '0') {
          display = display.startsWith('-') ? display.slice(1) : `-${display}`;
        }
        updateDisplay(); return;
      }

      if (action === '%') {
        const val = parseFloat(display);
        if (!isNaN(val)) display = String(val / 100);
        updateDisplay(); return;
      }

      if (isNum) {
        if (justEvaluated || display === '0') {
          display = action;
          if (justEvaluated) { expr = ''; operator = null; prevValue = null; }
          justEvaluated = false;
        } else {
          if (display.replace('-', '').length < 15) {
            display += action;
          }
        }
        updateDisplay(); return;
      }

      if (action === '.') {
        if (justEvaluated) { display = '0.'; justEvaluated = false; }
        else if (!display.includes('.')) { display += '.'; }
        updateDisplay(); return;
      }

      if (['+', '-', '*', '/'].includes(action)) {
        if (prevValue !== null && operator && !justEvaluated) {
          const result = evaluate(prevValue, parseFloat(display), operator);
          display = formatResult(result);
          prevValue = result;
        } else {
          prevValue = parseFloat(display);
        }
        operator = action;
        const opLabel = { '+': '+', '-': '−', '*': '×', '/': '÷' }[action];
        expr = `${display} ${opLabel}`;
        justEvaluated = false;
        updateDisplay(); return;
      }

      if (action === '=') {
        if (operator !== null && prevValue !== null) {
          const cur = parseFloat(display);
          const result = evaluate(prevValue, cur, operator);
          const opLabel = { '+': '+', '-': '−', '*': '×', '/': '÷' }[operator];
          expr = `${prevValue} ${opLabel} ${cur} =`;
          display = formatResult(result);
          prevValue = null; operator = null; justEvaluated = true;
        }
        updateDisplay();
      }
    }

    function evaluate(a, b, op) {
      switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b === 0 ? NaN : a / b;
        default:  return b;
      }
    }

    function formatResult(val) {
      if (isNaN(val)) return 'Error';
      if (!isFinite(val)) return val > 0 ? '∞' : '-∞';
      // Limit decimal places and remove trailing zeros
      const str = parseFloat(val.toPrecision(12)).toString();
      return str;
    }

    // Click handler
    el.querySelector('.calc-keys').addEventListener('click', e => {
      const btn = e.target.closest('.calc-key');
      if (btn) handleAction(btn.dataset.action);
    });

    // Keyboard handler
    const keyMap = {
      '0':'0','1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9',
      '.':'.', 'Enter':'=', '=':'=', 'Escape':'clear',
      '+':'+', '-':'-', '*':'*', '/':'/',
      'Backspace':'backspace',
    };

    el.addEventListener('keydown', e => {
      const action = keyMap[e.key];
      if (!action) return;
      e.preventDefault();
      if (action === 'backspace') {
        if (display.length > 1 && !justEvaluated) {
          display = display.slice(0, -1) || '0';
        } else {
          display = '0';
        }
        updateDisplay();
      } else {
        handleAction(action);
      }
      // Animate key press
      const btn = el.querySelector(`.calc-key[data-action="${CSS.escape(action)}"]`);
      if (btn) {
        btn.classList.add('active');
        setTimeout(() => btn.classList.remove('active'), 100);
      }
    });

    updateDisplay();
  }

  NightOS.registerApp('calculator', {
    title: 'Calculator',
    icon: '🔢',
    open,
  });
})();
