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

#### Productivity
| App | Icon | Description |
|-----|------|-------------|
| **File Manager** | 📁 | Browse a virtual filesystem with folders and files |
| **Text Editor** | 📝 | Create/edit text files, open local files, save/download |
| **Terminal** | 💻 | Command-line with `ls`, `cd`, `cat`, `mkdir`, `echo`, `neofetch`, and more |
| **Todo List** | ✅ | Persistent task list saved to localStorage |
| **Sticky Notes** | 📌 | Draggable sticky notes on the desktop |
| **Calendar** | 📅 | Monthly calendar with event creation and persistence |
| **Markdown Editor** | 📑 | Live-preview Markdown editor with export |
| **Script Manager** | 📜 | Write, save, and execute custom JavaScript userscripts |

#### Utilities
| App | Icon | Description |
|-----|------|-------------|
| **Calculator** | 🔢 | Full arithmetic calculator with keyboard support |
| **Color Picker** | 🎯 | HSL/RGB/Hex color picker with saved palette |
| **Password Generator** | 🔐 | Configurable secure password generator |
| **Unit Converter** | 📏 | Convert length, mass, temperature, area, volume, and more |
| **Stopwatch** | ⏱️ | Stopwatch with lap recording |
| **Pomodoro Timer** | 🍅 | Pomodoro work/break timer with customizable intervals |
| **Clock** | 🕐 | Analog + digital clock with timezone display |

#### Internet & Media
| App | Icon | Description |
|-----|------|-------------|
| **Browser** | 🌐 | Embedded iframe browser with bookmarks and history |
| **Firefox** | 🦊 | Tabbed browser with per-tab history and DuckDuckGo search |
| **Image Gallery** | 🖼️ | Procedurally generated art gallery + upload your own images |
| **Music Player** | 🎵 | Upload and play local audio files with a playlist |
| **Video Player** | 🎬 | Upload and play local video files |
| **Weather** | 🌤️ | Weather lookup using the Open-Meteo API (no API key needed) |

#### System & Fun
| App | Icon | Description |
|-----|------|-------------|
| **Settings** | ⚙️ | Wallpaper picker, font size, animations, accessibility |
| **Admin Panel** | 🛡️ | Manage the OS username, password, boot message, and custom CSS |
| **App Store** | 🏪 | Browse and launch all installed apps from one place |
| **System Monitor** | 📊 | Real-time CPU/memory/network graphs using browser Performance APIs |
| **System Info** | ℹ️ | Detailed hardware/browser environment information |
| **Habit Tracker** | 📈 | Daily habit check-ins with streak and completion history |
| **Matrix Rain** | 🟩 | Animated Matrix-style digital rain screensaver |
| **Snake** | 🐍 | Classic Snake game with score tracking |
| **Paint** | 🎨 | Canvas-based drawing app with brush, eraser, shapes, and color picker |

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
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (offline cache + proxy)
├── css/
│   ├── desktop.css         # Desktop, taskbar, start menu, boot/login styles
│   └── apps.css            # Window chrome and per-app styles
├── icons/                  # SVG PWA icons
├── js/
│   ├── desktop.js          # Desktop core: icons, context menu, start menu, wallpaper
│   ├── windowmanager.js    # Window creation, dragging, resizing, z-ordering
│   ├── boot.js             # Boot/BIOS/GRUB/login sequence
│   ├── sync.js             # Settings sync helpers
│   └── apps/
│       ├── filemanager.js  # Virtual file manager
│       ├── texteditor.js   # Text editor with file open/save
│       ├── calculator.js   # Calculator
│       ├── terminal.js     # Terminal emulator
│       ├── webbrowser.js   # Embedded web browser
│       ├── firefox.js      # Tabbed browser with history
│       ├── settings.js     # System settings
│       ├── imagegallery.js # Image gallery
│       ├── clock.js        # Analog + digital clock
│       ├── matrix.js       # Matrix rain screensaver
│       ├── paint.js        # Canvas drawing app
│       ├── snake.js        # Snake game
│       ├── musicplayer.js  # Local audio player
│       ├── videoplayer.js  # Local video player
│       ├── stickynotes.js  # Sticky notes
│       ├── calendar.js     # Calendar with events
│       ├── sysmonitor.js   # System monitor graphs
│       ├── adminpanel.js   # Admin / OS customisation
│       ├── appstore.js     # App launcher / store
│       ├── scriptmanager.js# Custom userscript manager
│       ├── todolist.js     # Persistent todo list
│       ├── stopwatch.js    # Stopwatch with laps
│       ├── colorpicker.js  # Color picker
│       ├── markdown.js     # Markdown editor with preview
│       ├── pomodoro.js     # Pomodoro timer
│       ├── weather.js      # Weather (Open-Meteo API)
│       ├── passwordgen.js  # Password generator
│       ├── unitconverter.js# Unit converter
│       ├── habittracker.js # Habit tracker
│       └── systeminfo.js   # System / browser info
```

---

## ⌨️ Keyboard Shortcuts

### Global
| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+T` | Open Terminal |
| `Ctrl+Alt+F` | Open Firefox |
| `Ctrl+Alt+E` | Open File Manager |
| `Ctrl+Alt+C` | Open Calculator |
| `Ctrl+Alt+W` | Open Weather |
| `Ctrl+Alt+M` | Open Markdown Editor |
| `Ctrl+Alt+S` | Open Script Manager |
| `Ctrl+Alt+I` | Open System Info |
| `Ctrl+Alt+N` | Toggle Notification Center |
| `Ctrl+Alt+L` | Lock Screen |
| `Escape` | Close context menu / start menu |
| `Enter` on desktop icon | Open app |

### Text Editor
| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save / download file |
| `Tab` | Insert 2-space indent |

### Terminal
| Shortcut | Action |
|----------|--------|
| `↑ / ↓` | Navigate command history |
| `Ctrl+C` | Cancel current input |
| `Ctrl+L` | Clear terminal |

### Markdown Editor
| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |

---

## 🔒 Privacy & Security

- **100% client-side** — no data is ever sent to any server
- **No dependencies** — pure HTML, CSS, and vanilla JavaScript
- **No tracking** — no analytics, no cookies, no network requests (except when you use the Browser app)
- Settings are persisted in `localStorage` only

---

## 📄 License

MIT — see [LICENSE](LICENSE)
