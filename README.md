<div align="center">

# 🚗 DuoDrive City 3D

**A colorful city, an open road, and a car that's ready to go.**

Explore a 3D city from your browser, weave through its avenues, and find your favorite camera angle along the way.

`React` · `TypeScript` · `Three.js` · `WebAssembly` · `Vite`

</div>

---

## 🏙️ Welcome to the city

Take a drive through a procedural city grid filled with multi-lane roads, intersections, buildings, street lights, traffic signals, and open-air markets. A heading-up minimap keeps the city in view while the speedometer and drift indicator follow your drive.

- **Drive your way** — use a keyboard on desktop or on-screen controls on a phone.
- **Change perspective** — switch between close chase, top view, and interior POV cameras.
- **Feel the road** — vehicle physics, collisions, drifting, and procedural engine and crash audio bring the drive to life.
- **Explore the details** — look out for crosswalks, market stalls, window facades, and cycling traffic lights.

## 🚀 Get driving

You'll need **Node.js and npm** installed. From the project directory, run:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, choose **PC / Desktop** or **Phone / Touch**, and select **Start Driving**.

For a production build and local preview:

```bash
npm run build
npm run preview
```

## 🌐 Deployment

Run `npm ci` followed by `npm run build`, then publish the contents of `dist/` to a static host at the domain root. No server-side application or environment variables are required. Use HTTPS for production browser features such as WebGPU and fullscreen where supported. `npm run preview` is for checking the build locally, not for serving production traffic.

The default build uses root-relative asset paths. If deploying under a subdirectory, configure Vite's `base` for that path and rebuild. The app uses Google Fonts, so the font requires an internet connection; a fallback font is available.

## 🎮 Controls

| Action | Keyboard |
| --- | --- |
| Accelerate | `W` or `↑` |
| Brake / reverse | `S` or `↓` |
| Steer | `A` / `D` or `←` / `→` |
| Drift | `Space` |
| Change camera | `V` |

On a phone, choose the touch profile for on-screen steering, gas, reverse, and drift buttons. The app will also try to enter fullscreen landscape mode; availability depends on the browser. The HUD includes buttons to change camera, reset the car, mute audio, and return to the menu.

## 🔧 Under the hood

| Part | What it does |
| --- | --- |
| **React + TypeScript** | App, menu, and driving HUD |
| **Three.js** | City and vehicle rendering, with a WebGPU attempt and WebGL fallback |
| **WebAssembly** | Vehicle and collision physics, with a JavaScript fallback |
| **Web Audio API** | Procedural vehicle, crash, and interface sounds |
| **Vite + Tailwind CSS** | Development tooling and styling |

## 🗺️ Project map

```text
src/
├── audio/          Procedural sound engine
├── components/     Menu, HUD, buttons, and minimap
├── engine/         City renderer and vehicle physics
├── App.tsx         Game loop, input, and application state
└── main.tsx        React entry point
```

---

<div align="center">
  <strong>Pick a direction. Enjoy the drive.</strong> 🟢
</div>
