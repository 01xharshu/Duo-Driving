import React from 'react';
import { soundEngine } from '../audio/soundEngine';

export type DuoVariant = 'green' | 'blue' | 'yellow' | 'red' | 'white' | 'white-selected' | 'touch-green' | 'touch-red' | 'touch-blue' | 'touch-yellow';

interface DuoButtonProps {
  children: React.ReactNode;
  variant?: DuoVariant;
  onClick?: () => void;
  onPressStart?: () => void;
  onPressEnd?: () => void;
  className?: string;
  active?: boolean;
  pitch?: number;
  ariaLabel?: string;
}

export const DuoButton: React.FC<DuoButtonProps> = ({
  children,
  variant = 'green',
  onClick,
  onPressStart,
  onPressEnd,
  className = '',
  active = false,
  pitch = 1.0,
  ariaLabel
}) => {
  const variantClass = `duo-${variant}`;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    soundEngine.playUiClick(pitch);
    if (onPressStart) onPressStart();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (onPressEnd) onPressEnd();
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={onClick}
      className={`duo-btn ${variantClass} ${active ? 'is-pressed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};
