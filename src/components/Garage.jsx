import React from 'react';
import { CAR_CATALOG, SWATCH_COLORS } from '../data/cars.js';

export default function Garage({
  selectedCarIdx,
  carColor,
  onSelectColor,
  onCycleCar,
  onBackMenu,
  onDriveNow
}) {
  const activeCar = CAR_CATALOG[selectedCarIdx];

  return (
    <div className="screen transparent-bg garage-layout">
      <div className="garage-top interactive-panel">
        <button
          className="btn btn-ghost"
          style={{ width: 'auto', padding: '10px 18px', fontSize: 14 }}
          onClick={onBackMenu}
        >
          &larr; Menu
        </button>
        <div style={{ fontWeight: 900, fontSize: 18 }}>3D Car Garage</div>
        <div className="brand-badge" style={{ margin: 0 }}>
          {selectedCarIdx + 1} / {CAR_CATALOG.length}
        </div>
      </div>

      <div className="garage-bottom interactive-panel">
        <div className="car-selector-row">
          <button className="nav-circle" onClick={() => onCycleCar(-1)}>
            &lsaquo;
          </button>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900 }}>{activeCar.name}</h2>
            <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{activeCar.desc}</div>
          </div>
          <button className="nav-circle" onClick={() => onCycleCar(1)}>
            &rsaquo;
          </button>
        </div>

        <div className="swatch-row">
          {SWATCH_COLORS.map((hex) => (
            <button
              key={hex}
              className={`swatch ${carColor.toLowerCase() === hex.toLowerCase() ? 'active' : ''}`}
              style={{ background: hex }}
              onClick={() => onSelectColor(hex)}
            />
          ))}
        </div>

        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-label">Top Speed</div>
            <div className="stat-bar">
              <div className="stat-fill" style={{ width: `${activeCar.statSpeed}%` }} />
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Acceleration</div>
            <div className="stat-bar">
              <div
                className="stat-fill"
                style={{ width: `${activeCar.statAccel}%`, background: 'var(--blue-main)' }}
              />
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Armor &amp; Handling</div>
            <div className="stat-bar">
              <div
                className="stat-fill"
                style={{ width: `${activeCar.statArmor}%`, background: 'var(--amber-main)' }}
              />
            </div>
          </div>
        </div>

        <button className="btn btn-green" onClick={onDriveNow}>
          Drive Now
        </button>
      </div>
    </div>
  );
}
