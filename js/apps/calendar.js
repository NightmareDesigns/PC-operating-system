/**
 * NightmareOS — Calendar App
 * Monthly calendar view with simple event notes stored in localStorage.
 */

'use strict';

(function () {
  const STORE_KEY = 'nightmareos_calendar_events';
  let events = {}; // { 'YYYY-MM-DD': [{id, text}] }
  let nextEventId = 1;

  function loadEvents() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        events = data.events || {};
        nextEventId = data.nextId || 1;
      }
    } catch (_) {}
  }

  function saveEvents() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ events, nextId: nextEventId }));
    } catch (_) {}
  }

  loadEvents();

  const MONTH_NAMES = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function open() {
    const el = WindowManager.create({
      id: 'calendar',
      title: 'Calendar',
      icon: '📅',
      width: 520,
      height: 520,
      resizable: false,
      content: buildUI(),
    });
    initCalendar(el);
  }

  function buildUI() {
    return `
      <div class="cal-layout">
        <div class="cal-header">
          <button class="cal-nav-btn" id="cal-prev" aria-label="Previous month">‹</button>
          <span class="cal-month-label" id="cal-month-label"></span>
          <button class="cal-nav-btn" id="cal-next" aria-label="Next month">›</button>
          <button class="cal-nav-btn" id="cal-today" title="Go to today">Today</button>
        </div>
        <div class="cal-days-header">
          ${DAY_NAMES.map(d => `<div class="cal-day-name">${d}</div>`).join('')}
        </div>
        <div class="cal-grid" id="cal-grid" role="grid" aria-label="Calendar"></div>
        <div class="cal-events-panel" id="cal-events-panel">
          <div class="cal-events-title" id="cal-events-title">Select a day to see events</div>
          <div class="cal-events-list" id="cal-events-list"></div>
          <div class="cal-add-row hidden" id="cal-add-row">
            <input type="text" class="cal-event-input" id="cal-event-input" placeholder="Add event…" maxlength="120" />
            <button class="win-toolbar-btn" id="cal-event-add-btn">Add</button>
          </div>
        </div>
      </div>`;
  }

  function initCalendar(el) {
    const grid      = el.querySelector('#cal-grid');
    const monthLbl  = el.querySelector('#cal-month-label');
    const evPanel   = el.querySelector('#cal-events-panel');
    const evTitle   = el.querySelector('#cal-events-title');
    const evList    = el.querySelector('#cal-events-list');
    const addRow    = el.querySelector('#cal-add-row');
    const evInput   = el.querySelector('#cal-event-input');
    const evAddBtn  = el.querySelector('#cal-event-add-btn');

    const today = new Date();
    let viewYear  = today.getFullYear();
    let viewMonth = today.getMonth(); // 0-based
    let selectedDate = null;

    function dateKey(y, m, d) {
      return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }

    function renderGrid() {
      grid.innerHTML = '';
      monthLbl.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

      const firstDay = new Date(viewYear, viewMonth, 1).getDay();
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

      // Padding blanks
      for (let i = 0; i < firstDay; i++) {
        const blank = document.createElement('div');
        blank.className = 'cal-cell cal-blank';
        grid.appendChild(blank);
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        const key = dateKey(viewYear, viewMonth, d);
        const isToday = (d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear());
        const hasEvents = events[key] && events[key].length > 0;
        cell.className = `cal-cell${isToday ? ' today' : ''}${selectedDate === key ? ' selected' : ''}`;
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `${MONTH_NAMES[viewMonth]} ${d}, ${viewYear}`);
        cell.setAttribute('tabindex', '0');
        cell.dataset.key = key;
        cell.dataset.d = d;

        const num = document.createElement('span');
        num.className = 'cal-day-num';
        num.textContent = d;
        cell.appendChild(num);

        if (hasEvents) {
          const dot = document.createElement('span');
          dot.className = 'cal-event-dot';
          dot.textContent = events[key].length;
          cell.appendChild(dot);
        }

        cell.addEventListener('click', () => selectDay(key, d));
        cell.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectDay(key, d); }
        });

        grid.appendChild(cell);
      }
    }

    function selectDay(key, d) {
      selectedDate = key;
      renderGrid();
      evTitle.textContent = `${MONTH_NAMES[viewMonth]} ${d}, ${viewYear}`;
      addRow.classList.remove('hidden');
      renderEvents(key);
    }

    function renderEvents(key) {
      evList.innerHTML = '';
      const dayEvents = events[key] || [];
      if (dayEvents.length === 0) {
        evList.innerHTML = '<div style="color:var(--text-secondary);font-size:0.8rem;padding:4px 0;">No events</div>';
      } else {
        dayEvents.forEach(ev => {
          const row = document.createElement('div');
          row.className = 'cal-ev-row';
          row.innerHTML = `<span class="cal-ev-text">${escHtml(ev.text)}</span>
            <button class="cal-ev-del" data-id="${ev.id}" aria-label="Delete event">✕</button>`;
          row.querySelector('.cal-ev-del').addEventListener('click', () => {
            events[key] = (events[key] || []).filter(e => e.id !== ev.id);
            if (events[key].length === 0) delete events[key];
            saveEvents();
            renderEvents(key);
            renderGrid();
          });
          evList.appendChild(row);
        });
      }
    }

    evAddBtn.addEventListener('click', () => {
      const txt = evInput.value.trim();
      if (!txt || !selectedDate) return;
      if (!events[selectedDate]) events[selectedDate] = [];
      events[selectedDate].push({ id: nextEventId++, text: txt });
      saveEvents();
      evInput.value = '';
      renderEvents(selectedDate);
      renderGrid();
    });

    evInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') evAddBtn.click();
    });

    el.querySelector('#cal-prev').addEventListener('click', () => {
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      renderGrid();
    });

    el.querySelector('#cal-next').addEventListener('click', () => {
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      renderGrid();
    });

    el.querySelector('#cal-today').addEventListener('click', () => {
      viewYear  = today.getFullYear();
      viewMonth = today.getMonth();
      selectedDate = null;
      addRow.classList.add('hidden');
      evTitle.textContent = 'Select a day to see events';
      evList.innerHTML = '';
      renderGrid();
    });

    renderGrid();
  }

  NightOS.registerApp('calendar', {
    title: 'Calendar',
    icon: '📅',
    open,
  });
})();
