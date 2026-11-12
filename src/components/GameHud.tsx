import React from 'react';
import {
  Video,
  RotateCcw,
  Volume2,
  VolumeX,
  Home,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Flame,
  Maximize2
} from 'lucide-react';
import { DuoButton } from './DuoButton';
import { CameraMode, CityLayoutData } from '../engine/openWorldRenderer';
import { DeviceProfile } from './MainMenu';
import { MiniMap } from './MiniMap';

export interface ControlState {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
}

interface GameHudProps {
  speedKmh: number;
  driftIntensity: number;
  carX: number;
  carZ: number;
  carHeading: number;
  cityLayout: CityLayoutData | null;
  cameraMode: CameraMode;
  device: DeviceProfile;
  muted: boolean;
  controls: ControlState;
  isPortraitWarning: boolean;
  onCycleCamera: () => void;
  onResetCar: () => void;
  onToggleMute: () => void;
  onBackToMenu: () => void;
  onControlChange: (key: keyof ControlState, pressed: boolean) => void;
  onRequestFullscreenLandscape: () => void;
}

const CAMERA_LABELS: Record<CameraMode, string> = {
  chase: 'Close Chase (V)',
  top: 'Top View (V)',
  pov: 'Interior POV (V)'
};

export const GameHud: React.FC<GameHudProps> = ({
  speedKmh,
  driftIntensity,
  carX,
  carZ,
  carHeading,
  cityLayout,
  cameraMode,
  device,
  muted,
  controls,
  isPortraitWarning,
  onCycleCamera,
  onResetCar,
  onToggleMute,
  onBackToMenu,
  onControlChange,
  onRequestFullscreenLandscape
}) => {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top Bar: GPS Minimap + Speedometer + Camera Switcher + Actions */}
      <div className="flex items-start justify-between gap-2 pointer-events-auto">
        {/* Top-Left: Live Rotating GPS Minimap + Speedometer */}
        <div className="flex items-start gap-3">
          <MiniMap
            carX={carX}
            carZ={carZ}
            carHeading={carHeading}
            cityLayout={cityLayout}
          />

          <div className="flex flex-col gap-2">
            <div className="rounded-2xl bg-white/95 text-[#4B4B4B] border-2 border-[#E5E5E5] shadow-[0_4px_0_#E5E5E5] px-3.5 py-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black tabular-nums text-[#58CC02]">
                {Math.round(speedKmh)}
              </span>
              <span className="text-xs font-black uppercase text-[#AFAFAF]">KM/H</span>
            </div>

            {driftIntensity > 0.28 && (
              <div className="rounded-2xl bg-[#FFC800] text-[#4B4B4B] shadow-[0_4px_0_#E5B400] px-3 py-1.5 flex items-center gap-1 animate-bounce self-start">
                <Flame className="w-4 h-4 fill-current" />
                <span className="text-xs font-black uppercase">DRIFT!</span>
              </div>
            )}
          </div>
        </div>

        {/* Top-Right: Camera Toggle (V) + Reset + Audio + Home */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <DuoButton
            variant="blue"
            onClick={onCycleCamera}
            pitch={1.25}
            className="px-3.5 py-2.5 text-xs sm:text-sm flex items-center gap-1.5"
          >
            <Video className="w-4 h-4" />
            <span>{CAMERA_LABELS[cameraMode]}</span>
          </DuoButton>

          <DuoButton
            variant="yellow"
            onClick={onResetCar}
            pitch={1.1}
            ariaLabel="Reset Car"
            className="p-2.5"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
          </DuoButton>

          <DuoButton
            variant="white"
            onClick={onToggleMute}
            pitch={1.0}
            ariaLabel="Toggle Audio"
            className="p-2.5"
          >
            {muted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF4B4B]" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#58CC02]" />}
          </DuoButton>

          <DuoButton
            variant="white"
            onClick={onBackToMenu}
            pitch={0.95}
            ariaLabel="Main Menu"
            className="p-2.5"
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5" />
          </DuoButton>
        </div>
      </div>

      {/* Landscape Rotation Prompt on Phone Portrait */}
      {device === 'phone' && isPortraitWarning && (
        <div className="self-center pointer-events-auto rounded-2xl bg-[#131F24]/90 border-2 border-[#1CB0F6] px-5 py-3 text-center shadow-xl flex items-center gap-3">
          <Maximize2 className="w-6 h-6 text-[#1CB0F6] animate-pulse" />
          <div className="text-left">
            <p className="text-sm font-black text-white">Rotate to Landscape</p>
            <p className="text-xs font-bold text-[#84D8FF]">Tap to enter Fullscreen Landscape</p>
          </div>
          <DuoButton variant="blue" onClick={onRequestFullscreenLandscape} className="px-3 py-2 text-xs">
            Lock
          </DuoButton>
        </div>
      )}

      {/* Bottom Controls */}
      {device === 'phone' ? (
        <div className="flex items-end justify-between w-full pointer-events-auto pb-1">
          <div className="flex items-center gap-3">
            <DuoButton
              variant="touch-blue"
              active={controls.left}
              onPressStart={() => onControlChange('left', true)}
              onPressEnd={() => onControlChange('left', false)}
              pitch={0.95}
              ariaLabel="Steer Left"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center"
            >
              <ChevronLeft className="w-11 h-11 stroke-[3]" />
            </DuoButton>

            <DuoButton
              variant="touch-blue"
              active={controls.right}
              onPressStart={() => onControlChange('right', true)}
              onPressEnd={() => onControlChange('right', false)}
              pitch={1.05}
              ariaLabel="Steer Right"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center"
            >
              <ChevronRight className="w-11 h-11 stroke-[3]" />
            </DuoButton>
          </div>

          <div className="flex items-end gap-3">
            <DuoButton
              variant="touch-yellow"
              active={controls.drift}
              onPressStart={() => onControlChange('drift', true)}
              onPressEnd={() => onControlChange('drift', false)}
              pitch={1.15}
              ariaLabel="Drift"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center gap-0.5"
            >
              <Flame className="w-6 h-6" />
              <span className="text-[11px] font-black">DRIFT</span>
            </DuoButton>

            <DuoButton
              variant="touch-red"
              active={controls.brake}
              onPressStart={() => onControlChange('brake', true)}
              onPressEnd={() => onControlChange('brake', false)}
              pitch={0.85}
              ariaLabel="Brake and Reverse"
              className="w-18 h-20 sm:w-20 sm:h-22 px-4 rounded-3xl flex flex-col items-center justify-center"
            >
              <ArrowDown className="w-8 h-8 stroke-[3]" />
              <span className="text-[10px] font-black">REV</span>
            </DuoButton>

            <DuoButton
              variant="touch-green"
              active={controls.throttle}
              onPressStart={() => onControlChange('throttle', true)}
              onPressEnd={() => onControlChange('throttle', false)}
              pitch={1.3}
              ariaLabel="Accelerate"
              className="w-22 h-24 sm:w-24 sm:h-28 px-5 rounded-3xl flex flex-col items-center justify-center"
            >
              <ArrowUp className="w-10 h-10 stroke-[3]" />
              <span className="text-xs font-black">GAS</span>
            </DuoButton>
          </div>
        </div>
      ) : (
        <div className="self-center rounded-2xl bg-[#131F24]/75 backdrop-blur-md border border-white/15 px-4 py-2 text-xs font-extrabold text-white/90 flex items-center gap-4">
          <span><b className="text-[#58CC02]">W / ↑</b> Gas</span>
          <span><b className="text-[#FF4B4B]">S / ↓</b> Brake</span>
          <span><b className="text-[#1CB0F6]">A D / ← →</b> Steer</span>
          <span><b className="text-[#FFC800]">SPACE</b> Drift</span>
          <span><b className="text-[#CE82FF]">V</b> Camera Angle</span>
        </div>
      )}
    </div>
  );
};
