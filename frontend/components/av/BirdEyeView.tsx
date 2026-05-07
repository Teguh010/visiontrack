"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AvGpsData } from "@/types/av-sensor";
import { Eye, ZoomIn, ZoomOut, Crosshair, RotateCcw } from "lucide-react";

interface BirdEyeViewProps {
  gps: AvGpsData | null;
  width?: number;
  height?: number;
}

interface TrailPoint {
  x: number;
  y: number;
  heading: number;
  timestamp: number;
}

const MAX_TRAIL = 500;
const GRID_COLOR = "rgba(100, 116, 139, 0.3)";
const GRID_COLOR_MAJOR = "rgba(100, 116, 139, 0.5)";

export function BirdEyeView({ gps, width = 288, height = 200 }: BirdEyeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [scale, setScale] = useState(2); // pixels per meter
  const [followMode, setFollowMode] = useState(true);
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);

  // Update trail when position changes
  const gpsX = gps?.x ?? 0;
  const gpsY = gps?.y ?? 0;
  const gpsHeading = gps?.heading ?? 0;

  useEffect(() => {
    if (gpsX === 0 && gpsY === 0) return;

    setTrail((prev) => {
      const last = prev[prev.length - 1];
      // Avoid duplicate points
      if (last && Math.abs(last.x - gpsX) < 0.05 && Math.abs(last.y - gpsY) < 0.05) {
        return prev;
      }

      const newTrail = [
        ...prev,
        { x: gpsX, y: gpsY, heading: gpsHeading, timestamp: Date.now() },
      ];
      if (newTrail.length > MAX_TRAIL) newTrail.shift();
      return newTrail;
    });

    // Update center in follow mode
    if (followMode) {
      setCenter({ x: gpsX, y: gpsY });
    }
  }, [gpsX, gpsY, gpsHeading, followMode]);

  // Convert world coordinates to canvas coordinates
  const worldToCanvas = useCallback(
    (wx: number, wy: number): [number, number] => {
      const cx = center?.x ?? gpsX;
      const cy = center?.y ?? gpsY;
      // Canvas: x right, y down. World: x east, y north
      const canvasX = width / 2 + (wx - cx) * scale;
      const canvasY = height / 2 - (wy - cy) * scale; // Flip Y
      return [canvasX, canvasY];
    },
    [center, gpsX, gpsY, width, height, scale]
  );

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Clear with dark background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    if (!gps || (gpsX === 0 && gpsY === 0)) {
      ctx.fillStyle = "#64748b";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Waiting for GPS...", width / 2, height / 2);
      return;
    }

    const cx = center?.x ?? gpsX;
    const cy = center?.y ?? gpsY;

    // Draw grid
    const gridSize = scale >= 4 ? 5 : scale >= 2 ? 10 : 20; // meters
    const majorGridSize = gridSize * 5;

    // Calculate visible world bounds
    const worldLeft = cx - width / 2 / scale;
    const worldRight = cx + width / 2 / scale;
    const worldBottom = cy - height / 2 / scale;
    const worldTop = cy + height / 2 / scale;

    // Draw minor grid
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    ctx.beginPath();

    // Vertical lines
    const startX = Math.floor(worldLeft / gridSize) * gridSize;
    for (let wx = startX; wx <= worldRight; wx += gridSize) {
      if (wx % majorGridSize !== 0) {
        const [x1] = worldToCanvas(wx, worldBottom);
        const [x2] = worldToCanvas(wx, worldTop);
        ctx.moveTo(x1, 0);
        ctx.lineTo(x2, height);
      }
    }

    // Horizontal lines
    const startY = Math.floor(worldBottom / gridSize) * gridSize;
    for (let wy = startY; wy <= worldTop; wy += gridSize) {
      if (wy % majorGridSize !== 0) {
        const [, y1] = worldToCanvas(worldLeft, wy);
        const [, y2] = worldToCanvas(worldRight, wy);
        ctx.moveTo(0, y1);
        ctx.lineTo(width, y2);
      }
    }
    ctx.stroke();

    // Draw major grid
    ctx.strokeStyle = GRID_COLOR_MAJOR;
    ctx.lineWidth = 1;
    ctx.beginPath();

    const majorStartX = Math.floor(worldLeft / majorGridSize) * majorGridSize;
    for (let wx = majorStartX; wx <= worldRight; wx += majorGridSize) {
      const [x1] = worldToCanvas(wx, worldBottom);
      ctx.moveTo(x1, 0);
      ctx.lineTo(x1, height);
    }

    const majorStartY = Math.floor(worldBottom / majorGridSize) * majorGridSize;
    for (let wy = majorStartY; wy <= worldTop; wy += majorGridSize) {
      const [, y1] = worldToCanvas(worldLeft, wy);
      ctx.moveTo(0, y1);
      ctx.lineTo(width, y1);
    }
    ctx.stroke();

    // Draw trail as road-like path
    if (trail.length > 1) {
      // Road outline (wider, darker)
      ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      trail.forEach((point, i) => {
        const [x, y] = worldToCanvas(point.x, point.y);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Road surface (lighter)
      ctx.strokeStyle = "rgba(71, 85, 105, 0.9)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      trail.forEach((point, i) => {
        const [x, y] = worldToCanvas(point.x, point.y);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Center line (dashed yellow)
      ctx.strokeStyle = "rgba(234, 179, 8, 0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      trail.forEach((point, i) => {
        const [x, y] = worldToCanvas(point.x, point.y);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Trail markers (small dots showing direction)
      const markerInterval = Math.max(1, Math.floor(trail.length / 30));
      trail.forEach((point, i) => {
        if (i % markerInterval !== 0) return;
        const [x, y] = worldToCanvas(point.x, point.y);
        const alpha = 0.3 + (i / trail.length) * 0.5;
        ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw vehicle
    const [vx, vy] = worldToCanvas(gpsX, gpsY);

    // Vehicle glow
    const gradient = ctx.createRadialGradient(vx, vy, 0, vx, vy, 25);
    gradient.addColorStop(0, "rgba(16, 185, 129, 0.5)");
    gradient.addColorStop(1, "rgba(16, 185, 129, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(vx, vy, 25, 0, Math.PI * 2);
    ctx.fill();

    // Vehicle body (car shape)
    ctx.save();
    ctx.translate(vx, vy);
    // nuScenes heading: 0=East, 90=North, 180=West, -90=South
    // Canvas: 0=right(East), positive=clockwise
    // We flip Y in worldToCanvas, so we need to negate heading
    // Car is drawn pointing right (+X), so no offset needed
    ctx.rotate((-gpsHeading * Math.PI) / 180);

    // Car body
    const carLength = 16;
    const carWidth = 8;
    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.roundRect(-carLength / 2, -carWidth / 2, carLength, carWidth, 2);
    ctx.fill();

    // Windshield
    ctx.fillStyle = "#34d399";
    ctx.beginPath();
    ctx.roundRect(carLength / 4, -carWidth / 2 + 1, carLength / 4, carWidth - 2, 1);
    ctx.fill();

    // Direction indicator (arrow at front)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(carLength / 2 + 4, 0);
    ctx.lineTo(carLength / 2 - 2, -3);
    ctx.lineTo(carLength / 2 - 2, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Draw compass
    const compassX = width - 25;
    const compassY = height - 25;
    const compassR = 15;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.arc(compassX, compassY, compassR + 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(compassX, compassY, compassR, 0, Math.PI * 2);
    ctx.stroke();

    // N arrow
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(compassX, compassY - compassR + 2);
    ctx.lineTo(compassX - 4, compassY);
    ctx.lineTo(compassX + 4, compassY);
    ctx.closePath();
    ctx.fill();

    // S arrow
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.moveTo(compassX, compassY + compassR - 2);
    ctx.lineTo(compassX - 4, compassY);
    ctx.lineTo(compassX + 4, compassY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("N", compassX, compassY - compassR - 4);

    // Scale indicator
    const scaleBarMeters = scale >= 4 ? 10 : scale >= 2 ? 20 : 50;
    const scaleBarPx = scaleBarMeters * scale;
    const scaleY = height - 12;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(8, scaleY - 6, scaleBarPx + 10, 14);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, scaleY);
    ctx.lineTo(12 + scaleBarPx, scaleY);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${scaleBarMeters}m`, 14 + scaleBarPx, scaleY + 3);
  }, [gps, gpsX, gpsY, gpsHeading, trail, width, height, scale, center, worldToCanvas]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      {/* Header */}
      <div className="absolute top-2 left-2 z-10 bg-black/70 px-2 py-1 rounded text-xs font-medium text-white flex items-center gap-1.5">
        <Eye className="w-3 h-3" />
        Bird&apos;s Eye View
      </div>

      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          onClick={() => setScale((s) => Math.min(s * 1.5, 10))}
          className="bg-black/70 hover:bg-black/90 p-1.5 rounded text-white transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-3 h-3" />
        </button>
        <button
          onClick={() => setScale((s) => Math.max(s / 1.5, 0.5))}
          className="bg-black/70 hover:bg-black/90 p-1.5 rounded text-white transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-3 h-3" />
        </button>
        <button
          onClick={() => {
            setFollowMode(true);
            setScale(2);
          }}
          className={`p-1.5 rounded transition-colors ${
            followMode
              ? "bg-emerald-600 text-white"
              : "bg-black/70 hover:bg-black/90 text-white"
          }`}
          title="Follow vehicle"
        >
          <Crosshair className="w-3 h-3" />
        </button>
        <button
          onClick={() => setTrail([])}
          className="bg-black/70 hover:bg-black/90 p-1.5 rounded text-white transition-colors"
          title="Clear trail"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      <canvas ref={canvasRef} width={width} height={height} className="block" />

      {/* Info */}
      {gps && (
        <div className="absolute bottom-2 left-2 text-[10px] text-gray-300">
          <span className="bg-black/70 px-1.5 py-0.5 rounded">
            ({gpsX.toFixed(0)}, {gpsY.toFixed(0)})m | {gpsHeading.toFixed(0)}°
          </span>
        </div>
      )}
    </div>
  );
}
