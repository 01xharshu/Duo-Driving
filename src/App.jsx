import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CAR_CATALOG } from './data/cars.js';
import { SoundEngine } from './audio/SoundEngine.js';
import GameCanvas from './components/GameCanvas.jsx';
import Garage from './components/Garage.jsx';
import Hud from './components/Hud.jsx';
import {
  DeviceSelectScreen,
  MainMenuScreen,
  SettingsScreen,
  WastedScreen
} from './components/Menus.jsx';

const SAVE_KEY = 'duodrive3d_react_v2_save';

export default function App() {
  const soundRef = useRef(null);
  if (!soundRef.current) {
    soundRef.current = new SoundEngine();
  }

  const [phase, setPhase] = useState('device'); // 'device' | 'menu' | 'settings' | 'garage' | 'playing' | 'wasted'
  const [controlMode, setControlMode] = useState('pc'); // 'pc' | 'mobile'
  const [selectedCarIdx, setSelectedCarIdx] = useState(0);
  const [carColor, setCarColor] = useState(CAR_CATALOG[0].defaultColor);
  const [cameraMode, setCameraMode] = useState('cockpit'); // 'cockpit' | 'chase' | 'hood'

  const [settings, setSettings] = useState({
    masterVol: 0.8,
    engineVol: 0.75,
    steerSens: 1.0,
    fov: 68,
    gfx: 3
  });

  const [hudState, setHudState] = useState({
    health: 100,
    maxHealth: 100,
    nitro: 100,
    wanted: 0
  });

  const [wastedInfo, setWastedInfo] = useState({
    badge: 'Critical Impact',
    title: 'WRECKED!',
    reason: 'Your vehicle suffered catastrophic damage.'
  });

  const [hasSave, setHasSave] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [resetSignal, setResetSignal] = useState(0);
  const [repairSignal, setRepairSignal] = useState(0);
  const [initialSpawn, setInitialSpawn] = useState(null);

  const playerSnapshotRef = useRef({
    x: 0,
    y: 0,
    z: 40,
    heading: 0,
    health: 100,
    nitro: 100,
    wanted: 0,
    casualties: 0
  });

  const touchControlsRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    nitro: false
  });

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 2200);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    try {
      setHasSave(Boolean(localStorage.getItem(SAVE_KEY)));
    } catch {
      setHasSave(false);
    }
  }, []);

  const handleSaveProgress = () => {
    const payload = {
      selectedCarIdx,
      carColor,
      cameraMode,
      settings,
      player: playerSnapshotRef.current,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      setHasSave(true);
      showToast('Progress Saved!');
    } catch {
      showToast('Unable to save progress');
    }
  };

  const handleContinueSaved = () => {
    soundRef.current.init();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const idx = saved.selectedCarIdx ?? 0;
      setSelectedCarIdx(idx);
      setCarColor(saved.carColor || CAR_CATALOG[idx].defaultColor);
      setCameraMode(saved.cameraMode || 'cockpit');
      if (saved.settings) setSettings((prev) => ({ ...prev, ...saved.settings }));
      setInitialSpawn({ ...(saved.player || {}), _ts: Date.now() });
      setPhase('playing');
      showToast('Resumed Saved Session');
    } catch {
      showToast('Failed to load save');
    }
  };

  const handleToggleCamera = useCallback(() => {
    setCameraMode((prev) => {
      const order = ['cockpit', 'chase', 'hood'];
      return order[(order.indexOf(prev) + 1) % order.length];
    });
  }, []);

  const handleCrashDeath = useCallback((info) => {
    setWastedInfo(info);
    setPhase('wasted');
  }, []);

  const selectDevice = (mode) => {
    soundRef.current.init();
    setControlMode(mode);
    setPhase('menu');
  };

  const startDriveFromGarage = () => {
    soundRef.current.init();
    setResetSignal((s) => s + 1);
    setPhase('playing');
  };

  const cycleCar = (delta) => {
    const nextIdx = (selectedCarIdx + delta + CAR_CATALOG.length) % CAR_CATALOG.length;
    setSelectedCarIdx(nextIdx);
    setCarColor(CAR_CATALOG[nextIdx].defaultColor);
  };

  return (
    <>
      <GameCanvas
        phase={phase}
        selectedCarIdx={selectedCarIdx}
        carColor={carColor}
        cameraMode={cameraMode}
        settings={settings}
        soundEngine={soundRef.current}
        initialSpawn={initialSpawn}
        resetSignal={resetSignal}
        repairSignal={repairSignal}
        touchControlsRef={touchControlsRef}
        playerSnapshotRef={playerSnapshotRef}
        onToggleCamera={handleToggleCamera}
        onHudUpdate={setHudState}
        onCrashDeath={handleCrashDeath}
        onToast={showToast}
      />

      {phase === 'playing' && hudState.wanted > 0 && <div className="siren-vignette active" />}

      {toastMsg && <div className="toast show">{toastMsg}</div>}

      {phase === 'device' && <DeviceSelectScreen onSelectDevice={selectDevice} />}

      {phase === 'menu' && (
        <MainMenuScreen
          controlMode={controlMode}
          hasSave={hasSave}
          onOpenGarage={() => {
            soundRef.current.init();
            setPhase('garage');
          }}
          onContinueSaved={handleContinueSaved}
          onSaveProgress={handleSaveProgress}
          onOpenSettings={() => setPhase('settings')}
          onSwitchDevice={() => setPhase('device')}
        />
      )}

      {phase === 'settings' && (
        <SettingsScreen
          settings={settings}
          onChangeSettings={setSettings}
          onDone={() => setPhase('menu')}
        />
      )}

      {phase === 'garage' && (
        <Garage
          selectedCarIdx={selectedCarIdx}
          carColor={carColor}
          onSelectColor={setCarColor}
          onCycleCar={cycleCar}
          onBackMenu={() => setPhase('menu')}
          onDriveNow={startDriveFromGarage}
        />
      )}

      {phase === 'playing' && (
        <Hud
          controlMode={controlMode}
          cameraMode={cameraMode}
          hudState={hudState}
          touchControlsRef={touchControlsRef}
          onToggleCamera={handleToggleCamera}
          onRepair={() => {
            setRepairSignal((r) => r + 1);
            showToast('Vehicle Repaired!');
          }}
          onSave={handleSaveProgress}
          onOpenMenu={() => setPhase('menu')}
        />
      )}

      {phase === 'wasted' && (
        <WastedScreen
          wastedInfo={wastedInfo}
          onRespawn={startDriveFromGarage}
          onGarage={() => setPhase('garage')}
          onMenu={() => setPhase('menu')}
        />
      )}
    </>
  );
}
