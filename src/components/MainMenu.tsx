import React from 'react';
import { Monitor, Smartphone, Play, Building2, Cpu, Layers } from 'lucide-react';
import { DuoButton } from './DuoButton';

export type DeviceProfile = 'pc' | 'phone';

interface MainMenuProps {
  selectedDevice: DeviceProfile;
  onSelectDevice: (device: DeviceProfile) => void;
  onStartGame: () => void;
  backendLabel: string;
  wasmBackend: string;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  selectedDevice,
  onSelectDevice,
  onStartGame,
  backendLabel,
  wasmBackend
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#131F24]/85 backdrop-blur-md p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white text-[#4B4B4B] border-2 border-[#E5E5E5] shadow-[0_10px_0_#E5E5E5] p-6 sm:p-8 flex flex-col items-center gap-5">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDF4FF] text-[#1899D6] text-xs font-black tracking-wide uppercase">
            <Layers className="w-3.5 h-3.5" />
            {backendLabel} 3D
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5FFCC] text-[#58A700] text-xs font-black tracking-wide uppercase">
            <Cpu className="w-3.5 h-3.5" />
            {wasmBackend}
          </span>
        </div>

        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#58CC02] shadow-[0_5px_0_#58A700] text-white mb-2">
            <Building2 className="w-9 h-9" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#3C3C3C]">
            DuoDrive <span className="text-[#58CC02]">City 3D</span>
          </h1>
          <p className="text-sm sm:text-base font-bold text-[#777777]">
            Avenues, Traffic Lights, Markets & GPS Minimap • Press <span className="px-2 py-0.5 rounded-lg bg-[#F7F7F7] border border-[#E5E5E5] text-[#4B4B4B] font-black">V</span> for Cameras
          </p>
        </div>

        <div className="w-full space-y-2.5">
          <p className="text-xs font-black uppercase tracking-wider text-[#AFAFAF] text-center">
            Select Your Device
          </p>
          <div className="grid grid-cols-2 gap-3.5">
            <DuoButton
              variant={selectedDevice === 'pc' ? 'white-selected' : 'white'}
              onClick={() => onSelectDevice('pc')}
              pitch={1.1}
              className="py-4 px-3 flex flex-col items-center justify-center gap-2"
            >
              <Monitor className="w-8 h-8" />
              <span className="text-sm sm:text-base font-black">PC / Desktop</span>
              <span className="text-[11px] font-bold opacity-75 normal-case">
                WASD / Arrows + V Cam
              </span>
            </DuoButton>

            <DuoButton
              variant={selectedDevice === 'phone' ? 'white-selected' : 'white'}
              onClick={() => onSelectDevice('phone')}
              pitch={1.2}
              className="py-4 px-3 flex flex-col items-center justify-center gap-2"
            >
              <Smartphone className="w-8 h-8" />
              <span className="text-sm sm:text-base font-black">Phone / Touch</span>
              <span className="text-[11px] font-bold opacity-75 normal-case">
                Auto Fullscreen Landscape
              </span>
            </DuoButton>
          </div>
        </div>

        <DuoButton
          variant="green"
          onClick={onStartGame}
          pitch={1.35}
          className="w-full py-4 text-lg sm:text-xl flex items-center justify-center gap-2.5"
        >
          <Play className="w-6 h-6 fill-current" />
          Start Driving
        </DuoButton>
      </div>
    </div>
  );
};
