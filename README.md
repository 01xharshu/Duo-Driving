<div align="center">

<img src="./public/favicon.svg" alt="DuoDrive 3D Logo" width="76" height="76" />

# DuoDrive 3D

**A bright, arcade-style 3D open-city driving game built with React 18, Vite, Three.js, and Web Audio.**

[![React](https://img.shields.io/badge/React-18.3-1CB0F6?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.169-58CC02?style=for-the-badge&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-FFC800?style=for-the-badge&logo=vite&logoColor=1E293B)](https://vitejs.dev/)
[![Web Audio API](https://img.shields.io/badge/Audio-Web_Audio_API-CE82FF?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

Explore a sunlit 3D city with elevated arch bridges, animated pedestrians, high-speed police pursuits, an interactive 3D garage showroom, and a live cockpit instrument cluster.

[Quick Start](#-quick-start) • [Features](#-features) • [Vehicles](#-vehicles) • [Controls](#-controls) • [Project Structure](#-project-structure)

</div>

---

## ✨ Features

- **🏎️ 3D Garage Showroom** — Preview 5 distinct vehicles on a rotating turntable, customize paint with 8 color swatches, and compare Top Speed, Acceleration, and Armor & Handling stats.
- **🪟 Detailed Cockpit & 3 Camera Modes** — Switch seamlessly between **Cockpit** (with an animated steering wheel, gear shifter, and live canvas-rendered RPM/KM/H/Hull/N2O/Wanted display), **Chase**, and **Hood** cameras.
- **🌉 Open-City World & Bridges** — Drive across wide city avenues, zebra crossings, elevated arch bridges over a central canal, and a coastal harbor waterfront.
- **🔧 Pit-Stop Repair Pads** — Roll over glowing green repair pads stationed around the city to instantly restore hull integrity and refill nitro.
- **🚨 Police Pursuits & Wanted System** — Colliding with pedestrians triggers up to a 5-star Wanted level, spawning pursuing police cruisers with flashing lightbars and synthesized sirens. Evade the perimeter to clear your heat.
- **🔊 Procedural Web Audio Engine** — Real-time synthesized engine RPM pitch, nitro boost whine, collision impacts, and police sirens with zero external audio assets.
- **📱 Desktop & Touch Support** — Choose between **PC / Desktop** keyboard controls and **Phone / Touch** on-screen driving pads (`GAS`, `BRK`, `N2O`, steer).
- **💾 Local Save Persistence** — Save and resume your car, paint color, camera mode, settings, coordinates, hull, nitro, and wanted state via `localStorage`.

---

## 🚘 Vehicles

| Vehicle | Style | Top Speed | Acceleration | Armor |
| :--- | :--- | :---: | :---: | :---: |
| **Apex GT Coupe** | Coupe | `165` | `34` | `100` |
| **V8 Thunder Muscle** | Muscle | `158` | `38` | `135` |
| **Nova Aero Hypercar** | Hyper | `192` | `42` | `85` |
| **Sunburst Roadster** | Roadster | `155` | `33` | `95` |
| **Drift King Tuner** | Tuner | `172` | `37` | `105` |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** `18+` and **npm**

### Installation & Development

```bash
# 1. Install dependencies
npm install

# 2. Start the development server (opens http://localhost:3000)
npm run dev
```

### Production Build & Preview

```bash
# Build optimized production assets to dist/
npm run build

# Preview the production build locally
npm run preview
```

---

## 🎮 Controls

### Keyboard (PC / Desktop)

| Key | Action |
| :--- | :--- |
| `W` / `↑` | Accelerate |
| `S` / `↓` | Brake / Reverse |
| `A` / `D` or `←` / `→` | Steer Left / Right |
| `Shift` | Nitro Boost (`N2O`) |
| `Space` | Handbrake |
| `C` / `V` | Cycle Camera (`Cockpit` → `Chase` → `Hood`) |
| `R` | Instant Vehicle Repair (also recovers from water) |

### Touch (Phone / Touch Mode)

On-screen steering arrows (`←` / `→`) on the left and `N2O`, `BRK`, `GAS` pads on the right.

---

## ⚙️ In-Game Settings

Accessible from the Main Menu to customize:
- **Master Volume** & **Engine & Siren SFX**
- **Steering Sensitivity** (`0.5x` – `1.8x`)
- **Cockpit Camera FOV** (`55°` – `88°`)
- **Graphics & Shadows** (`Low`, `Medium`, `High`)

---

## 🗂️ Project Structure

```text
Duo-Driving/
├── index.html                    # App HTML shell and root mount
├── package.json                  # Dependencies and npm scripts
├── vite.config.js                # Vite + React plugin configuration (port 3000)
├── public/
│   └── favicon.svg               # App icon
└── src/
    ├── main.jsx                  # React 18 entry point
    ├── App.jsx                   # Game phase state, settings, and localStorage persistence
    ├── styles.css                # UI theme, HUD, garage, menus, and touch pad styles
    ├── audio/
    │   └── SoundEngine.js        # Procedural Web Audio API engine, siren, and impact SFX
    ├── components/
    │   ├── GameCanvas.jsx        # Three.js scene loop, physics, collisions, AI, and cameras
    │   ├── Garage.jsx            # 3D garage UI, car switcher, paint swatches, and stat bars
    │   ├── Hud.jsx               # Hull, nitro, wanted stars, quick actions, and touch controls
    │   └── Menus.jsx             # Device select, main menu, settings, and wasted/busted modal
    ├── data/
    │   └── cars.js               # Vehicle catalog specs and paint swatch palette
    └── three/
        ├── carBuilder.js         # Player car interior/exterior, live dash canvas, police cruisers
        └── worldBuilder.js       # City blocks, roads, bridges, canal/harbor water, pedestrians
```
