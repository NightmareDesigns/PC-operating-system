# NightOS — Cross-Platform Desktop Environment

A fully web-based desktop operating system that runs in any modern browser on **Windows, macOS, Linux, and Android** (and any other platform with a browser).

---

## 🚀 Quick Start

**No installation required.** Just open `index.html` in any modern browser:

```bash
# Clone the repo
git clone https://github.com/NightmareDesigns/PC-operating-system.git
cd PC-operating-system

# Open directly
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

Or serve it locally:

```bash
# Python 3
python3 -m http.server 8080
# Then open http://localhost:8080 in your browser
```

---

## 🖥️ Features

### Desktop Environment
- **Animated boot sequence** with progress indicator
- **Login screen** (leave password blank and press Enter/Sign In)
- **Wallpaper** — 8 built-in gradient wallpapers, switchable in Settings
- **Desktop icons** — double-click or press Enter to open apps
- **Right-click context menu** on the desktop
- **Taskbar** with Start menu, running app indicators, system tray, and clock

### Window Management
- **Drag** windows by their title bar
- **Resize** windows using the bottom-right handle
- **Minimize** to taskbar, **maximize** to full screen, **close**
- Taskbar button toggles minimize/restore/focus
- **z-ordering** — focused window always on top

### Built-in Applications

| App | Icon | Description |
|-----|------|-------------|
| **File Manager** | 📁 | Browse a virtual filesystem with folders and files |
| **Text Editor** | 📝 | Create/edit text files, open local files, save/download |
| **Calculator** | 🔢 | Full arithmetic calculator with keyboard support |
| **Terminal** | 💻 | Command-line with `ls`, `cd`, `cat`, `mkdir`, `echo`, `neofetch`, and more |
| **Browser** | 🌐 | Embedded iframe browser with bookmarks |
| **Settings** | ⚙️ | Wallpaper picker, font size, animations, accessibility |
| **Gallery** | 🖼️ | Procedurally generated art gallery + upload your own images |
| **Clock** | 🕐 | Analog + digital clock with timezone display |

---

## 🌍 Platform Support

| Platform | How to Run |
|----------|-----------|
| **Windows** | Open `index.html` in Chrome, Edge, or Firefox |
| **macOS** | Open `index.html` in Safari, Chrome, or Firefox |
| **Linux** | Open `index.html` in Firefox or Chromium |
| **Android** | Open `index.html` in Chrome or Firefox for Android |
| **iOS** | Open `index.html` in Safari |

> NightOS is fully **responsive** — the UI adapts to phone-sized screens.

---

## 📁 Project Structure

```
PC-operating-system/
├── index.html              # Entry point
├── css/
│   ├── desktop.css         # Desktop, taskbar, start menu, boot/login styles
│   └── apps.css            # Window chrome and per-app styles
├── js/
│   ├── desktop.js          # Desktop core: icons, context menu, start menu, wallpaper
│   ├── windowmanager.js    # Window creation, dragging, resizing, z-ordering
│   ├── boot.js             # Boot sequence and login flow
│   └── apps/
│       ├── filemanager.js  # Virtual file manager
│       ├── texteditor.js   # Text editor with file open/save
│       ├── calculator.js   # Calculator
│       ├── terminal.js     # Terminal emulator
│       ├── webbrowser.js   # Embedded web browser
│       ├── settings.js     # System settings
│       ├── imagegallery.js # Image gallery
│       └── clock.js        # Analog + digital clock
└── assets/                 # Static assets (icons, fonts, etc.)
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+T` | Open Terminal |
| `Ctrl+S` (in editor) | Save file |
| `Tab` (in editor) | Insert 2-space indent |
| `↑ / ↓` (in terminal) | Navigate command history |
| `Ctrl+C` (in terminal) | Cancel current input |
| `Ctrl+L` (in terminal) | Clear terminal |
| `Escape` | Close context menu / start menu |
| `Enter` on desktop icon | Open app |

---

## 🔒 Privacy & Security

- **100% client-side** — no data is ever sent to any server
- **No dependencies** — pure HTML, CSS, and vanilla JavaScript
- **No tracking** — no analytics, no cookies, no network requests (except when you use the Browser app)
- Settings are persisted in `localStorage` only

---

## 📄 License

MIT — see [LICENSE](LICENSE)
