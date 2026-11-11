# 🎡 Spin Wheel 3D - Random Name Picker with Smoky Effects

A high-performance web app for spinning name wheels featuring atmospheric volumetric **smoky effects**, **3D Glassmorphism UI**, **100% mathematically equal random chances**, dynamic spring physics flapper, synthesized audio, and full device responsiveness.

---

## ✨ Features

- **Equal Random Chance**:
  - Every active name has an exact, uniform $1/N$ probability of being selected.
  - Powered by cryptographically secure random number generation (`window.crypto.getRandomValues`) with jitter protection to guarantee a fair result every time.
- **Volumetric Smoky Background Effects**:
  - GPU-accelerated WebGL domain-warping Fractional Brownian Motion (fBm) shader.
  - Interactive smoke plumes that react and curl gently when moving your mouse or dragging on touchscreens.
  - 4 customizable smoke palettes: **Cosmic Mist**, **Emerald Aurora**, **Solar Ember**, and **Midnight Frost**.
- **3D & Glassmorphism Aesthetics**:
  - Frosted glass containers with `backdrop-filter: blur(24px)`, specular inset borders, and ambient light refractions.
  - 3D perspective stage with real-time interactive tilt as the mouse moves.
  - Multi-layer canvas rendering: brushed metallic chrome rim, 3D outer pegs/studs, convex cylindrical slice lighting, glossy center dome with specular glint, and an amber metallic 3D needle.
- **Interactive Audio & Celebration**:
  - Procedural sound synthesis using the **Web Audio API** (zero external mp3/wav files that could fail to load).
  - Mechanical peg ticks with dynamic pitch modulation that speeds up and slows down with wheel inertia.
  - Launch swoosh sound and victory fanfare chord sequence.
  - 3D Confetti Cannon with glittering ribbons, stars, and circles.
- **Name Management**:
  - Single name input with <kbd>Enter</kbd> key support.
  - **Bulk Add / Paste**: Import hundreds of names separated by newlines, commas, or semicolons.
  - **Active Checkbox Toggle**: Temporarily include/exclude names without deleting them.
  - **Shuffle & Alphabetical Sort (A-Z)**.
  - Quick Presets: *Numbers 1-20*, *Team Standup*, *Lunch & Dinner*, *Decisions (Yes/No)*, and *Lucky Giveaway*.
  - **Eliminate Winner**: After each spin, choose to remove the winner so they aren't chosen again, or keep them on the wheel.
  - Winner history log with timestamps.
  - LocalStorage persistence: Your names, history, sound, and theme preferences remain saved between browser visits.
- **Fully Responsive**:
  - Designed for mobile phones, tablets, laptops, and ultra-wide desktop monitors.
  - Touch-friendly controls, retina HiDPI crisp canvas rendering, and spacebar spin shortcut.

---

## 🚀 How to Run

### Method 1: Direct Browser Launch (No installation required)
Simply double-click `index.html` or open it in any web browser:
```
file:///C:/Users/codes/.gemini/antigravity/scratch/spin-wheel-app/index.html
```

### Method 2: Local HTTP Server (Optional)
If you prefer running a local server:
```bash
# Using Node.js npx serve
npx serve "C:\Users\codes\.gemini\antigravity\scratch\spin-wheel-app"

# Or using Python
cd "C:\Users\codes\.gemini\antigravity\scratch\spin-wheel-app"
python -m http.server 8080
```
Then open `http://localhost:8080` in your browser.

---

## 📂 File Architecture

```
spin-wheel-app/
├── index.html       # Semantic layout, glass panels, modals & SVG icons
├── styles.css       # Glassmorphism tokens, 3D perspective, responsive rules
├── smoke.js         # WebGL domain-warping fluid smoke shader
├── audio.js         # Procedural Web Audio API sound synthesizer
├── confetti.js      # Physics-based 3D confetti burst simulation
├── wheel.js         # 3D canvas wheel renderer, spring flapper & equal RNG
├── app.js           # State management, local storage & event orchestration
└── README.md        # Documentation and launch instructions
```
