/**
 * NightmareOS — Habit Tracker
 * Track daily habits with streak counters and a weekly heatmap grid.
 */

'use strict';

(function () {
  var STORE_KEY = 'nightmareos_habits';
  var DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function loadHabits() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
    catch (_) { return []; }
  }

  function saveHabits(list) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); }
    catch (_) { /* ignore */ }
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function open() {
    var el = WindowManager.create({
      id: 'habittracker',
      title: 'Habit Tracker',
      icon: '📈',
      width: 540,
      height: 520,
      content: buildUI(),
    });
    initTracker(el);
  }

  function buildUI() {
    return [
      '<div class="habit-app">',
      '  <div class="habit-input-row">',
      '    <input type="text" class="habit-input" id="habit-input" placeholder="New habit…" aria-label="New habit"/>',
      '    <select class="habit-color-sel" id="habit-color" aria-label="Color">',
      '      <option value="#4f8ef7">🔵 Blue</option>',
      '      <option value="#44bb44">🟢 Green</option>',
      '      <option value="#ff8800">🟠 Orange</option>',
      '      <option value="#ff4444">🔴 Red</option>',
      '      <option value="#aa66cc">🟣 Purple</option>',
      '    </select>',
      '    <button class="habit-add-btn" id="habit-add-btn">+ Add</button>',
      '  </div>',
      '  <div class="habit-list" id="habit-list" role="list"></div>',
      '</div>'
    ].join('\n');
  }

  function initTracker(el) {
    var habits = loadHabits();
    var listEl = el.querySelector('#habit-list');
    var inputEl = el.querySelector('#habit-input');
    var colorEl = el.querySelector('#habit-color');
    var idCounter = habits.length > 0 ? Math.max.apply(null, habits.map(function (h) { return h.id; })) + 1 : 1;

    function getStreak(dates) {
      if (!dates || dates.length === 0) return 0;
      var sorted = dates.slice().sort().reverse();
      var streak = 0;
      var d = new Date();
      for (var i = 0; i < 365; i++) {
        var ds = d.toISOString().slice(0, 10);
        if (sorted.indexOf(ds) !== -1) {
          streak++;
        } else if (i > 0) {
          break;
        }
        d.setDate(d.getDate() - 1);
      }
      return streak;
    }

    function getLast7Days() {
      var days = [];
      for (var i = 6; i >= 0; i--) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
      }
      return days;
    }

    function render() {
      var today = todayStr();
      var last7 = getLast7Days();
      var dayLabels = last7.map(function (d) {
        return DAY_NAMES[new Date(d + 'T12:00:00').getDay()];
      });

      listEl.innerHTML = habits.length === 0
        ? '<div class="habit-empty">No habits yet. Add one above!</div>'
        : habits.map(function (h) {
            var streak = getStreak(h.dates || []);
            var doneToday = (h.dates || []).indexOf(today) !== -1;
            var heatmap = last7.map(function (d, idx) {
              var done = (h.dates || []).indexOf(d) !== -1;
              return '<div class="habit-cell ' + (done ? 'habit-cell-done' : '') + '" ' +
                     'style="' + (done ? 'background:' + h.color : '') + '" ' +
                     'title="' + dayLabels[idx] + ' ' + d + '">' +
                     dayLabels[idx].charAt(0) + '</div>';
            }).join('');

            return [
              '<div class="habit-item" data-id="' + h.id + '" role="listitem">',
              '  <div class="habit-header">',
              '    <button class="habit-check ' + (doneToday ? 'habit-checked' : '') + '"',
              '            style="' + (doneToday ? 'background:' + h.color + ';border-color:' + h.color : '') + '"',
              '            aria-label="' + (doneToday ? 'Completed' : 'Mark as done') + '">',
              '      ' + (doneToday ? '✓' : '') + '',
              '    </button>',
              '    <span class="habit-name">' + escHtml(h.name) + '</span>',
              '    <span class="habit-streak" title="Current streak">🔥 ' + streak + '</span>',
              '    <button class="habit-del" title="Delete habit" aria-label="Delete habit">✕</button>',
              '  </div>',
              '  <div class="habit-heatmap">' + heatmap + '</div>',
              '</div>'
            ].join('\n');
          }).join('');

      // Wire events
      listEl.querySelectorAll('.habit-check').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = parseInt(btn.closest('.habit-item').dataset.id, 10);
          var habit = habits.find(function (h) { return h.id === id; });
          if (!habit) return;
          if (!habit.dates) habit.dates = [];
          var today2 = todayStr();
          var idx = habit.dates.indexOf(today2);
          if (idx !== -1) {
            habit.dates.splice(idx, 1);
          } else {
            habit.dates.push(today2);
          }
          saveHabits(habits);
          render();
        });
      });

      listEl.querySelectorAll('.habit-del').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = parseInt(btn.closest('.habit-item').dataset.id, 10);
          habits = habits.filter(function (h) { return h.id !== id; });
          saveHabits(habits);
          render();
        });
      });
    }

    function addHabit() {
      var name = inputEl.value.trim();
      if (!name) return;
      habits.push({ id: idCounter++, name: name, color: colorEl.value, dates: [] });
      saveHabits(habits);
      inputEl.value = '';
      render();
    }

    el.querySelector('#habit-add-btn').addEventListener('click', addHabit);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addHabit();
    });

    render();
  }

  NightOS.registerApp('habittracker', {
    title: 'Habit Tracker',
    icon: '📈',
    open: open,
  });
})();
