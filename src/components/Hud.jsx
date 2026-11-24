import React from 'react';

export default function Hud({
  controlMode,
  cameraMode,
  hudState,
  touchControlsRef,
  onToggleCamera,
  onRepair,
  onSave,
  onOpenMenu
}) {
  const healthPct = Math.max(0, Math.min(100, (hudState.health / hudState.maxHealth) * 100));
  const nitroPct = Math.max(0, Math.min(100, hudState.nitro ?? 100));
  const camLabel = cameraMode === 'cockpit' ? 'Cockpit' : cameraMode === 'chase' ? 'Chase' : 'Hood';

  const bindTouch = (key) => ({
    onTouchStart: (e) => {
      e.preventDefault();
      touchControlsRef.current[key] = true;
    },
    onTouchEnd: (e) => {
      e.preventDefault();
      touchControlsRef.current[key] = false;
    },
    onMouseDown: () => {
      touchControlsRef.current[key] = true;
    },
    onMouseUp: () => {
      touchControlsRef.current[key] = false;
    },
    onMouseLeave: () => {
      touchControlsRef.current[key] = false;
    }
  });

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-pill-group">
          <div className="hud-pill">
            <span>Hull</span>
            <div className="health-track">
              <div
                className="health-fill"
                style={{
                  width: `${healthPct}%`,
                  background:
                    healthPct > 50
                      ? 'var(--green-main)'
                      : healthPct > 25
                      ? 'var(--amber-main)'
                      : 'var(--red-main)'
                }}
              />
            </div>
            <span>{Math.round(healthPct)}%</span>
          </div>

          <div className="hud-pill">
            <span>Nitro</span>
            <div className="health-track" style={{ width: 68 }}>
              <div
                className="health-fill"
                style={{ width: `${nitroPct}%`, background: 'var(--blue-main)' }}
              />
            </div>
          </div>

          <div className="hud-pill">
            <span>Wanted</span>
            <div className="wanted-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={star <= hudState.wanted ? 'star-on' : 'star-off'}>
                  &#9733;
                </span>
              ))}
            </div>
          </div>

          {hudState.wanted > 0 && (
            <div
              className="hud-pill"
              style={{
                background: '#FEF2F2',
                borderColor: '#FCA5A5',
                color: '#B91C1C'
              }}
            >
              &#128680; Police Pursuit!
            </div>
          )}
        </div>

        <div className="hud-pill-group">
          <button className="hud-pill hud-btn" onClick={onToggleCamera}>
            Cam: {camLabel} (C)
          </button>
          <button className="hud-pill hud-btn" onClick={onRepair}>
            Repair (R)
          </button>
          <button className="hud-pill hud-btn" onClick={onSave}>
            Save
          </button>
          <button className="hud-pill hud-btn" onClick={onOpenMenu}>
            Menu
          </button>
        </div>
      </div>

      {controlMode === 'mobile' && (
        <div className="touch-controls">
          <div className="touch-cluster">
            <button className="touch-pad" {...bindTouch('left')}>
              &larr;
            </button>
            <button className="touch-pad" {...bindTouch('right')}>
              &rarr;
            </button>
          </div>
          <div className="touch-cluster">
            <button className="touch-pad touch-nitro" {...bindTouch('nitro')}>
              N2O
            </button>
            <button className="touch-pad touch-brake" {...bindTouch('down')}>
              BRK
            </button>
            <button className="touch-pad touch-gas" {...bindTouch('up')}>
              GAS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
