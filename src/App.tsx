import React, { useEffect, useRef, useState, useCallback } from 'react';
import { OpenWorldRenderer, CameraMode, CityLayoutData } from './engine/openWorldRenderer';
import { WasmPhysicsEngine } from './engine/wasmPhysics';
import { soundEngine } from './audio/soundEngine';
import { MainMenu, DeviceProfile } from './components/MainMenu';
import { GameHud, ControlState } from './components/GameHud';

export function App() {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<OpenWorldRenderer | null>(null);
  const physicsRef = useRef<WasmPhysicsEngine | null>(null);

  const [inMenu, setInMenu] = useState(true);
  const [device, setDevice] = useState<DeviceProfile>(() =>
    window.innerWidth < 820 ? 'phone' : 'pc'
  );
  const [backendLabel, setBackendLabel] = useState<'WebGPU' | 'WebGL2'>('WebGPU');
  const [wasmBackend, setWasmBackend] = useState<string>('WASM-Binary-Core');
  const [cityLayout, setCityLayout] = useState<CityLayoutData | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [speedKmh, setSpeedKmh] = useState(0);
  const [driftIntensity, setDriftIntensity] = useState(0);
  const [carPose, setCarPose] = useState({ x: 0, z: 0, heading: 0 });
  const [muted, setMuted] = useState(false);
  const [isPortraitWarning, setIsPortraitWarning] = useState(false);

  const [controls, setControls] = useState<ControlState>({
    throttle: false,
    brake: false,
    left: false,
    right: false,
    drift: false
  });
  const controlsRef = useRef<ControlState>(controls);
  controlsRef.current = controls;

  const enterFullscreenLandscape = useCallback(async () => {
    try {
      const docEl = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      }
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (mode: string) => Promise<void>;
      };
      if (orientation && orientation.lock) {
        await orientation.lock('landscape');
      }
    } catch {
      // Handled via HUD prompt if browser blocks orientation lock
    }
  }, []);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortraitWarning(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  useEffect(() => {
    if (!canvasHostRef.current) return;
    let disposed = false;
    let rafId = 0;

    const boot = async () => {
      const renderer = new OpenWorldRenderer(canvasHostRef.current!);
      const info = await renderer.init();
      if (disposed) {
        renderer.dispose();
        return;
      }
      rendererRef.current = renderer;
      setBackendLabel(info.backend);
      setCityLayout(renderer.getCityLayout());

      const wasm = new WasmPhysicsEngine();
      await wasm.init(renderer.blockers);
      if (disposed) return;
      physicsRef.current = wasm;
      setWasmBackend(wasm.backendName);

      let lastTime = performance.now();
      let uiSyncAccum = 0;

      const tick = (now: number) => {
        if (disposed) return;
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        const c = controlsRef.current;
        const throttle = c.throttle ? 1 : 0;
        const brake = c.brake ? 1 : 0;
        const steer = (c.left ? 1 : 0) - (c.right ? 1 : 0);
        const handbrake = c.drift ? 1 : 0;

        wasm.setInputs(throttle, brake, steer, handbrake);
        const state = wasm.step(dt);

        if (state.impactImpulse > 1.5) {
          soundEngine.playCrash(state.impactImpulse);
        }
        soundEngine.updateVehicleAudio(state.speed, throttle, state.driftIntensity);

        renderer.update(state, dt);

        uiSyncAccum += dt;
        if (uiSyncAccum >= 0.05) {
          uiSyncAccum = 0;
          setSpeedKmh(state.speed * 3.6);
          setDriftIntensity(state.driftIntensity);
          setCarPose({ x: state.x, z: state.z, heading: state.heading });
        }

        rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);
    };

    boot();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      rendererRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const code = e.code;

      if (code === 'KeyV') {
        if (rendererRef.current) {
          const next = rendererRef.current.cycleCameraMode();
          setCameraMode(next);
          soundEngine.playUiClick(1.25);
        }
        return;
      }

      if (code === 'KeyW' || code === 'ArrowUp') {
        setControls((prev) => ({ ...prev, throttle: true }));
      } else if (code === 'KeyS' || code === 'ArrowDown') {
        setControls((prev) => ({ ...prev, brake: true }));
      } else if (code === 'KeyA' || code === 'ArrowLeft') {
        setControls((prev) => ({ ...prev, left: true }));
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        setControls((prev) => ({ ...prev, right: true }));
      } else if (code === 'Space') {
        setControls((prev) => ({ ...prev, drift: true }));
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') {
        setControls((prev) => ({ ...prev, throttle: false }));
      } else if (code === 'KeyS' || code === 'ArrowDown') {
        setControls((prev) => ({ ...prev, brake: false }));
      } else if (code === 'KeyA' || code === 'ArrowLeft') {
        setControls((prev) => ({ ...prev, left: false }));
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        setControls((prev) => ({ ...prev, right: false }));
      } else if (code === 'Space') {
        setControls((prev) => ({ ...prev, drift: false }));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const handleStartGame = async () => {
    soundEngine.init();
    soundEngine.playUiClick(1.35);
    setInMenu(false);
    if (device === 'phone') {
      await enterFullscreenLandscape();
    }
  };

  const handleCycleCamera = () => {
    if (!rendererRef.current) return;
    const next = rendererRef.current.cycleCameraMode();
    setCameraMode(next);
  };

  const handleResetCar = () => {
    physicsRef.current?.reset();
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundEngine.setMuted(next);
  };

  const handleControlChange = (key: keyof ControlState, pressed: boolean) => {
    soundEngine.init();
    setControls((prev) => ({ ...prev, [key]: pressed }));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#131F24]">
      <div ref={canvasHostRef} className="absolute inset-0 w-full h-full" />

      {inMenu ? (
        <MainMenu
          selectedDevice={device}
          onSelectDevice={setDevice}
          onStartGame={handleStartGame}
          backendLabel={backendLabel}
          wasmBackend={wasmBackend}
        />
      ) : (
        <GameHud
          speedKmh={speedKmh}
          driftIntensity={driftIntensity}
          carX={carPose.x}
          carZ={carPose.z}
          carHeading={carPose.heading}
          cityLayout={cityLayout}
          cameraMode={cameraMode}
          device={device}
          muted={muted}
          controls={controls}
          isPortraitWarning={isPortraitWarning}
          onCycleCamera={handleCycleCamera}
          onResetCar={handleResetCar}
          onToggleMute={handleToggleMute}
          onBackToMenu={() => setInMenu(true)}
          onControlChange={handleControlChange}
          onRequestFullscreenLandscape={enterFullscreenLandscape}
        />
      )}
    </div>
  );
}

export default App;
