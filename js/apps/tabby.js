/**
 * NightmareOS — Tabby AI Coding Assistant
 * Integrates the Tabby self-hosted AI coding assistant (https://github.com/TabbyML/tabby).
 * Connects to a local or remote Tabby server and provides code chat and completion features.
 */

'use strict';

(function () {
  var STORAGE_KEY = 'nightos_tabby';

  var DEFAULT_STATE = {
    serverUrl: 'http://localhost:8080',
    authToken: '',
    model: '',
    chatHistory: [],
  };

  /* ── Persistence ──────────────────────────────────────────────── */
  function loadState() {
    try {
      var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return Object.assign({}, DEFAULT_STATE, stored || {});
    } catch (_) {
      return Object.assign({}, DEFAULT_STATE);
    }
  }

  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  /* ── HTML helpers ─────────────────────────────────────────────── */
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Tabby API ────────────────────────────────────────────────── */
  function getHeaders(state) {
    var headers = { 'Content-Type': 'application/json' };
    if (state.authToken) {
      headers['Authorization'] = 'Bearer ' + state.authToken;
    }
    return headers;
  }

  function checkHealth(state) {
    return fetch(state.serverUrl.replace(/\/$/, '') + '/v1/health', {
      method: 'GET',
      headers: getHeaders(state),
      signal: AbortSignal.timeout(5000),
    });
  }

  function sendChatMessage(state, messages) {
    var body = { messages: messages };
    if (state.model) body.model = state.model;
    return fetch(state.serverUrl.replace(/\/$/, '') + '/v1/chat/completions', {
      method: 'POST',
      headers: getHeaders(state),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
  }

  function requestCompletion(state, prompt, language) {
    var body = {
      prompt: prompt,
      language: language || undefined,
    };
    if (state.model) body.model = state.model;
    return fetch(state.serverUrl.replace(/\/$/, '') + '/v1/completions', {
      method: 'POST',
      headers: getHeaders(state),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
  }

  /* ── UI builder ───────────────────────────────────────────────── */
  function buildUI() {
    return `
      <div class="tabby-root">
        <!-- Sidebar -->
        <aside class="tabby-sidebar">
          <div class="tabby-logo">
            <span class="tabby-logo-icon">🤖</span>
            <span class="tabby-logo-text">Tabby</span>
          </div>
          <nav class="tabby-nav">
            <button class="tabby-nav-btn active" data-tab="chat">💬 Chat</button>
            <button class="tabby-nav-btn" data-tab="complete">⚡ Complete</button>
            <button class="tabby-nav-btn" data-tab="settings">⚙️ Settings</button>
          </nav>
          <div class="tabby-status-bar">
            <span class="tabby-status-dot" id="tabby-status-dot"></span>
            <span class="tabby-status-text" id="tabby-status-text">Checking…</span>
          </div>
        </aside>

        <!-- Main content area -->
        <main class="tabby-main">

          <!-- ── Chat Tab ── -->
          <section class="tabby-panel active" id="tabby-panel-chat">
            <div class="tabby-panel-header">
              <span>💬 AI Chat</span>
              <button class="tabby-clear-btn" id="tabby-clear-chat" title="Clear conversation">🗑️ Clear</button>
            </div>
            <div class="tabby-messages" id="tabby-messages" role="log" aria-live="polite"></div>
            <div class="tabby-input-row">
              <textarea class="tabby-textarea" id="tabby-chat-input"
                        placeholder="Ask Tabby a coding question… (Shift+Enter for newline)"
                        rows="3" aria-label="Chat input"></textarea>
              <button class="tabby-send-btn" id="tabby-chat-send" aria-label="Send message">Send ↑</button>
            </div>
          </section>

          <!-- ── Completion Tab ── -->
          <section class="tabby-panel" id="tabby-panel-complete">
            <div class="tabby-panel-header">⚡ Code Completion</div>
            <div class="tabby-complete-form">
              <label class="tabby-label" for="tabby-lang">Language</label>
              <select class="tabby-select" id="tabby-lang" aria-label="Programming language">
                <option value="">Auto-detect</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
                <option value="csharp">C#</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="ruby">Ruby</option>
                <option value="php">PHP</option>
                <option value="swift">Swift</option>
                <option value="kotlin">Kotlin</option>
                <option value="bash">Bash</option>
                <option value="sql">SQL</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
              </select>
              <label class="tabby-label" for="tabby-prompt">Code prompt</label>
              <textarea class="tabby-textarea tabby-prompt-area" id="tabby-prompt"
                        placeholder="Paste your code prefix here and Tabby will complete it…"
                        rows="8" aria-label="Code prompt" spellcheck="false"></textarea>
              <button class="tabby-send-btn" id="tabby-complete-btn">⚡ Complete</button>
              <div class="tabby-completion-result hidden" id="tabby-completion-result">
                <div class="tabby-result-header">
                  <span>✅ Completion</span>
                  <button class="tabby-copy-btn" id="tabby-copy-completion" title="Copy result">📋 Copy</button>
                </div>
                <pre class="tabby-code-block" id="tabby-completion-output"></pre>
              </div>
            </div>
          </section>

          <!-- ── Settings Tab ── -->
          <section class="tabby-panel" id="tabby-panel-settings">
            <div class="tabby-panel-header">⚙️ Server Settings</div>
            <div class="tabby-settings-form">
              <label class="tabby-label" for="tabby-server-url">
                Tabby Server URL
                <span class="tabby-hint">(e.g. http://localhost:8080)</span>
              </label>
              <input class="tabby-input" type="url" id="tabby-server-url"
                     placeholder="http://localhost:8080" aria-label="Tabby server URL" />

              <label class="tabby-label" for="tabby-auth-token">
                Auth Token
                <span class="tabby-hint">(optional — required if auth is enabled)</span>
              </label>
              <input class="tabby-input" type="password" id="tabby-auth-token"
                     placeholder="Leave blank if no auth is configured" aria-label="Auth token" />

              <label class="tabby-label" for="tabby-model">
                Model
                <span class="tabby-hint">(optional — leave blank to use server default)</span>
              </label>
              <input class="tabby-input" type="text" id="tabby-model"
                     placeholder="e.g. TabbyML/StarCoder-1B" aria-label="Model name" />

              <div class="tabby-settings-actions">
                <button class="tabby-send-btn" id="tabby-save-settings">💾 Save &amp; Test Connection</button>
                <span class="tabby-save-feedback hidden" id="tabby-save-feedback"></span>
              </div>

              <div class="tabby-info-box">
                <strong>🚀 Getting started with Tabby</strong>
                <p>Tabby is a self-hosted AI coding assistant. Run it locally with Docker:</p>
                <pre class="tabby-code-block">docker run -it \\
  --gpus all \\
  -p 8080:8080 \\
  -v ~/.tabby:/data \\
  tabbyml/tabby serve \\
  --model TabbyML/StarCoder-1B</pre>
                <p>Or try the <a class="tabby-link" href="https://app.tabbyml.com" target="_blank" rel="noopener noreferrer">Tabby Cloud</a> hosted version.</p>
              </div>
            </div>
          </section>

        </main>
      </div>

      <style>
        .tabby-root {
          display: flex;
          height: 100%;
          font-size: 13px;
          background: var(--win-bg, #1e1e2e);
          color: var(--win-fg, #cdd6f4);
          overflow: hidden;
        }
        .tabby-sidebar {
          width: 140px;
          min-width: 140px;
          background: var(--win-header, #181825);
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--win-border, #313244);
          padding: 10px 0;
        }
        .tabby-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 14px 14px;
          border-bottom: 1px solid var(--win-border, #313244);
          margin-bottom: 8px;
        }
        .tabby-logo-icon { font-size: 20px; }
        .tabby-logo-text { font-weight: 700; font-size: 14px; letter-spacing: 0.5px; }
        .tabby-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0 6px;
        }
        .tabby-nav-btn {
          background: none;
          border: none;
          border-radius: 6px;
          padding: 8px 10px;
          text-align: left;
          cursor: pointer;
          color: var(--win-fg, #cdd6f4);
          font-size: 12px;
          transition: background 0.15s;
        }
        .tabby-nav-btn:hover { background: var(--win-hover, #313244); }
        .tabby-nav-btn.active { background: var(--accent, #8b00ff); color: #fff; }
        .tabby-status-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          border-top: 1px solid var(--win-border, #313244);
          font-size: 11px;
        }
        .tabby-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #6c7086;
          flex-shrink: 0;
        }
        .tabby-status-dot.online  { background: #a6e3a1; }
        .tabby-status-dot.offline { background: #f38ba8; }
        .tabby-status-text { color: var(--win-fg-dim, #a6adc8); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .tabby-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .tabby-panel {
          display: none;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
        .tabby-panel.active { display: flex; }
        .tabby-panel-header {
          padding: 10px 14px;
          font-weight: 600;
          background: var(--win-header, #181825);
          border-bottom: 1px solid var(--win-border, #313244);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .tabby-clear-btn {
          background: none;
          border: 1px solid var(--win-border, #313244);
          border-radius: 4px;
          color: var(--win-fg-dim, #a6adc8);
          cursor: pointer;
          font-size: 11px;
          padding: 3px 8px;
        }
        .tabby-clear-btn:hover { background: var(--win-hover, #313244); }

        /* Chat */
        .tabby-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .tabby-msg {
          max-width: 85%;
          padding: 8px 12px;
          border-radius: 8px;
          line-height: 1.5;
          word-break: break-word;
        }
        .tabby-msg-user {
          align-self: flex-end;
          background: var(--accent, #8b00ff);
          color: #fff;
          border-radius: 8px 8px 2px 8px;
        }
        .tabby-msg-assistant {
          align-self: flex-start;
          background: var(--win-hover, #313244);
          color: var(--win-fg, #cdd6f4);
          border-radius: 8px 8px 8px 2px;
        }
        .tabby-msg-error {
          align-self: flex-start;
          background: #3b1215;
          color: #f38ba8;
          border-radius: 8px;
          font-size: 12px;
        }
        .tabby-msg-system {
          align-self: center;
          background: none;
          color: var(--win-fg-dim, #a6adc8);
          font-style: italic;
          font-size: 11px;
        }
        .tabby-msg code {
          background: rgba(0,0,0,0.25);
          border-radius: 3px;
          padding: 1px 4px;
          font-family: monospace;
          font-size: 12px;
        }
        .tabby-msg pre {
          background: rgba(0,0,0,0.3);
          border-radius: 6px;
          padding: 8px;
          overflow-x: auto;
          margin: 6px 0 0;
          font-size: 12px;
          font-family: monospace;
          line-height: 1.4;
        }
        .tabby-msg-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 4px;
          opacity: 0.7;
        }
        .tabby-input-row {
          display: flex;
          gap: 8px;
          padding: 10px 14px;
          border-top: 1px solid var(--win-border, #313244);
          background: var(--win-header, #181825);
          flex-shrink: 0;
        }
        .tabby-textarea {
          flex: 1;
          background: var(--win-bg, #1e1e2e);
          border: 1px solid var(--win-border, #313244);
          border-radius: 6px;
          color: var(--win-fg, #cdd6f4);
          font-size: 13px;
          padding: 8px;
          resize: none;
          font-family: inherit;
          line-height: 1.4;
        }
        .tabby-textarea:focus { outline: none; border-color: var(--accent, #8b00ff); }
        .tabby-send-btn {
          background: var(--accent, #8b00ff);
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          align-self: flex-end;
          white-space: nowrap;
        }
        .tabby-send-btn:hover { opacity: 0.9; }
        .tabby-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Completion tab */
        .tabby-complete-form {
          flex: 1;
          overflow-y: auto;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .tabby-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--win-fg-dim, #a6adc8);
        }
        .tabby-hint {
          font-weight: 400;
          opacity: 0.7;
          margin-left: 6px;
        }
        .tabby-select, .tabby-input {
          background: var(--win-bg, #1e1e2e);
          border: 1px solid var(--win-border, #313244);
          border-radius: 6px;
          color: var(--win-fg, #cdd6f4);
          font-size: 13px;
          padding: 7px 10px;
          width: 100%;
          box-sizing: border-box;
        }
        .tabby-select:focus, .tabby-input:focus { outline: none; border-color: var(--accent, #8b00ff); }
        .tabby-prompt-area {
          min-height: 120px;
          font-family: monospace;
          font-size: 12px;
          resize: vertical;
        }
        .tabby-completion-result {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .tabby-completion-result.hidden { display: none; }
        .tabby-result-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 600;
        }
        .tabby-copy-btn {
          background: none;
          border: 1px solid var(--win-border, #313244);
          border-radius: 4px;
          color: var(--win-fg-dim, #a6adc8);
          cursor: pointer;
          font-size: 11px;
          padding: 3px 8px;
        }
        .tabby-copy-btn:hover { background: var(--win-hover, #313244); }
        .tabby-code-block {
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--win-border, #313244);
          border-radius: 6px;
          padding: 10px;
          font-family: monospace;
          font-size: 12px;
          line-height: 1.5;
          overflow-x: auto;
          white-space: pre;
          margin: 0;
          color: var(--win-fg, #cdd6f4);
        }

        /* Settings tab */
        .tabby-settings-form {
          flex: 1;
          overflow-y: auto;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .tabby-settings-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .tabby-save-feedback {
          font-size: 12px;
        }
        .tabby-save-feedback.hidden { display: none; }
        .tabby-save-feedback.success { color: #a6e3a1; }
        .tabby-save-feedback.error   { color: #f38ba8; }
        .tabby-info-box {
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--win-border, #313244);
          border-radius: 8px;
          padding: 12px 14px;
          margin-top: 6px;
          font-size: 12px;
          line-height: 1.6;
        }
        .tabby-info-box p { margin: 6px 0; }
        .tabby-info-box .tabby-code-block { margin: 6px 0; font-size: 11px; }
        .tabby-link { color: var(--accent, #8b00ff); }

        /* Thinking indicator */
        .tabby-typing {
          align-self: flex-start;
          color: var(--win-fg-dim, #a6adc8);
          font-style: italic;
          font-size: 12px;
        }
        .tabby-typing::after {
          content: '…';
          animation: tabby-blink 1.2s step-start infinite;
        }
        @keyframes tabby-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      </style>`;
  }

  /* ── Format assistant response with basic markdown ─────────────── */
  function formatMarkdown(text) {
    var safe = esc(text);
    // Code blocks ```lang\n...\n```
    safe = safe.replace(/```[\w]*\n?([\s\S]*?)```/g, function (_, code) {
      return '<pre>' + code + '</pre>';
    });
    // Inline code `...`
    safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold **...**
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Newlines to <br> (outside pre blocks — simple approach)
    safe = safe.replace(/\n/g, '<br>');
    return safe;
  }

  /* ── App init ──────────────────────────────────────────────────── */
  function init(el, state) {
    var messagesEl  = el.querySelector('#tabby-messages');
    var chatInput   = el.querySelector('#tabby-chat-input');
    var sendBtn     = el.querySelector('#tabby-chat-send');
    var clearBtn    = el.querySelector('#tabby-clear-chat');
    var promptArea  = el.querySelector('#tabby-prompt');
    var langSelect  = el.querySelector('#tabby-lang');
    var completeBtn = el.querySelector('#tabby-complete-btn');
    var resultDiv   = el.querySelector('#tabby-completion-result');
    var outputPre   = el.querySelector('#tabby-completion-output');
    var copyBtn     = el.querySelector('#tabby-copy-completion');
    var urlInput    = el.querySelector('#tabby-server-url');
    var tokenInput  = el.querySelector('#tabby-auth-token');
    var modelInput  = el.querySelector('#tabby-model');
    var saveBtn     = el.querySelector('#tabby-save-settings');
    var feedback    = el.querySelector('#tabby-save-feedback');
    var statusDot   = el.querySelector('#tabby-status-dot');
    var statusText  = el.querySelector('#tabby-status-text');

    /* ── Tab switching ── */
    el.querySelectorAll('.tabby-nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.querySelectorAll('.tabby-nav-btn').forEach(function (b) { b.classList.remove('active'); });
        el.querySelectorAll('.tabby-panel').forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        var panel = el.querySelector('#tabby-panel-' + btn.dataset.tab);
        if (panel) panel.classList.add('active');
      });
    });

    /* ── Server health check ── */
    function updateStatus(online, label) {
      statusDot.className = 'tabby-status-dot ' + (online ? 'online' : 'offline');
      statusText.textContent = label || (online ? 'Online' : 'Offline');
    }

    function pingServer() {
      updateStatus(false, 'Checking…');
      checkHealth(state)
        .then(function (res) {
          if (res.ok) {
            return res.json().then(function (data) {
              updateStatus(true, data.model ? data.model.split('/').pop() : 'Online');
            }).catch(function () { updateStatus(true, 'Online'); });
          }
          updateStatus(false, 'Error ' + res.status);
        })
        .catch(function (err) {
          updateStatus(false, err.name === 'AbortError' ? 'Timeout' : 'Offline');
        });
    }
    pingServer();

    /* ── Render saved chat history ── */
    function appendMessage(role, text) {
      var div = document.createElement('div');
      if (role === 'user') {
        div.className = 'tabby-msg tabby-msg-user';
        div.innerHTML = '<div class="tabby-msg-label">You</div>' + formatMarkdown(text);
      } else if (role === 'assistant') {
        div.className = 'tabby-msg tabby-msg-assistant';
        div.innerHTML = '<div class="tabby-msg-label">Tabby</div>' + formatMarkdown(text);
      } else if (role === 'error') {
        div.className = 'tabby-msg tabby-msg-error';
        div.textContent = '⚠️ ' + text;
      } else {
        div.className = 'tabby-msg tabby-msg-system';
        div.textContent = text;
      }
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return div;
    }

    if (state.chatHistory.length === 0) {
      appendMessage('system', 'Connect to your Tabby server and start asking coding questions.');
    } else {
      state.chatHistory.forEach(function (m) {
        appendMessage(m.role, m.content);
      });
    }

    /* ── Send chat message ── */
    function sendChat() {
      var text = chatInput.value.trim();
      if (!text) return;

      chatInput.value = '';
      sendBtn.disabled = true;

      state.chatHistory.push({ role: 'user', content: text });
      appendMessage('user', text);

      // Typing indicator
      var typingEl = document.createElement('div');
      typingEl.className = 'tabby-typing';
      typingEl.textContent = 'Tabby is thinking';
      messagesEl.appendChild(typingEl);
      messagesEl.scrollTop = messagesEl.scrollHeight;

      var messages = state.chatHistory.map(function (m) {
        return { role: m.role, content: m.content };
      });

      sendChatMessage(state, messages)
        .then(function (res) {
          typingEl.remove();
          if (!res.ok) {
            return res.text().then(function (body) {
              var msg = 'Server returned ' + res.status;
              try { var parsed = JSON.parse(body); if (parsed.message) msg = parsed.message; } catch (_) {}
              appendMessage('error', msg);
              sendBtn.disabled = false;
            });
          }
          return res.json().then(function (data) {
            var reply = '';
            if (data.choices && data.choices[0]) {
              reply = (data.choices[0].message && data.choices[0].message.content) ||
                      (data.choices[0].text) || '';
            }
            if (!reply) {
              appendMessage('error', 'Empty response from server.');
            } else {
              state.chatHistory.push({ role: 'assistant', content: reply });
              saveState(state);
              appendMessage('assistant', reply);
            }
            sendBtn.disabled = false;
          });
        })
        .catch(function (err) {
          typingEl.remove();
          appendMessage('error', err.name === 'AbortError' ? 'Request timed out.' : 'Could not reach Tabby server.');
          sendBtn.disabled = false;
        });
    }

    sendBtn.addEventListener('click', sendChat);
    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
    });

    clearBtn.addEventListener('click', function () {
      state.chatHistory = [];
      saveState(state);
      messagesEl.innerHTML = '';
      appendMessage('system', 'Conversation cleared.');
    });

    /* ── Code completion ── */
    completeBtn.addEventListener('click', function () {
      var prompt = promptArea.value;
      if (!prompt.trim()) return;
      var lang = langSelect.value;

      completeBtn.disabled = true;
      completeBtn.textContent = '⏳ Completing…';
      resultDiv.classList.add('hidden');

      requestCompletion(state, prompt, lang || undefined)
        .then(function (res) {
          if (!res.ok) {
            return res.text().then(function (body) {
              var msg = 'Server returned ' + res.status;
              try { var p = JSON.parse(body); if (p.message) msg = p.message; } catch (_) {}
              outputPre.textContent = '⚠️ ' + msg;
              resultDiv.classList.remove('hidden');
            });
          }
          return res.json().then(function (data) {
            var completion = '';
            if (data.choices && data.choices[0]) {
              completion = data.choices[0].text || '';
            }
            outputPre.textContent = completion || '(no completion returned)';
            resultDiv.classList.remove('hidden');
          });
        })
        .catch(function (err) {
          outputPre.textContent = '⚠️ ' + (err.name === 'AbortError' ? 'Request timed out.' : 'Could not reach Tabby server.');
          resultDiv.classList.remove('hidden');
        })
        .finally(function () {
          completeBtn.disabled = false;
          completeBtn.textContent = '⚡ Complete';
        });
    });

    copyBtn.addEventListener('click', function () {
      var text = outputPre.textContent;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(function () {});
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      copyBtn.textContent = '✅ Copied';
      setTimeout(function () { copyBtn.textContent = '📋 Copy'; }, 1500);
    });

    /* ── Settings ── */
    urlInput.value   = state.serverUrl;
    tokenInput.value = state.authToken;
    modelInput.value = state.model;

    saveBtn.addEventListener('click', function () {
      var url = urlInput.value.trim();
      if (!url) { url = DEFAULT_STATE.serverUrl; urlInput.value = url; }
      state.serverUrl  = url;
      state.authToken  = tokenInput.value.trim();
      state.model      = modelInput.value.trim();
      saveState(state);

      feedback.className = 'tabby-save-feedback';
      feedback.textContent = '⏳ Testing…';

      checkHealth(state)
        .then(function (res) {
          if (res.ok) {
            feedback.className = 'tabby-save-feedback success';
            feedback.textContent = '✅ Connected!';
            updateStatus(true, 'Online');
          } else {
            feedback.className = 'tabby-save-feedback error';
            feedback.textContent = '⚠️ Server returned ' + res.status;
            updateStatus(false, 'Error');
          }
        })
        .catch(function (err) {
          feedback.className = 'tabby-save-feedback error';
          feedback.textContent = err.name === 'AbortError' ? '⚠️ Timeout' : '⚠️ Cannot reach server';
          updateStatus(false, 'Offline');
        });
    });
  }

  /* ── open() ───────────────────────────────────────────────────── */
  function open() {
    var state = loadState();
    var el = WindowManager.create({
      id: 'tabby',
      title: 'Tabby AI Assistant',
      icon: '🤖',
      width: 740,
      height: 560,
      content: buildUI(),
    });
    init(el, state);
  }

  NightOS.registerApp('tabby', {
    title: 'Tabby AI',
    icon: '🤖',
    open: open,
  });
})();
