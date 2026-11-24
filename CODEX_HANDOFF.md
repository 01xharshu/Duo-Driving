# Codex handoff

## README refresh
- Last updated: 2026-11-13 (Asia/Kolkata)
- Task: Make the README beautiful.
- Status: COMPLETE
- Scope: Rewrite the root README with a polished presentation and accurate setup, controls, and project details.
- Completed: Reorganized the README with a centered introduction, feature highlights, setup and build commands, controls, technology overview, and project map.
- Files changed: README.md, CODEX_HANDOFF.md.
- Evidence: Compared documentation against package.json, src/App.tsx, src/components/GameHud.tsx, and renderer and physics fallback references. Documentation-only change; no build required.
- Blockers: None.
- Next action: None.

## Deployment readiness
- Last updated: 2026-11-13 03:37 IST (Asia/Kolkata)
- Task: Prepare DuoDrive for deployment.
- Status: IN_PROGRESS
- Scope: Validate the production build and runtime, fix deployment blockers, and document deployment requirements.
- Completed: Inspected package scripts, Vite configuration, HTML, Git status, and previous handoff.
- Files changed: CODEX_HANDOFF.md, README.md, src/engine/wasmPhysics.ts.
- Tests/evidence: Initial `npm run build` failed with TS2339 at src/engine/wasmPhysics.ts:81: WebAssembly.instantiate overload inferred Instance instead of the byte-source result.
- Blockers: Deployment host and target URL are unspecified; actual hosting and host-specific verification remain outstanding.
- Next action: Deploy dist/ to the chosen static host and verify on the target URL and devices. Investigate WebAssembly fallback and dark rendering if native WASM or visual quality is required.
- Milestone: Fixed WebAssembly byte-source typing; `npm run build` passes, with Vite warnings about large JS chunks. Production preview at http://127.0.0.1:4173/ loaded the menu and driving HUD; holding W increased speed from 0 to 146 km/h. Preview reported JS-DETERMINISTIC-FALLBACK and the rendered scene appeared very dark; WebGPU/WASM success and visual quality across devices remain unverified. README documents static hosting and subdirectory base configuration.
