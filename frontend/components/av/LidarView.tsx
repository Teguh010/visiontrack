"use client";

import { useEffect, useRef, useState } from "react";
import { AvLidarData, AvAnnotationsData, AvAnnotation, LidarPoint } from "@/types/av-sensor";
import { Radar, RotateCcw, Box } from "lucide-react";

type ViewMode = "top" | "front" | "side" | "3d";

interface LidarViewProps {
  lidar: AvLidarData | null;
  annotations?: AvAnnotationsData | null;
  width?: number;
  height?: number;
}

const VIEW_LABELS: Record<ViewMode, string> = {
  top: "Top View (Bird's Eye)",
  front: "Front View",
  side: "Side View",
  "3d": "3D Perspective",
};

export function LidarView({ lidar, annotations, width = 300, height = 300 }: LidarViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("top");
  const [rotation, setRotation] = useState(0); // For 3D view rotation
  const [showBoxes, setShowBoxes] = useState(true); // Toggle bounding boxes

  // Auto-rotate 3D view (requestAnimationFrame, ~20 updates/sec)
  useEffect(() => {
    if (viewMode !== "3d") return;

    let rafId = 0;
    let lastTick = performance.now();

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (now - lastTick >= 50) {
        lastTick = now;
        setRotation((r) => (r + 1) % 360);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
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

    // Draw 3D bounding boxes for detected objects
    if (showBoxes && annotations?.annotations) {
      drawBoundingBoxes(
        ctx,
        annotations.annotations,
        centerX,
        centerY,
        scaleXY,
        scaleZ,
        viewMode,
        rotation
      );
    }
  }, [lidar, annotations, width, height, viewMode, rotation, showBoxes]);

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
        <div className="flex gap-1">
          <button
            onClick={() => setShowBoxes(!showBoxes)}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
              showBoxes 
                ? "bg-amber-500/80 text-white" 
                : "bg-black/60 hover:bg-black/80 text-gray-400"
            }`}
            title="Toggle 3D bounding boxes"
          >
            <Box className="w-3 h-3" />
            {annotations?.count ?? 0}
          </button>
          <button
            onClick={cycleView}
            className="bg-black/60 hover:bg-black/80 px-2 py-1 rounded text-xs text-white flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
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

// ─── Helper: Draw 3D Bounding Boxes ───────────────────────────────────────────

function drawBoundingBoxes(
  ctx: CanvasRenderingContext2D,
  annotations: AvAnnotation[],
  centerX: number,
  centerY: number,
  scaleXY: number,
  scaleZ: number,
  mode: ViewMode,
  rotation: number
) {
  annotations.forEach((ann) => {
    const { x, y, z, width: w, length: l, height: h, yaw, color, category, distance } = ann;

    ctx.strokeStyle = color || "#f59e0b";
    ctx.lineWidth = 1.5;

    if (mode === "top") {
      // Top-down view: draw rotated rectangle
      const screenX = centerX - y * scaleXY;
      const screenY = centerY - x * scaleXY;
      const boxW = l * scaleXY; // length along x
      const boxH = w * scaleXY; // width along y

      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.rotate(-yaw); // Canvas rotation is clockwise

      // Draw rotated bounding box
      ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

      // Draw direction indicator (front of object)
      ctx.fillStyle = color || "#f59e0b";
      ctx.beginPath();
      ctx.moveTo(boxW / 2, 0);
      ctx.lineTo(boxW / 2 - 4, -3);
      ctx.lineTo(boxW / 2 - 4, 3);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Draw category label
      ctx.fillStyle = color || "#f59e0b";
      ctx.font = "9px sans-serif";
      const label = `${category.split(".").pop()} ${distance.toFixed(0)}m`;
      ctx.fillText(label, screenX - ctx.measureText(label).width / 2, screenY - boxH / 2 - 4);

    } else if (mode === "front") {
      // Front view: y = left/right, z = up/down
      const screenX = centerX - y * scaleXY;
      const screenY = centerY - z * scaleZ - 30;
      const boxW = w * scaleXY;  // width
      const boxH = h * scaleZ;   // height

      // Draw rectangle
      ctx.strokeRect(screenX - boxW / 2, screenY - boxH / 2, boxW, boxH);

      // Label
      ctx.fillStyle = color || "#f59e0b";
      ctx.font = "9px sans-serif";
      const label = category.split(".").pop() || category;
      ctx.fillText(label, screenX - ctx.measureText(label).width / 2, screenY - boxH / 2 - 3);

    } else if (mode === "side") {
      // Side view: x = forward/back, z = up/down
      const screenX = centerX + x * scaleXY;
      const screenY = centerY - z * scaleZ - 30;
      const boxW = l * scaleXY;  // length
      const boxH = h * scaleZ;   // height

      ctx.strokeRect(screenX - boxW / 2, screenY - boxH / 2, boxW, boxH);

      // Label
      ctx.fillStyle = color || "#f59e0b";
      ctx.font = "9px sans-serif";
      const label = `${distance.toFixed(0)}m`;
      ctx.fillText(label, screenX - ctx.measureText(label).width / 2, screenY - boxH / 2 - 3);

    } else if (mode === "3d") {
      // 3D projection with rotation
      const rad = (rotation * Math.PI) / 180;

      // Transform 8 corners of bounding box
      const halfL = l / 2;
      const halfW = w / 2;
      const halfH = h / 2;

      // Local corners (before yaw rotation)
      const corners = [
        [-halfL, -halfW, -halfH],
        [halfL, -halfW, -halfH],
        [halfL, halfW, -halfH],
        [-halfL, halfW, -halfH],
        [-halfL, -halfW, halfH],
        [halfL, -halfW, halfH],
        [halfL, halfW, halfH],
        [-halfL, halfW, halfH],
      ];

      // Apply yaw rotation and translate to position
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);

      const worldCorners = corners.map(([lx, ly, lz]) => {
        const rx = lx * cosYaw - ly * sinYaw + x;
        const ry = lx * sinYaw + ly * cosYaw + y;
        const rz = lz + z;
        return [rx, ry, rz];
      });

      // Project to screen with view rotation
      const project = (wx: number, wy: number, wz: number) => {
        const rotX = wx * Math.cos(rad) - wy * Math.sin(rad);
        const rotY = wx * Math.sin(rad) + wy * Math.cos(rad);
        const sx = centerX + (rotY - rotX) * scaleXY * 0.5;
        const sy = centerY - wz * scaleZ * 0.8 - (rotX + rotY) * scaleXY * 0.25;
        return [sx, sy];
      };

      const screenCorners = worldCorners.map(([wx, wy, wz]) => project(wx, wy, wz));

      // Draw 12 edges of the box
      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0], // bottom
        [4, 5], [5, 6], [6, 7], [7, 4], // top
        [0, 4], [1, 5], [2, 6], [3, 7], // verticals
      ];

      ctx.beginPath();
      edges.forEach(([i, j]) => {
        const [x1, y1] = screenCorners[i];
        const [x2, y2] = screenCorners[j];
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      });
      ctx.stroke();
    }
  });
}
