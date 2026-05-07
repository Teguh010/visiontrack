"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { AvLidarData, AvAnnotationsData, AvAnnotation, LidarPoint } from "@/types/av-sensor";
import { 
  Radar, Eye, EyeOff, Car,
  AlertTriangle, Layers 
} from "lucide-react";

interface LidarSceneViewProps {
  lidar: AvLidarData | null;
  annotations?: AvAnnotationsData | null;
  width?: number;
  height?: number;
}

interface SceneAnalysis {
  groups: Record<string, AvAnnotation[]>;
  closest: AvAnnotation | null;
  total: number;
}

// Height-based color zones for environment understanding
const HEIGHT_ZONES = [
  { max: -1.5, color: "#1e3a5f", label: "Below Ground" },      // Deep blue - pits/curbs
  { max: -0.3, color: "#2d4a3e", label: "Ground Level" },      // Dark green - road
  { max: 0.3,  color: "#3d5a4e", label: "Low Objects" },       // Green - curbs, small objects
  { max: 1.0,  color: "#8b7355", label: "Medium" },            // Brown - cars, barriers
  { max: 2.0,  color: "#c9a227", label: "Vehicle Height" },    // Yellow - trucks, vans
  { max: 4.0,  color: "#e85d04", label: "Tall Objects" },      // Orange - buildings, trees
  { max: Infinity, color: "#9d0208", label: "Very Tall" },     // Red - high structures
];

// Object category icons and colors
const CATEGORY_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  "human": { icon: "👤", color: "#ef4444", label: "Pedestrian" },
  "vehicle.car": { icon: "🚗", color: "#3b82f6", label: "Car" },
  "vehicle.truck": { icon: "🚛", color: "#8b5cf6", label: "Truck" },
  "vehicle.bus": { icon: "🚌", color: "#6366f1", label: "Bus" },
  "vehicle.motorcycle": { icon: "🏍️", color: "#ec4899", label: "Motorcycle" },
  "vehicle.bicycle": { icon: "🚲", color: "#14b8a6", label: "Bicycle" },
  "vehicle.construction": { icon: "🚜", color: "#f59e0b", label: "Construction" },
  "movable_object": { icon: "📦", color: "#78716c", label: "Object" },
  "static_object": { icon: "🏗️", color: "#64748b", label: "Static" },
};

function getHeightColor(z: number): string {
  for (const zone of HEIGHT_ZONES) {
    if (z < zone.max) return zone.color;
  }
  return HEIGHT_ZONES[HEIGHT_ZONES.length - 1].color;
}

function getCategoryConfig(category: string) {
  // Try exact match first, then partial match
  if (CATEGORY_CONFIG[category]) return CATEGORY_CONFIG[category];
  for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
    if (category.includes(key) || key.includes(category.split('.')[0])) {
      return config;
    }
  }
  return { icon: "❓", color: "#9ca3af", label: category };
}

