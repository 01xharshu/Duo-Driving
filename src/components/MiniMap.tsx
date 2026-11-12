import React, { useEffect, useRef } from 'react';
import { CityLayoutData } from '../engine/openWorldRenderer';

interface MiniMapProps {
  carX: number;
  carZ: number;
  carHeading: number;
  cityLayout: CityLayoutData | null;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  carX,
  carZ,
  carHeading,
  cityLayout
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cityLayout) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // Radar zoom scale: 1 meter = 1.15 pixels (shows ~120m radius around car)
    const scale = 1.12;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    // Circular radar clip
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.clip();

    // Grass / City background
    ctx.fillStyle = '#1E2D35';
    ctx.fillRect(0, 0, w, h);

    // Heading-up rotation so the player arrow always points straight up
    ctx.translate(cx, cy);
    ctx.rotate(carHeading);
    ctx.translate(-carX * scale, -carZ * scale);

    const worldHalf = cityLayout.worldHalf;
    const worldSpan = worldHalf * 2;
    const roadW = cityLayout.roadWidth * scale;

    // Draw Asphalt Avenues
    ctx.fillStyle = '#475569';
    for (const r of cityLayout.roadCoords) {
      const rp = r * scale;
      ctx.fillRect(rp - roadW / 2, -worldHalf * scale, roadW, worldSpan * scale);
      ctx.fillRect(-worldHalf * scale, rp - roadW / 2, worldSpan * scale, roadW);
    }

    // Road center yellow dashed lines
    ctx.strokeStyle = '#FFC800';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const r of cityLayout.roadCoords) {
      const rp = r * scale;
      ctx.beginPath();
      ctx.moveTo(rp, -worldHalf * scale);
      ctx.lineTo(rp, worldHalf * scale);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-worldHalf * scale, rp);
      ctx.lineTo(worldHalf * scale, rp);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw Buildings, Markets & Intersections
    for (const b of cityLayout.blockers) {
      if (b.kind === 'pole' || b.kind === 'wall') continue;
      const bx = b.minX * scale;
      const bz = b.minZ * scale;
      const bw = b.w * scale;
      const bd = b.d * scale;

      if (b.kind === 'market') {
        ctx.fillStyle = '#FF9600';
      } else {
        ctx.fillStyle = '#94A3B8';
      }
      ctx.fillRect(bx, bz, bw, bd);
    }

    // Traffic signal dots at intersections
    ctx.fillStyle = '#58CC02';
    for (const rx of cityLayout.roadCoords) {
      for (const rz of cityLayout.roadCoords) {
        ctx.beginPath();
        ctx.arc(rx * scale, rz * scale, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // Player Car Chevron at center of radar
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#58CC02';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 4);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, [carX, carZ, carHeading, cityLayout]);

  return (
    <div className="relative flex flex-col items-center">
      <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-[#131F24] border-4 border-white shadow-[0_5px_0_#E5E5E5] overflow-hidden relative">
        <canvas
          ref={canvasRef}
          width={160}
          height={160}
          className="w-full h-full block"
        />
        <span className="absolute top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-[#131F24]/80 text-[9px] font-black text-[#FFC800] tracking-wider">
          GPS
        </span>
      </div>
    </div>
  );
};
