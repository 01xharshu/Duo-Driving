# DuoDrive City 3D — WebGPU + WASM Open-World City Driving Game

A client-side 3D open-world city driving game built with **React 18**, **TypeScript**, **Three.js (WebGPU + WebGL2 fallback)**, **compiled WebAssembly (WASM) rigid-body & AABB collision physics**, **Web Audio API procedural sound synthesis**, and **Duolingo-inspired tactile 3D UI**.

## What's New in City Edition
- **Realistic Multi-Lane City Road Grid (`src/engine/openWorldRenderer.ts`)**: 5×5 asphalt avenues with concrete sidewalks, double yellow center lines, white dashed lane dividers, solid shoulder lines, and zebra crosswalks at every intersection.
- **Road Street Light Poles & Animated Traffic Light Poles**:
  - Curved sidewalk street light poles with glowing LED luminaires along avenues.
  - Cantilever traffic signal poles at intersections with live cycling Red, Yellow, and Green lights—all registered as solid collidable AABB blockers in WASM memory.
- **City Architecture & Open-Air Markets**:
  - Multi-story residential and commercial buildings with procedural window facades, parapet roof ledges, and rooftop HVAC units.
  - Lively open-air market plazas featuring central pavilions and colorful striped-awning market stalls.
- **Live Heading-Up GPS Minimap (`src/components/MiniMap.tsx`)**: Circular Duolingo-styled radar HUD showing roads, intersections, buildings, orange market districts, and your car's live position and heading.

## Quick Start
```bash
npm install
npm run dev
```
