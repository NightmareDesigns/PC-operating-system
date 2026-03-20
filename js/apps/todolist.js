/**
 * NightmareOS — Todo List App
 * Simple persistent task manager with categories and priorities.
 */

'use strict';

(function () {
  const STORE_KEY = 'nightmareos_todos';

  function loadTodos() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]'); }
    catch (_) { return []; }
  }

  function saveTodos(list) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); }
    catch (_) { /* quota exceeded */ }
  }

  function open() {
    const el = WindowManager.create({
      id: 'todolist',
      title: 'Todo List',
      icon: '✅',
      width: 480,
      height: 520,
      content: buildUI(),
    });
    initTodo(el);
  }

  function buildUI() {
    return `
      <div class="todo-app">
        <div class="todo-input-row">
          <input type="text" class="todo-input" id="todo-input" placeholder="Add a new task…"
                 autocomplete="off" aria-label="New task" />
          <select class="todo-priority" id="todo-priority" aria-label="Priority">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
          </select>
          <button class="todo-add-btn" id="todo-add-btn" aria-label="Add task">+</button>
        </div>
        <div class="todo-filters">
          <button class="todo-filter active" data-filter="all">All</button>
          <button class="todo-filter" data-filter="active">Active</button>
          <button class="todo-filter" data-filter="done">Done</button>
        </div>
        <div class="todo-list" id="todo-list" role="list" aria-label="Task list"></div>
        <div class="todo-footer">
          <span id="todo-count">0 tasks</span>
          <button class="todo-clear-btn" id="todo-clear-done">Clear Done</button>
        </div>
      </div>`;
  }

  function initTodo(el) {
    let todos = loadTodos();
    let filter = 'all';
    const listEl = el.querySelector('#todo-list');
    const inputEl = el.querySelector('#todo-input');
    const priorityEl = el.querySelector('#todo-priority');
    const countEl = el.querySelector('#todo-count');

    function render() {
      const filtered = todos.filter(t => {
        if (filter === 'active') return !t.done;
        if (filter === 'done') return t.done;
        return true;
      });
      listEl.innerHTML = filtered.map(t => `
        <div class="todo-item ${t.done ? 'todo-done' : ''}" data-id="${t.id}" role="listitem">
          <button class="todo-check" aria-label="${t.done ? 'Mark incomplete' : 'Mark complete'}">${t.done ? '☑' : '☐'}</button>
          <span class="todo-text">${escHtml(t.text)}</span>
          <span class="todo-badge todo-badge-${t.priority}">${t.priority}</span>
          <button class="todo-delete" aria-label="Delete task">✕</button>
        </div>
      `).join('');

      // Wire events
      listEl.querySelectorAll('.todo-check').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.closest('.todo-item').dataset.id, 10);
          const todo = todos.find(t => t.id === id);
          if (todo) { todo.done = !todo.done; saveTodos(todos); render(); }
        });
      });
      listEl.querySelectorAll('.todo-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.closest('.todo-item').dataset.id, 10);
          todos = todos.filter(t => t.id !== id);
          saveTodos(todos);
          render();
        });
      });

      const active = todos.filter(t => !t.done).length;
      countEl.textContent = `${active} task${active !== 1 ? 's' : ''} remaining`;
    }

    function addTodo() {
      const text = inputEl.value.trim();
      if (!text) return;
      const id = Date.now();
      todos.push({ id, text, priority: priorityEl.value, done: false });
      saveTodos(todos);
      inputEl.value = '';
      render();
    }

    el.querySelector('#todo-add-btn').addEventListener('click', addTodo);
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') addTodo();
    });

    el.querySelectorAll('.todo-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.todo-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filter = btn.dataset.filter;
        render();
      });
    });

    el.querySelector('#todo-clear-done').addEventListener('click', () => {
      todos = todos.filter(t => !t.done);
      saveTodos(todos);
      render();
    });

    render();
  }

  NightOS.registerApp('todolist', {
    title: 'Todo List',
    icon: '✅',
    open,
  });
})();