export function LidarSceneView({ lidar, annotations, width = 400, height = 400 }: LidarSceneViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showPoints, setShowPoints] = useState(true);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [range, setRange] = useState(50); // View range in meters

  // Analyze scene - group objects by category and find closest
  const sceneAnalysis = useMemo<SceneAnalysis>(() => {
    if (!annotations?.annotations) return { groups: {}, closest: null, total: 0 };
    
    const groups: Record<string, AvAnnotation[]> = {};
    let closest: AvAnnotation | null = null;
    
    annotations.annotations.forEach(ann => {
      const simpleCat = ann.category.split('.')[0];
      if (!groups[simpleCat]) groups[simpleCat] = [];
      groups[simpleCat].push(ann);
      
      if (!closest || ann.distance < closest.distance) {
        closest = ann;
      }
    });
    
    return { groups, closest, total: annotations.count };
  }, [annotations]);

  // Scale factor based on range
  const scale = useMemo(() => (width / 2 - 40) / range, [width, range]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear with dark background
    ctx.fillStyle = "#0a0f1a";
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    // ─── Draw Distance Rings ─────────────────────────────────────────────
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.font = "10px system-ui";
    ctx.fillStyle = "#475569";
    
    const ringDistances = [10, 20, 30, 40, 50].filter(d => d <= range);
    ringDistances.forEach(distance => {
      const r = distance * scale;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
      // Distance label
      ctx.fillText(`${distance}m`, centerX + r + 3, centerY - 3);
    });

    // ─── Draw Cardinal Directions ────────────────────────────────────────
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("↑ FRONT", centerX, 18);
    ctx.fillText("↓ REAR", centerX, height - 8);
    ctx.save();
    ctx.translate(15, centerY);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("← LEFT", 0, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(width - 15, centerY);
    ctx.rotate(Math.PI / 2);
    ctx.fillText("→ RIGHT", 0, 0);
    ctx.restore();
    ctx.textAlign = "left";

    // ─── Draw Cross Lines ────────────────────────────────────────────────
    ctx.strokeStyle = "#1e3a5f";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(centerX, 25);
    ctx.lineTo(centerX, height - 25);
    ctx.moveTo(25, centerY);
    ctx.lineTo(width - 25, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // ─── Draw LiDAR Points ───────────────────────────────────────────────
    if (showPoints && lidar?.points.length) {
      lidar.points.forEach((point: LidarPoint) => {
        const [x, y, z, intensity] = point;
        
        // Skip points outside range
        const dist = Math.sqrt(x * x + y * y);
        if (dist > range) return;

        // Top-down projection: x = forward, y = left
        const screenX = centerX - y * scale;
        const screenY = centerY - x * scale;

        // Skip if outside canvas
        if (screenX < 20 || screenX > width - 20 || screenY < 20 || screenY > height - 20) return;

        // Color based on height
        const color = getHeightColor(z);
        
        // Size and opacity based on distance (closer = larger, brighter)
        const distFactor = 1 - (dist / range) * 0.5;
        const size = 1 + distFactor;
        const alpha = 0.3 + intensity * 0.5 + distFactor * 0.2;

        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    // ─── Draw Bounding Boxes ─────────────────────────────────────────────
    if (showBoxes && annotations?.annotations) {
      annotations.annotations.forEach((ann) => {
        const { x, y, width: w, length: l, yaw, color, category, distance } = ann;
        
        // Skip if outside range
        if (distance > range) return;

        const screenX = centerX - y * scale;
        const screenY = centerY - x * scale;
        const boxW = l * scale;
        const boxH = w * scale;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(-yaw);

        // Box fill with transparency
        ctx.fillStyle = color + "33"; // 20% opacity
        ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);

        // Box outline
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

        // Direction indicator (front arrow)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(boxW / 2 + 3, 0);
        ctx.lineTo(boxW / 2 - 5, -5);
        ctx.lineTo(boxW / 2 - 5, 5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Label
        if (showLabels) {
          const config = getCategoryConfig(category);
          ctx.fillStyle = color;
          ctx.font = "bold 10px system-ui";
          const labelText = `${config.icon} ${distance.toFixed(1)}m`;
          const textWidth = ctx.measureText(labelText).width;
          
          // Background for label
          ctx.fillStyle = "#0a0f1a99";
          ctx.fillRect(screenX - textWidth / 2 - 2, screenY - boxH / 2 - 16, textWidth + 4, 14);
          
          ctx.fillStyle = color;
          ctx.textAlign = "center";
          ctx.fillText(labelText, screenX, screenY - boxH / 2 - 5);
          ctx.textAlign = "left";
        }
      });
    }

    // ─── Draw Ego Vehicle ────────────────────────────────────────────────
    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 12);
    ctx.lineTo(centerX - 8, centerY + 8);
    ctx.lineTo(centerX + 8, centerY + 8);
    ctx.closePath();
    ctx.fill();
    
    // Vehicle outline
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 1;
    ctx.strokeRect(centerX - 10, centerY - 6, 20, 18);

  }, [lidar, annotations, width, height, scale, range, showPoints, showBoxes, showLabels]);

  const cycleRange = () => {
    const ranges = [30, 50, 75, 100];
    const idx = ranges.indexOf(range);
    setRange(ranges[(idx + 1) % ranges.length]);
  };

  return (
    <div className="flex flex-col bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      {/* Main visualization */}
      <div className="relative">
        {/* Header */}
        <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between">
          <div className="bg-black/70 px-2 py-1 rounded text-xs font-medium text-white flex items-center gap-1.5">
            <Radar className="w-3.5 h-3.5 text-purple-400" />
            LiDAR Scene View
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setShowPoints(!showPoints)}
              className={`p-1.5 rounded text-xs transition-colors ${
                showPoints ? "bg-purple-500/80 text-white" : "bg-black/60 text-gray-400"
              }`}
              title="Toggle point cloud"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowBoxes(!showBoxes)}
              className={`p-1.5 rounded text-xs transition-colors ${
                showBoxes ? "bg-amber-500/80 text-white" : "bg-black/60 text-gray-400"
              }`}
              title="Toggle bounding boxes"
            >
              <Car className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`p-1.5 rounded text-xs transition-colors ${
                showLabels ? "bg-cyan-500/80 text-white" : "bg-black/60 text-gray-400"
              }`}
              title="Toggle labels"
            >
              {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={cycleRange}
              className="bg-black/60 hover:bg-black/80 px-2 py-1 rounded text-xs text-white transition-colors"
              title="Change view range"
            >
              {range}m
            </button>
          </div>
        </div>

        <canvas ref={canvasRef} width={width} height={height} className="block" />

        {/* Stats overlay */}
        {lidar && (
          <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-gray-300">
            {lidar.pointCount.toLocaleString()} points
          </div>
        )}
      </div>

      {/* Scene Analysis Panel */}
      <div className="bg-gray-800/50 border-t border-gray-700 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Detected Objects
          </span>
          <span className="text-xs text-gray-500">
            {sceneAnalysis.total} total
          </span>
        </div>

        {/* Closest object warning */}
        {sceneAnalysis.closest && sceneAnalysis.closest.distance < 15 && (
          <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 rounded px-2 py-1.5 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-300">
              <span className="font-semibold">
                {getCategoryConfig(sceneAnalysis.closest.category).label}
              </span>
              {" "}at {sceneAnalysis.closest.distance.toFixed(1)}m
            </span>
          </div>
        )}

        {/* Object groups */}
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(sceneAnalysis.groups).map(([cat, items]) => {
            const config = getCategoryConfig(cat);
            const closest = items.reduce((a, b) => a.distance < b.distance ? a : b);
            return (
              <div 
                key={cat}
                className="bg-gray-900/50 rounded px-2 py-1.5 flex items-center gap-2"
              >
                <span className="text-lg">{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">
                    {items.length}× {config.label}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    nearest: {closest.distance.toFixed(1)}m
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {sceneAnalysis.total === 0 && (
          <div className="text-center text-xs text-gray-500 py-2">
            No objects detected in range
          </div>
        )}
      </div>

      {/* Height Legend */}
      <div className="bg-gray-900 border-t border-gray-700 px-3 py-2">
        <div className="text-[10px] text-gray-500 mb-1">Height Map</div>
        <div className="flex gap-0.5">
          {HEIGHT_ZONES.slice(0, 6).map((zone, i) => (
            <div 
              key={i} 
              className="flex-1 h-2 rounded-sm" 
              style={{ backgroundColor: zone.color }}
              title={zone.label}
            />
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
          <span>Ground</span>
          <span>Low</span>
          <span>Vehicle</span>
          <span>Tall</span>
        </div>
      </div>
    </div>
  );
}
