"use client";

import { useEffect, useRef, useState } from "react";
import { AvLidarData, LidarPoint } from "@/types/av-sensor";
import { Radar, RotateCcw } from "lucide-react";

type ViewMode = "top" | "front" | "side" | "3d";

interface LidarViewProps {
  lidar: AvLidarData | null;
  width?: number;
  height?: number;
}

const VIEW_LABELS: Record<ViewMode, string> = {
  top: "Top View (Bird's Eye)",
  front: "Front View",
  side: "Side View",
  "3d": "3D Perspective",
};

export function LidarView({ lidar, width = 300, height = 300 }: LidarViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("top");
  const [rotation, setRotation] = useState(0); // For 3D view rotation

  // Auto-rotate 3D view
  useEffect(() => {
    if (viewMode !== "3d") return;
    const interval = setInterval(() => {
      setRotation((r) => (r + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [viewMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    // Draw grid based on view mode
    drawGrid(ctx, width, height, viewMode);

    // Draw vehicle indicator
    drawVehicle(ctx, centerX, centerY, viewMode);

    if (!lidar || !lidar.points.length) return;

    // Scale factors
    const scaleXY = 120 / 50; // 50m range -> 120px
    const scaleZ = 60 / 4;    // 4m height range -> 60px

    // Draw points based on view mode
    lidar.points.forEach((point: LidarPoint) => {
      const [x, y, z, intensity] = point;

      let screenX: number, screenY: number;

      switch (viewMode) {
        case "top":
          // Top-down view: x = forward, y = left
          screenX = centerX - y * scaleXY;
          screenY = centerY - x * scaleXY;
          break;

        case "front":
          // Front view: y = left/right, z = up/down
          screenX = centerX - y * scaleXY;
          screenY = centerY - z * scaleZ - 30; // Offset down
          break;

        case "side":
          // Side view: x = forward/back, z = up/down
          screenX = centerX + x * scaleXY;
          screenY = centerY - z * scaleZ - 30;
          break;

        case "3d":
          // Simple 3D projection with rotation
          const rad = (rotation * Math.PI) / 180;
          const rotX = x * Math.cos(rad) - y * Math.sin(rad);
          const rotY = x * Math.sin(rad) + y * Math.cos(rad);
          // Isometric-like projection
          screenX = centerX + (rotY - rotX) * scaleXY * 0.5;
          screenY = centerY - z * scaleZ * 0.8 - (rotX + rotY) * scaleXY * 0.25;
          break;

        default:
          screenX = centerX;
          screenY = centerY;
      }

      // Skip points outside canvas
      if (screenX < 0 || screenX > width || screenY < 0 || screenY > height) return;

      // Color based on height (z) and intensity
      const normalizedZ = Math.min(1, Math.max(0, (z + 2) / 4));
      const hue = viewMode === "3d" 
        ? 280 - normalizedZ * 80  // Purple to blue for 3D
        : 200 + normalizedZ * 60; // Blue to cyan for others
      const alpha = 0.4 + intensity * 0.6;

      ctx.fillStyle = `hsla(${hue}, 85%, 55%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(screenX, screenY, viewMode === "3d" ? 1.2 : 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [lidar, width, height, viewMode, rotation]);

  const cycleView = () => {
    const views: ViewMode[] = ["top", "front", "side", "3d"];
    const currentIndex = views.indexOf(viewMode);
    setViewMode(views[(currentIndex + 1) % views.length]);
  };

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      {/* Header with view selector */}
      <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between">
        <div className="bg-black/60 px-2 py-1 rounded text-xs font-medium text-white flex items-center gap-1.5">
          <Radar className="w-3 h-3" />
          LiDAR {VIEW_LABELS[viewMode]}
        </div>
        <button
          onClick={cycleView}
          className="bg-black/60 hover:bg-black/80 px-2 py-1 rounded text-xs text-white flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Switch View
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block cursor-pointer"
        onClick={cycleView}
      />

      {/* Stats */}
      {lidar && (
        <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 rounded text-xs text-gray-300">
          {lidar.pointCount} pts | Frame {lidar.frame}
        </div>
      )}

      {/* View indicator pills */}
      <div className="absolute bottom-2 left-2 flex gap-1">
        {(["top", "front", "side", "3d"] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => setViewMode(v)}
            className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
              viewMode === v
                ? "bg-purple-500 text-white"
                : "bg-black/40 text-gray-400 hover:bg-black/60"
            }`}
          >
            {v.toUpperCase()}
          </button>
        ))}
      </div>

      {/* No data state */}
      {!lidar && (
        <div
          className="absolute inset-0 flex items-center justify-center text-gray-500"
          style={{ width, height }}
        >
          <div className="text-center">
            <Radar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No LiDAR data</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper: Draw Grid ────────────────────────────────────────────────────────

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: ViewMode
) {
  const centerX = width / 2;
  const centerY = height / 2;

  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;

  if (mode === "top") {
    // Concentric circles for top view
    for (let r = 30; r <= 140; r += 35) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Cross lines
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();
  } else if (mode === "front" || mode === "side") {
    // Horizontal lines (ground levels)
    const groundY = centerY + 30;
    for (let y = groundY; y > 20; y -= 40) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();
    }
    // Ground line (thicker)
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();
    // Vertical center
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();
  } else if (mode === "3d") {
    // Simple 3D grid floor
    ctx.strokeStyle = "#1e293b33";
    const gridSize = 30;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(centerX + i * gridSize - 50, centerY + 50);
      ctx.lineTo(centerX + i * gridSize + 50, centerY - 50);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(centerX - 90 + i * 30, centerY + i * 15);
      ctx.lineTo(centerX + 90 + i * 30, centerY + i * 15);
      ctx.stroke();
    }
  }
}

// ─── Helper: Draw Vehicle ─────────────────────────────────────────────────────

function drawVehicle(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  mode: ViewMode
) {
  ctx.fillStyle = "#10b981";

  if (mode === "top") {
    // Triangle pointing up (forward)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 10);
    ctx.lineTo(centerX - 6, centerY + 6);
    ctx.lineTo(centerX + 6, centerY + 6);
    ctx.closePath();
    ctx.fill();
  } else if (mode === "front") {
    // Rectangle (car front view)
    ctx.fillRect(centerX - 12, centerY + 20, 24, 15);
    // Windshield
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(centerX - 8, centerY + 8, 16, 12);
  } else if (mode === "side") {
    // Car side profile
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY + 35);
    ctx.lineTo(centerX - 15, centerY + 20);
    ctx.lineTo(centerX + 5, centerY + 20);
    ctx.lineTo(centerX + 20, centerY + 35);
    ctx.closePath();
    ctx.fill();
  } else if (mode === "3d") {
    // Small dot at center
    ctx.beginPath();
    ctx.arc(centerX, centerY + 20, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
