# DuoDrive 3D — React + Three.js Edition (v2)

A modular **React 18 + Vite + Three.js** 3D open-city driving game featuring detailed car interiors with an in-dash speedometer, elevated bridges over water, animated pedestrians, police chases, nitro boost, pit-stop repair pads, crash-death physics, save/continue persistence, and a 3D garage showroom.

## Quick Start
```bash
npm install
npm run dev
```

## Controls
- **W / Up Arrow**: Accelerate
- **S / Down Arrow**: Brake / Reverse
- **A / D or Left / Right Arrows**: Steer
- **Shift**: Nitro Boost
- **Space**: Handbrake
- **C / V**: Switch Camera (`Cockpit`, `Chase`, `Hood`)
- **R**: Instant Vehicle Repair

## Complete File Manifest
- `package.json`, `vite.config.js`, `.gitignore`, `index.html`, `public/favicon.svg`
- `src/main.jsx`, `src/App.jsx`, `src/styles.css`
- `src/components/Menus.jsx` — Device Selection, Main Menu, Settings Sliders, and Wasted/Busted Overlay
- `src/components/Garage.jsx` — 3D Garage Showroom UI, Car Selector, Paint Swatches, and Stat Bars
- `src/components/Hud.jsx` — Hull, Nitro, Wanted Stars, Camera/Repair/Save controls, and Mobile Touch Pads
- `src/components/GameCanvas.jsx` — Three.js scene lifecycle, vehicle physics, collision detection, pedestrian & police pursuit AI, and camera controller
- `src/three/carBuilder.js` — Realistic 3D car exterior, detailed cockpit interior, rotating steering wheel, live canvas-rendered in-dash speedometer/tachometer, exhaust nitro flames, and police cruiser meshes
- `src/three/worldBuilder.js` — Sunny city buildings, wide white road strips, zebra crossings, elevated arch bridges, canal & harbor water, pit-stop repair pads, and animated pedestrians
- `src/audio/SoundEngine.js` — Procedural Web Audio API engine RPM, nitro boost pitch, collision impact, and police siren synthesizer
- `src/data/cars.js` — Vehicle catalog stats and paint swatches
