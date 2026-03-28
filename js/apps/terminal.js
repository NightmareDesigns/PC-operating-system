/**
 * NightOS — Terminal App
 * Provides a command-line interface with basic shell commands.
 */

'use strict';

(function () {
  let instanceCount = 0;

  /* Virtual Filesystem paths (shared with FM) */
  const HOME = '/home/user';
  let CWD = HOME; // default working directory before ENV is fully constructed

  /* Simulated environment */
  const ENV = {
    PATH: '/usr/bin:/bin',
    HOME, // same reference as the HOME constant above
    USER: 'user',
    HOSTNAME: 'nightmare',
    SHELL: '/bin/bash',
    TERM: 'xterm-256color',
    OS: 'Nightmare OS 2.0.0',
  };

  // Command history is now maintained per-terminal instance inside initTerm.
  // See initTerm for instance-scoped HISTORY and histIdx.

  /* Virtual file tree */
  const VFS = {
    '/': ['home', 'usr', 'bin', 'etc', 'tmp'],
    '/home': ['user'],
    '/home/user': ['Desktop', 'Documents', 'Downloads', 'Pictures', 'notes.txt'],
    '/home/user/Desktop': ['readme.txt'],
    '/home/user/Documents': ['notes.txt', 'todo.txt'],
    '/home/user/Downloads': [],
    '/home/user/Pictures': [],
    '/home/user/notes.txt': '# My Notes\n\nWelcome to Nightmare OS Terminal!',
    '/home/user/Desktop/readme.txt': 'Welcome to Nightmare OS!\nA nightmare-themed web desktop environment.',
    '/home/user/Documents/notes.txt': '## Notes\n\n- Explore Nightmare OS\n- Try the apps',
    '/home/user/Documents/todo.txt': 'TODO:\n[ ] Explore\n[ ] Have fun',
    '/usr': ['bin', 'lib'],
    '/usr/bin': ['ls', 'cat', 'echo', 'pwd', 'whoami'],
    '/bin': ['sh', 'bash'],
    '/etc': ['passwd', 'hostname'],
    '/etc/passwd': 'root:x:0:0:root:/root:/bin/bash\nuser:x:1000:1000:User:/home/user:/bin/bash',
    '/etc/hostname': 'nightmare',
    '/tmp': [],
  };

  function open() {
    instanceCount++;
    const id = instanceCount === 1 ? 'terminal' : `terminal-${instanceCount}`;
    const el = WindowManager.create({
      id,
      title: 'Terminal',
      icon: '💻',
      width: 660,
      height: 420,
      content: buildUI(),
    });
    initTerm(el, id);
  }

  function buildUI() {
    return `
      <div class="terminal-body" id="term-output" aria-label="Terminal output" aria-live="polite"></div>
      <div class="terminal-input-row">
        <span class="terminal-prompt" id="term-prompt">${ENV.USER}@${ENV.HOSTNAME}:~$</span>
        <input class="terminal-input" type="text" id="term-input" autocomplete="off" autocorrect="off"
               autocapitalize="off" spellcheck="false" aria-label="Terminal input" />
      </div>`;
  }

  const TERM_HISTORY_KEY = 'nightmareos_term_history';

  function loadTermHistory() {
    try { return JSON.parse(localStorage.getItem(TERM_HISTORY_KEY) ?? '[]'); }
    catch (_) { return []; }
  }

  function saveTermHistory(list) {
    try { localStorage.setItem(TERM_HISTORY_KEY, JSON.stringify(list.slice(0, 100))); }
    catch (_) { /* quota exceeded */ }
  }

  function initTerm(el, id) {
    const output = el.querySelector('#term-output');
    const input  = el.querySelector('#term-input');
    const prompt = el.querySelector('#term-prompt');
    let localCwd = HOME;

    // Instance-scoped command history — loaded from persistent storage
    const HISTORY = loadTermHistory();
    let histIdx = -1;

    function updatePrompt() {
      const short = localCwd.replace(HOME, '~');
      if (prompt) prompt.textContent = `${ENV.USER}@${ENV.HOSTNAME}:${short}$`;
    }

    function print(text, cls = '') {
      const line = document.createElement('div');
      line.className = `terminal-line${cls ? ' ' + cls : ''}`;
      line.textContent = text;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }

    /**
     * WARNING: This helper renders raw HTML into the terminal output.
     *
     * Security contract:
     * - `html` MUST be a trusted, static string controlled by the application.
     * - NEVER pass user-controlled or otherwise untrusted data to this function.
     *
     * Violating this contract will create an XSS vulnerability because it uses
     * `innerHTML` directly.
     */
    function printHTML(html) {
      const line = document.createElement('div');
      line.className = 'terminal-line';
      line.innerHTML = html;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }

    // Welcome banner
    print(`${NightOS.displayName} Terminal v${NightOS.version}`, 'sys');
    print(`Running on ${navigator.platform || 'Web'}`, 'sys');
    print('Type "help" for available commands.', 'muted');
    print('');

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const cmd = input.value.trim();
        print(`${ENV.USER}@${ENV.HOSTNAME}:${localCwd.replace(HOME,'~')}$ ${cmd}`);
        if (cmd) {
          HISTORY.unshift(cmd);
          if (HISTORY.length > 50) HISTORY.pop();
          histIdx = -1;
          saveTermHistory(HISTORY);
          runCommand(cmd, localCwd, (newCwd) => { localCwd = newCwd; updatePrompt(); });
        }
        input.value = '';
        return;
      }

      // History navigation
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (histIdx < HISTORY.length - 1) {
          histIdx++;
          input.value = HISTORY[histIdx] || '';
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (histIdx > 0) {
          histIdx--;
          input.value = HISTORY[histIdx] || '';
        } else {
          histIdx = -1;
          input.value = '';
        }
        return;
      }

      // Ctrl+C
      if (e.ctrlKey && e.key === 'c') {
        print(`^C`);
        input.value = '';
        return;
      }

      // Ctrl+L clear
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        output.innerHTML = '';
        return;
      }
    });

    // Auto-focus input when clicking terminal body
    output.addEventListener('click', () => input.focus());
    input.focus();

    function runCommand(raw, cwd, setCwd) {
      const parts = parseArgs(raw);
      const cmd   = parts[0] || '';
      const args  = parts.slice(1);

      switch (cmd) {
        case 'help':
          print('Available commands:', 'sys');
          print('  help        — show this help');
          print('  ls [path]   — list directory contents');
          print('  cd <path>   — change directory');
          print('  pwd         — print working directory');
          print('  cat <file>  — show file contents');
          print('  echo [text] — print text');
          print('  mkdir <dir> — create directory');
          print('  touch <file>— create empty file');
          print('  rm <path>   — remove file/directory');
          print('  clear       — clear terminal');
          print('  date        — show current date/time');
          print('  whoami      — show current user');
          print('  uname [-a]  — system information');
          print('  env         — show environment variables');
          print('  history     — command history');
          print('  neofetch    — system info splash');
          break;

        case 'clear':
          output.innerHTML = '';
          break;

        case 'pwd':
          print(cwd);
          break;

        case 'whoami':
          print(ENV.USER);
          break;

        case 'date':
          print(new Date().toString());
          break;

        case 'uname':
          if (args[0] === '-a') {
            print(`${NightOS.displayName} ${ENV.HOSTNAME} ${NightOS.version} #1 SMP Web Browser ${new Date().getFullYear()} ${navigator.platform}`);
          } else {
            print(NightOS.displayName);
          }
          break;

        case 'env':
          Object.entries(ENV).forEach(([k, v]) => print(`${k}=${v}`));
          break;

        case 'history':
          HISTORY.forEach((h, i) => print(`  ${String(i + 1).padStart(3)} ${h}`));
          break;

        case 'echo':
          print(args.join(' '));
          break;

        case 'ls': {
          const target = args[0] ? resolvePath(args[0], cwd) : cwd;
          const node = VFS[target];
          if (Array.isArray(node)) {
            if (node.length === 0) {
              print('(empty)');
            } else {
              // Print in columns (simple)
              print(node.map((name, i) => {
                const cp = target === '/' ? `/${name}` : `${target}/${name}`;
                return Array.isArray(VFS[cp]) ? `${name}/` : name;
              }).join('  '));
            }
          } else if (typeof node === 'string') {
            print(target.split('/').pop());
          } else {
            print(`ls: cannot access '${args[0] || cwd}': No such file or directory`, 'err');
          }
          break;
        }

        case 'cd': {
          if (!args[0] || args[0] === '~') {
            setCwd(HOME);
            break;
          }
          const target = resolvePath(args[0], cwd);
          if (Array.isArray(VFS[target])) {
            setCwd(target);
          } else if (typeof VFS[target] === 'string') {
            print(`cd: not a directory: ${args[0]}`, 'err');
          } else {
            print(`cd: no such file or directory: ${args[0]}`, 'err');
          }
          break;
        }

        case 'cat': {
          if (!args[0]) { print('cat: missing file operand', 'err'); break; }
          const target = resolvePath(args[0], cwd);
          const node = VFS[target];
          if (typeof node === 'string') {
            node.split('\n').forEach(line => print(line));
          } else if (Array.isArray(node)) {
            print(`cat: ${args[0]}: Is a directory`, 'err');
          } else {
            print(`cat: ${args[0]}: No such file or directory`, 'err');
          }
          break;
        }

        case 'mkdir': {
          if (!args[0]) { print('mkdir: missing operand', 'err'); break; }
          const target = resolvePath(args[0], cwd);
          if (VFS[target]) {
            print(`mkdir: cannot create directory '${args[0]}': File exists`, 'err');
          } else {
            VFS[target] = [];
            const parent = target.substring(0, target.lastIndexOf('/')) || '/';
            if (Array.isArray(VFS[parent])) {
              VFS[parent].push(target.split('/').pop());
            }
          }
          break;
        }

        case 'touch': {
          if (!args[0]) { print('touch: missing operand', 'err'); break; }
          const target = resolvePath(args[0], cwd);
          if (!VFS[target]) {
            VFS[target] = '';
            const parent = target.substring(0, target.lastIndexOf('/')) || '/';
            if (Array.isArray(VFS[parent])) {
              VFS[parent].push(target.split('/').pop());
            }
          }
          break;
        }

        case 'rm': {
          if (!args[0]) { print('rm: missing operand', 'err'); break; }
          const target = resolvePath(args[0], cwd);
          if (VFS[target] !== undefined) {
            delete VFS[target];
            const parent = target.substring(0, target.lastIndexOf('/')) || '/';
            if (Array.isArray(VFS[parent])) {
              const name = target.split('/').pop();
              const idx = VFS[parent].indexOf(name);
              if (idx !== -1) VFS[parent].splice(idx, 1);
            }
          } else {
            print(`rm: cannot remove '${args[0]}': No such file or directory`, 'err');
          }
          break;
        }

        case 'neofetch': {
          const ua = navigator.userAgent;
          const plat = navigator.platform || 'Unknown';
          const mem = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Unknown';
          const cores = navigator.hardwareConcurrency || 'Unknown';
          printHTML(
            `<span style="color:#00ff41">  ███╗   ██╗██╗ ██████╗ ██╗  ██╗████████╗███╗   ███╗ █████╗ ██████╗ ███████╗</span>`
          );
          printHTML(`<span style="color:#00ff41">  ████╗  ██║██║██╔════╝ ██║  ██║╚══██╔══╝████╗ ████║██╔══██╗██╔══██╗██╔════╝</span>`);
          printHTML(`<span style="color:#00ff41">  ██╔██╗ ██║██║██║  ███╗███████║   ██║   ██╔████╔██║███████║██████╔╝█████╗  </span>`);
          printHTML(`<span style="color:#00ff41">  ██║╚██╗██║██║██║   ██║██╔══██║   ██║   ██║╚██╔╝██║██╔══██║██╔══██╗██╔══╝  </span>`);
          printHTML(`<span style="color:#00ff41">  ██║ ╚████║██║╚██████╔╝██║  ██║   ██║   ██║ ╚═╝ ██║██║  ██║██║  ██║███████╗</span>`);
          printHTML(`<span style="color:#00ff41">  ╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝</span>`);
          print('');
          print(`  ${ENV.USER}@${ENV.HOSTNAME}`, 'sys');
          print(`  OS:       ${NightOS.displayName} ${NightOS.version} (Web)`, 'sys');
          print(`  Platform: ${plat}`, 'sys');
          print(`  Browser:  ${ua.split(' ').slice(-2).join(' ')}`, 'sys');
          print(`  CPU:      ${cores} logical cores`, 'sys');
          print(`  RAM:      ${mem}`, 'sys');
          print(`  Shell:    ${ENV.SHELL}`, 'sys');
          print(`  Terminal: ${NightOS.displayName} Terminal v${NightOS.version}`, 'sys');
          print(`  Resolution: ${window.screen.width}x${window.screen.height}`, 'sys');
          break;
        }

        case '':
          break;

        default:
          print(`${cmd}: command not found — type 'help' for available commands`, 'err');
      }
    }
  }

  function resolvePath(path, cwd) {
    if (path.startsWith('/')) return normalizePath(path);
    if (path === '..') {
      const parts = cwd.split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/') || '/';
    }
    if (path === '.') return cwd;
    const base = cwd === '/' ? '' : cwd;
    return normalizePath(`${base}/${path}`);
  }

  function normalizePath(path) {
    const parts = path.split('/').filter(Boolean);
    const resolved = [];
    for (const p of parts) {
      if (p === '..') resolved.pop();
      else if (p !== '.') resolved.push(p);
    }
    return '/' + resolved.join('/');
  }

  function parseArgs(input) {
    const args = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    for (const ch of input) {
      if (inQuote) {
        if (ch === quoteChar) inQuote = false;
        else current += ch;
      } else if (ch === '"' || ch === "'") {
        inQuote = true; quoteChar = ch;
      } else if (ch === ' ') {
        if (current) { args.push(current); current = ''; }
      } else {
        current += ch;
      }
    }
    if (current) args.push(current);
    return args;
  }

  NightOS.registerApp('terminal', {
    title: 'Terminal',
    icon: '💻',
    open,
  });
})();
