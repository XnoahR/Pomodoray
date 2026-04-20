# 🍅 Pomodoray — Project Overview

> A beautiful, feature-rich Pomodoro timer desktop app built with **Electron + JavaScript + Tailwind CSS v3**.

---

## 📁 Project Structure

```
Pomodoray/
├── main.js          # Electron main process (window, IPC)
├── preload.js       # Context bridge (secure API exposure)
├── renderer.js      # All app logic (timer, sounds, tasks, settings, stats)
├── index.html       # UI layout with Tailwind CDN
├── styles.css       # Custom CSS (themes, components, animations)
├── package.json     # Config + electron-builder settings
├── build/           # Packaged executable output
│   └── Pomodoray-win32-x64/
│       └── Pomodoray.exe
└── node_modules/
```

---

## ✅ Complete Feature List

### ⏱️ Timer Core
| Feature | Details |
|---|---|
| Pomodoro timer | Circular SVG ring with smooth progress animation |
| 3 modes | **Focus**, **Short Break**, **Long Break** |
| Start / Pause | Big primary button + Space key |
| Reset | Resets current timer to full duration (R key) |
| Skip | Jump to next mode (S key) |
| Auto-transition | Automatically cycles Focus → Break → Focus |
| Window title | Shows remaining time while running (e.g. `18:32 — Pomodoray`) |

### 🎨 Themes (5 total)
| Theme | Focus Color | Short Break | Long Break | Background |
|---|---|---|---|---|
| **Default** | Coral `#ff6b6b` | Teal `#4ecdc4` | Violet `#a78bfa` | `#0c0c11` |
| **Noir** | Light gray `#d4d4d8` | Medium gray `#a1a1aa` | Silver `#e4e4e7` | `#060606` |
| **Retro** | Amber `#f59e0b` | Gold `#fbbf24` | Burnt orange `#dc6b20` | `#110e08` |
| **Sakura** | Cherry pink `#f9a8d4` | Peach `#fda4af` | Deep rose `#e879a0` | `#0f0a0d` |
| **Lavender** | Purple `#a78bfa` | Sky blue `#93c5fd` | Indigo `#818cf8` | `#0a0a14` |

- Visual color-swatch picker in Settings
- Theme persists to localStorage
- Each mode within a theme has its own unique accent color

### ⚙️ Settings
| Setting | Range | Default |
|---|---|---|
| Focus duration | 1–90 min | 25 min |
| Short break duration | 1–30 min | 5 min |
| Long break duration | 1–30 min | 15 min |
| Sessions per cycle | 1–8 | 4 |
| Auto-start breaks | on/off | off |
| Auto-start focus | on/off | off |
| Desktop notifications | on/off | on |

- All settings persisted to localStorage
- Stepper buttons (+/−) for numeric values
- Toggle switches for boolean preferences

### 📂 Task System (Folder-based)
| Feature | Details |
|---|---|
| **Folders** | Create unlimited folders to organize tasks |
| **Folder icons** | Auto-assigned: 📁💼🎯📚🔬🎨🏠⭐ |
| **Collapse/Expand** | Click folder header or chevron to toggle |
| **Rename** | Double-click folder name to edit inline |
| **Delete** | × button on folder header (appears on hover) |
| **Task input** | Each folder has its own `+ Add task...` input |
| **Checklist** | Click checkbox to toggle completion |
| **Counter badge** | Shows `done/total` on each folder (e.g. `2/5`) |
| **Delete tasks** | × button per task (appears on hover) |
| **Migration** | Old flat tasks auto-migrate to a "General" folder |

### 🔊 Ambient Sounds (6 channels)
| Sound | Engine | Character |
|---|---|---|
| 🌧️ **Rain** | Brown noise + bandpass + white noise highpass | Warm rain with high drop detail |
| ☕ **Café** | Pink noise + lowpass filter | Gentle ambient chatter |
| 🔥 **Fireplace** | White noise + bandpass + LFO crackle + brown noise base | Warm crackling fire |
| 🍃 **Nature** | Brown noise + bandpass with slow LFO on frequency | Wind gusts through trees |
| 🌊 **Ocean** | Brown noise + lowpass with volume LFO | Rolling waves |
| 🎵 **Lo-fi** | Pink noise + lowpass + C3 chord (sine oscillators) | Vinyl-like hum with soft chord |

- All generated procedurally via **Web Audio API** (no audio files needed, works offline)
- Individual **volume sliders** per channel
- **Mixable** — run multiple sounds simultaneously
- Smooth fade-in/out on toggle

### 📊 Stats Dashboard
| Metric | Details |
|---|---|
| Sessions Today | Count of focus sessions completed today |
| Minutes Today | Total focus minutes today |
| Total Sessions | All-time session count |
| Day Streak 🔥 | Consecutive days with at least 1 session |
| Weekly Chart | Bar chart showing sessions Mon–Sun, today highlighted |
| Reset button | Clear all stats |

### 🪟 Window Features
| Feature | Shortcut | Details |
|---|---|---|
| Frameless window | — | Custom titlebar with drag region |
| Transparent/rounded | — | 14px border-radius, dark glass look |
| Always on Top | `Ctrl+T` | Pin button in titlebar |
| Minimize | — | Titlebar button |
| Close | — | Titlebar button (red hover) |

### 💬 Motivational Quotes
- 15 curated productivity quotes
- Rotates after each completed focus session
- Smooth fade transition

### ⌨️ Keyboard Shortcuts
| Key | Action |
|---|---|
| `Space` | Start / Pause timer |
| `R` | Reset timer |
| `S` | Skip to next mode |
| `Ctrl+T` | Toggle always-on-top |

> All shortcuts are disabled when typing in an input field.

### 🎨 Design System
- **Font**: Inter (Google Fonts) — 300 to 900 weights
- **Dark mode only** with ambient glow orb that breathes while timer runs
- **CSS variables** for all accent colors (enables instant theme switching)
- **Micro-animations**: slide-up tasks, pulse session dots, ring glow, button scale
- **Scrollbar**: Thin 4px custom styled

---

## 🚀 How to Run

```bash
# Development
npm start

# Build executable
npx electron-packager . Pomodoray --platform=win32 --arch=x64 --out=build --overwrite --no-prune --ignore="^/(dist|build|\.git)"
```

**Executable location:** `build/Pomodoray-win32-x64/Pomodoray.exe`

---

## 🗄️ Data Persistence (localStorage)

| Key | Type | Contents |
|---|---|---|
| `pomodoray-settings` | Object | Durations, preferences, theme |
| `pomodoray-folders` | Array | Folder tree with nested tasks |
| `pomodoray-stats` | Object | Session counts, streak, weekly data |

---

## 📦 Dependencies

| Package | Version | Purpose |
|---|---|---|
| `electron` | ^41.2.1 | Desktop app runtime |
| `electron-builder` | ^26.8.1 | Build toolchain (optional) |
| Tailwind CSS | v3 CDN | Utility-first styling |
| Inter font | Google Fonts CDN | Typography |
