import React from 'react';

export function DeviceSelectScreen({ onSelectDevice }) {
  return (
    <div className="screen">
      <div className="card">
        <div className="brand-badge">DuoDrive 3D</div>
        <h1>Select Control Mode</h1>
        <p className="subtitle">Choose how you want to drive before entering the city.</p>
        <div className="device-grid">
          <button className="btn btn-blue device-btn" onClick={() => onSelectDevice('pc')}>
            <span className="device-icon">&#128421;</span>
            <span>PC / Desktop</span>
          </button>
          <button className="btn btn-green device-btn" onClick={() => onSelectDevice('mobile')}>
            <span className="device-icon">&#128241;</span>
            <span>Phone / Touch</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function MainMenuScreen({
  controlMode,
  hasSave,
  onOpenGarage,
  onContinueSaved,
  onSaveProgress,
  onOpenSettings,
  onSwitchDevice
}) {
  return (
    <div className="screen">
      <div className="card">
        <div className="brand-badge">
          {controlMode === 'pc' ? 'PC / Desktop Mode' : 'Phone / Touch Mode'}
        </div>
        <h1>DuoDrive 3D</h1>
        <p className="subtitle">
          Bright open city, bridges, pedestrians, and high-speed police pursuits.
        </p>
        <div className="stack">
          <button className="btn btn-green" onClick={onOpenGarage}>
            Play (Garage)
          </button>
          <button className="btn btn-blue" disabled={!hasSave} onClick={onContinueSaved}>
            Continue Saved Drive
          </button>
          <button className="btn btn-amber" onClick={onSaveProgress}>
            Save Progress
          </button>
          <button className="btn btn-ghost" onClick={onOpenSettings}>
            Settings
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 13, padding: '11px 16px' }}
            onClick={onSwitchDevice}
          >
            Switch Device Mode
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsScreen({ settings, onChangeSettings, onDone }) {
  return (
    <div className="screen">
      <div className="card">
        <div className="brand-badge">Preferences</div>
        <h1>Game Settings</h1>
        <p className="subtitle">Tune audio, steering responsiveness, and cockpit field of view.</p>

        <div className="setting-row">
          <div className="setting-header">
            <span>Master Volume</span>
            <span className="setting-val">{Math.round(settings.masterVol * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(settings.masterVol * 100)}
            onChange={(e) =>
              onChangeSettings((s) => ({ ...s, masterVol: Number(e.target.value) / 100 }))
            }
          />
        </div>

        <div className="setting-row">
          <div className="setting-header">
            <span>Engine &amp; Siren SFX</span>
            <span className="setting-val">{Math.round(settings.engineVol * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(settings.engineVol * 100)}
            onChange={(e) =>
              onChangeSettings((s) => ({ ...s, engineVol: Number(e.target.value) / 100 }))
            }
          />
        </div>

        <div className="setting-row">
          <div className="setting-header">
            <span>Steering Sensitivity</span>
            <span className="setting-val">{settings.steerSens.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="50"
            max="180"
            value={Math.round(settings.steerSens * 100)}
            onChange={(e) =>
              onChangeSettings((s) => ({ ...s, steerSens: Number(e.target.value) / 100 }))
            }
          />
        </div>

        <div className="setting-row">
          <div className="setting-header">
            <span>Cockpit Camera FOV</span>
            <span className="setting-val">{settings.fov}&deg;</span>
          </div>
          <input
            type="range"
            min="55"
            max="88"
            value={settings.fov}
            onChange={(e) => onChangeSettings((s) => ({ ...s, fov: Number(e.target.value) }))}
          />
        </div>

        <div className="setting-row">
          <div className="setting-header">
            <span>Graphics &amp; Shadows</span>
            <span className="setting-val">
              {settings.gfx === 1 ? 'Low' : settings.gfx === 2 ? 'Medium' : 'High'}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="3"
            value={settings.gfx}
            onChange={(e) => onChangeSettings((s) => ({ ...s, gfx: Number(e.target.value) }))}
          />
        </div>

        <div className="stack" style={{ marginTop: 10 }}>
          <button className="btn btn-green" onClick={onDone}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export function WastedScreen({ wastedInfo, onRespawn, onGarage, onMenu }) {
  return (
    <div className="screen wasted-overlay">
      <div className="card">
        <div className="brand-badge" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
          {wastedInfo.badge}
        </div>
        <div className="wasted-title">{wastedInfo.title}</div>
        <p className="subtitle">{wastedInfo.reason}</p>
        <div className="stack">
          <button className="btn btn-green" onClick={onRespawn}>
            Respawn Vehicle
          </button>
          <button className="btn btn-blue" onClick={onGarage}>
            Return to Garage
          </button>
          <button className="btn btn-ghost" onClick={onMenu}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
