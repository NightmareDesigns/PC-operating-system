/**
 * NightmareOS — Unit Converter
 * Convert between common units of measurement.
 */

'use strict';

(function () {
  function open() {
    var el = WindowManager.create({
      id: 'unitconverter',
      title: 'Unit Converter',
      icon: '📏',
      width: 440,
      height: 480,
      resizable: false,
      content: buildUI(),
    });
    initConverter(el);
  }

  var CATEGORIES = {
    Length: {
      units: ['Meter', 'Kilometer', 'Centimeter', 'Millimeter', 'Mile', 'Yard', 'Foot', 'Inch'],
      toBase: [1, 1000, 0.01, 0.001, 1609.344, 0.9144, 0.3048, 0.0254],
    },
    Weight: {
      units: ['Kilogram', 'Gram', 'Milligram', 'Pound', 'Ounce', 'Ton (metric)'],
      toBase: [1, 0.001, 0.000001, 0.453592, 0.0283495, 1000],
    },
    Temperature: {
      units: ['Celsius', 'Fahrenheit', 'Kelvin'],
      custom: true,
    },
    Volume: {
      units: ['Liter', 'Milliliter', 'Gallon (US)', 'Quart', 'Cup', 'Fluid Ounce'],
      toBase: [1, 0.001, 3.78541, 0.946353, 0.236588, 0.0295735],
    },
    Area: {
      units: ['Square Meter', 'Square Kilometer', 'Hectare', 'Acre', 'Square Foot', 'Square Inch'],
      toBase: [1, 1000000, 10000, 4046.86, 0.092903, 0.00064516],
    },
    Speed: {
      units: ['m/s', 'km/h', 'mph', 'Knot'],
      toBase: [1, 0.277778, 0.44704, 0.514444],
    },
    Time: {
      units: ['Second', 'Minute', 'Hour', 'Day', 'Week', 'Year'],
      toBase: [1, 60, 3600, 86400, 604800, 31536000],
    },
    Data: {
      units: ['Byte', 'Kilobyte', 'Megabyte', 'Gigabyte', 'Terabyte', 'Bit'],
      toBase: [1, 1024, 1048576, 1073741824, 1099511627776, 0.125],
    },
  };

  function convertTemperature(value, from, to) {
    // Convert to Celsius first
    var c;
    if (from === 'Celsius') c = value;
    else if (from === 'Fahrenheit') c = (value - 32) * 5 / 9;
    else c = value - 273.15; // Kelvin

    // Convert from Celsius to target
    if (to === 'Celsius') return c;
    if (to === 'Fahrenheit') return c * 9 / 5 + 32;
    return c + 273.15; // Kelvin
  }

  /** Format a numeric result, trimming trailing zeros */
  function formatNum(val, precision) {
    if (val % 1 === 0) return String(val);
    return val.toPrecision(precision).replace(/0+$/, '').replace(/\.$/, '');
  }

  function buildUI() {
    var catOptions = Object.keys(CATEGORIES).map(function (cat) {
      return '<option value="' + cat + '">' + cat + '</option>';
    }).join('');

    return [
      '<div class="uc-app">',
      '  <div class="uc-category-row">',
      '    <label>Category:</label>',
      '    <select class="uc-select" id="uc-category" aria-label="Category">' + catOptions + '</select>',
      '  </div>',
      '  <div class="uc-convert-row">',
      '    <div class="uc-from">',
      '      <label>From:</label>',
      '      <select class="uc-select" id="uc-from" aria-label="From unit"></select>',
      '      <input type="number" class="uc-input" id="uc-input" value="1" aria-label="Input value"/>',
      '    </div>',
      '    <button class="uc-swap" id="uc-swap" title="Swap units">⇄</button>',
      '    <div class="uc-to">',
      '      <label>To:</label>',
      '      <select class="uc-select" id="uc-to" aria-label="To unit"></select>',
      '      <input type="text" class="uc-input uc-result" id="uc-result" readonly aria-label="Result"/>',
      '    </div>',
      '  </div>',
      '  <div class="uc-formula" id="uc-formula"></div>',
      '  <div class="uc-quick-title">Quick Reference</div>',
      '  <div class="uc-quick" id="uc-quick"></div>',
      '</div>'
    ].join('\n');
  }

  function initConverter(el) {
    var catSelect = el.querySelector('#uc-category');
    var fromSelect = el.querySelector('#uc-from');
    var toSelect = el.querySelector('#uc-to');
    var inputEl = el.querySelector('#uc-input');
    var resultEl = el.querySelector('#uc-result');
    var formulaEl = el.querySelector('#uc-formula');
    var quickEl = el.querySelector('#uc-quick');

    function populateUnits() {
      var cat = CATEGORIES[catSelect.value];
      var opts = cat.units.map(function (u, i) {
        return '<option value="' + i + '">' + u + '</option>';
      }).join('');
      fromSelect.innerHTML = opts;
      toSelect.innerHTML = opts;
      if (cat.units.length > 1) toSelect.selectedIndex = 1;
      convert();
    }

    function convert() {
      var catName = catSelect.value;
      var cat = CATEGORIES[catName];
      var fromIdx = parseInt(fromSelect.value, 10);
      var toIdx = parseInt(toSelect.value, 10);
      var val = parseFloat(inputEl.value);
      if (isNaN(val)) { resultEl.value = ''; formulaEl.textContent = ''; return; }

      var result;
      if (cat.custom && catName === 'Temperature') {
        result = convertTemperature(val, cat.units[fromIdx], cat.units[toIdx]);
      } else {
        var baseVal = val * cat.toBase[fromIdx];
        result = baseVal / cat.toBase[toIdx];
      }

      resultEl.value = formatNum(result, 8);
      formulaEl.textContent = val + ' ' + cat.units[fromIdx] + ' = ' + resultEl.value + ' ' + cat.units[toIdx];

      // Quick reference: convert 1, 10, 100
      quickEl.innerHTML = [1, 10, 100, 1000].map(function (n) {
        var r;
        if (cat.custom && catName === 'Temperature') {
          r = convertTemperature(n, cat.units[fromIdx], cat.units[toIdx]);
        } else {
          r = (n * cat.toBase[fromIdx]) / cat.toBase[toIdx];
        }
        return '<div class="uc-quick-item">' + n + ' ' + cat.units[fromIdx] + ' = ' + formatNum(r, 6) + ' ' + cat.units[toIdx] + '</div>';
      }).join('');
    }

    catSelect.addEventListener('change', populateUnits);
    fromSelect.addEventListener('change', convert);
    toSelect.addEventListener('change', convert);
    inputEl.addEventListener('input', convert);

    el.querySelector('#uc-swap').addEventListener('click', function () {
      var tmp = fromSelect.value;
      fromSelect.value = toSelect.value;
      toSelect.value = tmp;
      convert();
    });

    populateUnits();
  }

  NightOS.registerApp('unitconverter', {
    title: 'Unit Converter',
    icon: '📏',
    open: open,
  });
})();
