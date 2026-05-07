"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { AvLidarData, AvAnnotationsData, AvAnnotation, LidarPoint } from "@/types/av-sensor";
import { 
  Radar, Eye, EyeOff, Car, Layers, 
  AlertTriangle, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Grid3X3
} from "lucide-react";

type ViewAngle = "top" | "front" | "rear" | "left" | "right";
type LayoutMode = "single" | "quad";

interface LidarMultiViewProps {
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

type RiskLevel = "safe" | "caution" | "danger";
type SortMode = "nearest" | "risky";
type TrailSeconds = 3 | 5;

interface TrackPoint {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

interface AnnotatedRisk {
  ann: AvAnnotation;
  ttc: number;
  risk: RiskLevel;
}

const MAX_TRACKS = 256;
const MAX_POINTS_PER_TRACK = 12;
const TTC_DANGER_SEC = 2;
const TTC_CAUTION_SEC = 5;
const TTC_EPSILON = 0.1;

// View configurations
const VIEW_CONFIG: Record<ViewAngle, { 
  label: string; 
  icon: React.ReactNode;
  transform: (x: number, y: number, z: number, scale: number, cx: number, cy: number) => [number, number];
  boxTransform: (ann: AvAnnotation, scale: number) => { w: number; h: number; rotation: number };
  directions: { top: string; bottom: string; left: string; right: string };
}> = {
  top: {
    label: "Top (Bird's Eye)",
    icon: <div className="w-3 h-3 rounded-full border-2 border-current" />,
    transform: (x, y, _z, scale, cx, cy) => [cx - y * scale, cy - x * scale],
    boxTransform: (ann, scale) => ({ w: ann.length * scale, h: ann.width * scale, rotation: -ann.yaw }),
    directions: { top: "FRONT", bottom: "REAR", left: "RIGHT", right: "LEFT" },
  },
  front: {
    label: "Front View",
    icon: <ArrowUp className="w-3 h-3" />,
    transform: (x, y, z, scale, cx, cy) => [cx - y * scale, cy - z * scale * 1.5],
    boxTransform: (ann, scale) => ({ w: ann.width * scale, h: ann.height * scale * 1.5, rotation: 0 }),
    directions: { top: "UP", bottom: "DOWN", left: "RIGHT", right: "LEFT" },
  },
  rear: {
    label: "Rear View",
    icon: <ArrowDown className="w-3 h-3" />,
    transform: (x, y, z, scale, cx, cy) => [cx + y * scale, cy - z * scale * 1.5],
    boxTransform: (ann, scale) => ({ w: ann.width * scale, h: ann.height * scale * 1.5, rotation: 0 }),
    directions: { top: "UP", bottom: "DOWN", left: "LEFT", right: "RIGHT" },
  },
  left: {
    label: "Left Side View",
    icon: <ArrowLeft className="w-3 h-3" />,
    transform: (x, y, z, scale, cx, cy) => [cx + x * scale, cy - z * scale * 1.5],
    boxTransform: (ann, scale) => ({ w: ann.length * scale, h: ann.height * scale * 1.5, rotation: 0 }),
    directions: { top: "UP", bottom: "DOWN", left: "REAR", right: "FRONT" },
  },
  right: {
    label: "Right Side View",
    icon: <ArrowRight className="w-3 h-3" />,
    transform: (x, y, z, scale, cx, cy) => [cx - x * scale, cy - z * scale * 1.5],
    boxTransform: (ann, scale) => ({ w: ann.length * scale, h: ann.height * scale * 1.5, rotation: 0 }),
    directions: { top: "UP", bottom: "DOWN", left: "FRONT", right: "REAR" },
  },
};

// Height-based color zones
const HEIGHT_ZONES = [
  { max: -1.5, color: "#1e3a5f" },
  { max: -0.3, color: "#2d4a3e" },
  { max: 0.3,  color: "#3d5a4e" },
  { max: 1.0,  color: "#8b7355" },
  { max: 2.0,  color: "#c9a227" },
  { max: 4.0,  color: "#e85d04" },
  { max: Infinity, color: "#9d0208" },
];

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
  if (CATEGORY_CONFIG[category]) return CATEGORY_CONFIG[category];
  for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
    if (category.includes(key) || key.includes(category.split('.')[0])) {
      return config;
    }
  }
  return { icon: "❓", color: "#9ca3af", label: category };
}

function getRiskLevel(ttc: number): RiskLevel {
  if (Number.isFinite(ttc) && ttc < TTC_DANGER_SEC) return "danger";
  if (Number.isFinite(ttc) && ttc < TTC_CAUTION_SEC) return "caution";
  return "safe";
}

function getRiskClasses(risk: RiskLevel): string {
  if (risk === "danger") return "bg-red-500/20 text-red-300 border-red-500/40";
  if (risk === "caution") return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
}

function getFreshnessLabel(updatedAt?: string, nowMs: number = Date.now()): string {
  if (!updatedAt) return "No data";
  const parsed = Date.parse(updatedAt);
  if (Number.isNaN(parsed)) return "No data";
  const ageMs = Math.max(0, nowMs - parsed);
  if (ageMs < 1000) return `${ageMs}ms`;
  return `${(ageMs / 1000).toFixed(1)}s`;
}

// ─── Single View Canvas ──────────────────────────────────────────────────────

interface SingleViewProps {
  lidar: AvLidarData | null;
  annotations?: AvAnnotationsData | null;
  trackHistory?: Record<string, TrackPoint[]>;
  showTrails: boolean;
  riskByTrackId: Record<string, AnnotatedRisk>;
  viewAngle: ViewAngle;
  width: number;
  height: number;
  range: number;
  showPoints: boolean;
  showBoxes: boolean;
  showLabels: boolean;
  isCompact?: boolean;
  onSelect?: () => void;
}

function SingleView({ 
  lidar, annotations, trackHistory, showTrails, riskByTrackId, viewAngle, width, height, range,
  showPoints, showBoxes, showLabels, isCompact, onSelect 
}: SingleViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const config = VIEW_CONFIG[viewAngle];
  const scale = (Math.min(width, height) / 2 - 20) / range;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.fillStyle = "#0a0f1a";
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = viewAngle === "top" ? height / 2 : height * 0.7; // Lower center for side views

    // ─── Draw Grid ───────────────────────────────────────────────────────
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;

    if (viewAngle === "top") {
      // Distance rings
      const distances = [10, 20, 30, 40, 50].filter(d => d <= range);
      distances.forEach(d => {
        const r = d * scale;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });
    } else {
      // Horizontal ground line
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(width, cy);
      ctx.stroke();
      
      // Height lines
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      for (let h = 1; h <= 4; h++) {
        const y = cy - h * scale * 1.5;
        if (y > 10) {
          ctx.beginPath();
          ctx.setLineDash([3, 3]);
          ctx.moveTo(20, y);
          ctx.lineTo(width - 20, y);
          ctx.stroke();
          ctx.setLineDash([]);
          // Height label
          if (!isCompact) {
            ctx.fillStyle = "#475569";
            ctx.font = "9px system-ui";
            ctx.fillText(`${h}m`, 5, y + 3);
          }
        }
      }
    }

    // Cross lines
    ctx.strokeStyle = "#1e3a5f";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, 10);
    ctx.lineTo(cx, height - 10);
    if (viewAngle === "top") {
      ctx.moveTo(10, cy);
      ctx.lineTo(width - 10, cy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // ─── Direction Labels ────────────────────────────────────────────────
    if (!isCompact) {
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 10px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(config.directions.top, cx, 12);
      ctx.fillText(config.directions.bottom, cx, height - 4);
      ctx.textAlign = "left";
      ctx.fillText(config.directions.left, 4, cy);
      ctx.textAlign = "right";
      ctx.fillText(config.directions.right, width - 4, cy);
      ctx.textAlign = "left";
    }

    // ─── Draw Track Trails ───────────────────────────────────────────────
    if (showTrails && viewAngle === "top" && trackHistory) {
      Object.values(trackHistory).forEach((trail) => {
        if (trail.length < 2) return;
        ctx.beginPath();
        trail.forEach((p, idx) => {
          const [tx, ty] = config.transform(p.x, p.y, p.z, scale, cx, cy);
          if (idx === 0) {
            ctx.moveTo(tx, ty);
          } else {
            ctx.lineTo(tx, ty);
          }
        });
        const alpha = isCompact ? 0.25 : 0.38;
        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.lineWidth = isCompact ? 1 : 1.5;
        ctx.stroke();
      });
    }

    // ─── Draw Points ─────────────────────────────────────────────────────
    if (showPoints && lidar?.points.length) {
      // Filter points based on view
      const filteredPoints = lidar.points.filter((p: LidarPoint) => {
        const [x, y] = p;
        const dist = Math.sqrt(x * x + y * y);
        if (dist > range) return false;
        
        // For side/front views, filter by depth
        if (viewAngle === "front" && x < 0) return false;
        if (viewAngle === "rear" && x > 0) return false;
        if (viewAngle === "left" && y < 0) return false;
        if (viewAngle === "right" && y > 0) return false;
        
        return true;
      });

      filteredPoints.forEach((point: LidarPoint) => {
        const [x, y, z, intensity] = point;
        const [sx, sy] = config.transform(x, y, z, scale, cx, cy);

        if (sx < 5 || sx > width - 5 || sy < 5 || sy > height - 5) return;

        const dist = Math.sqrt(x * x + y * y);
        const distFactor = 1 - (dist / range) * 0.5;
        const size = isCompact ? 0.8 : 1 + distFactor * 0.5;
        const alpha = 0.3 + intensity * 0.4 + distFactor * 0.2;

        ctx.fillStyle = getHeightColor(z);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    // ─── Draw Bounding Boxes ─────────────────────────────────────────────
    if (showBoxes && annotations?.annotations) {
      annotations.annotations.forEach((ann) => {
        const { x, y, z, color, category, distance } = ann;
        
        if (distance > range) return;
        
        // Filter by view angle
        if (viewAngle === "front" && x < 0) return;
        if (viewAngle === "rear" && x > 0) return;
        if (viewAngle === "left" && y < 0) return;
        if (viewAngle === "right" && y > 0) return;

        const [sx, sy] = config.transform(x, y, z, scale, cx, cy);
        const box = config.boxTransform(ann, scale);

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(box.rotation);

        // Box fill
        ctx.fillStyle = color + "33";
        ctx.fillRect(-box.w / 2, -box.h / 2, box.w, box.h);

        // Box outline
        ctx.strokeStyle = color;
        ctx.lineWidth = isCompact ? 1 : 2;
        ctx.strokeRect(-box.w / 2, -box.h / 2, box.w, box.h);

        // Direction arrow for top view
        if (viewAngle === "top") {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(box.w / 2 + 2, 0);
          ctx.lineTo(box.w / 2 - 3, -3);
          ctx.lineTo(box.w / 2 - 3, 3);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();

        // Label
        if (showLabels && !isCompact) {
          const catConfig = getCategoryConfig(category);
          const riskInfo = riskByTrackId[ann.trackId ?? ann.id];

          ctx.fillStyle = "#0a0f1a99";
          const labelText = `${catConfig.icon} ${distance.toFixed(1)}m`;
          const textWidth = ctx.measureText(labelText).width;
          const needsRiskBadge = riskInfo && (riskInfo.risk === "danger" || riskInfo.risk === "caution");
          const badgeText = needsRiskBadge
            ? `${riskInfo.risk.toUpperCase()} ${Number.isFinite(riskInfo.ttc) ? `${riskInfo.ttc.toFixed(1)}s` : ""}`.trim()
            : "";
          const badgeWidth = needsRiskBadge ? ctx.measureText(badgeText).width + 6 : 0;
          const totalWidth = textWidth + badgeWidth;
          const baseX = sx - totalWidth / 2;
          const labelY = sy - box.h / 2 - 15;
          ctx.fillRect(baseX - 2, labelY, totalWidth + 4, 12);
          
          ctx.fillStyle = color;
          ctx.font = "9px system-ui";
          ctx.textAlign = "left";
          ctx.fillText(labelText, baseX, sy - box.h / 2 - 5);

          if (needsRiskBadge) {
            const badgeX = baseX + textWidth + 4;
            ctx.fillStyle = riskInfo.risk === "danger" ? "#ef4444" : "#f59e0b";
            ctx.fillRect(badgeX - 1, labelY + 1, badgeWidth, 10);
            ctx.fillStyle = "#0a0f1a";
            ctx.fillText(badgeText, badgeX + 2, sy - box.h / 2 - 5);
          }

          ctx.textAlign = "left";
        }
      });
    }

    // ─── Draw Ego Vehicle ────────────────────────────────────────────────
    ctx.fillStyle = "#10b981";
    if (viewAngle === "top") {
      // Triangle pointing forward
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx - 5, cy + 5);
      ctx.lineTo(cx + 5, cy + 5);
      ctx.closePath();
      ctx.fill();
      // Vehicle box
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 6, cy - 4, 12, 12);
    } else {
      // Side/front view - rectangle
      const vw = viewAngle === "front" || viewAngle === "rear" ? 16 : 24;
      const vh = 12;
      ctx.fillRect(cx - vw / 2, cy - vh, vw, vh);
      ctx.fillStyle = "#0a0f1a";
      ctx.fillRect(cx - vw / 2 + 2, cy - vh + 2, vw - 4, vh / 2);
    }

    // View label
    if (isCompact) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 9px system-ui";
      ctx.fillText(config.label.split(" ")[0], 4, height - 4);
    }

  }, [lidar, annotations, trackHistory, showTrails, riskByTrackId, viewAngle, width, height, range, scale, showPoints, showBoxes, showLabels, isCompact, config]);

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      className={`block ${onSelect ? "cursor-pointer hover:ring-2 ring-purple-500/50" : ""}`}
      onClick={onSelect}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function LidarMultiView({ lidar, annotations, width = 400, height = 500 }: LidarMultiViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFrameRef = useRef<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(width);
  const [viewAngle, setViewAngle] = useState<ViewAngle>("top");
  const [layout, setLayout] = useState<LayoutMode>("single");
  const [showPoints, setShowPoints] = useState(true);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showTrails, setShowTrails] = useState(true);
  const [trailSeconds, setTrailSeconds] = useState<TrailSeconds>(5);
  const [range, setRange] = useState(50);
  const [sortMode, setSortMode] = useState<SortMode>("nearest");
  const [trackHistory, setTrackHistory] = useState<Record<string, TrackPoint[]>>({});
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const nextWidth = Math.floor(el.clientWidth);
      if (nextWidth > 0) setContainerWidth(nextWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!annotations?.annotations) return;
    const nowTs = annotations.timestamp ?? Date.now();
    const currentFrame = annotations.frame;
    const cutoff = nowTs - trailSeconds * 1000;
    const isSceneRestarted = previousFrameRef.current !== null && currentFrame < previousFrameRef.current;

    setTrackHistory((prev) => {
      const base = isSceneRestarted ? {} : { ...prev };
      for (const ann of annotations.annotations) {
        const key = ann.trackId ?? ann.id;
        const nextPoints = [...(base[key] ?? []), { x: ann.x, y: ann.y, z: ann.z, timestamp: nowTs }]
          .filter((point) => point.timestamp >= cutoff)
          .slice(-MAX_POINTS_PER_TRACK);
        base[key] = nextPoints;
      }

      const prunedEntries = Object.entries(base)
        .filter(([, points]) => points.length > 0 && points[points.length - 1].timestamp >= cutoff)
        .sort((a, b) => b[1][b[1].length - 1].timestamp - a[1][a[1].length - 1].timestamp)
        .slice(0, MAX_TRACKS);

      return Object.fromEntries(prunedEntries);
    });

    previousFrameRef.current = currentFrame;
  }, [annotations, trailSeconds]);

  const objectsWithRisk = useMemo<AnnotatedRisk[]>(() => {
    if (!annotations?.annotations) return [];
    return annotations.annotations.map((ann) => {
      const closingSpeed = -ann.relativeSpeedMps;
      const ttc = closingSpeed > TTC_EPSILON ? ann.distance / closingSpeed : Infinity;
      return { ann, ttc, risk: getRiskLevel(ttc) };
    });
  }, [annotations]);

  const riskByTrackId = useMemo<Record<string, AnnotatedRisk>>(() => {
    const map: Record<string, AnnotatedRisk> = {};
    objectsWithRisk.forEach((obj) => {
      map[obj.ann.trackId ?? obj.ann.id] = obj;
    });
    return map;
  }, [objectsWithRisk]);

  // Scene analysis
  const sceneAnalysis = useMemo<SceneAnalysis>(() => {
    if (!objectsWithRisk.length) return { groups: {}, closest: null, total: 0 };
    
    const groups: Record<string, AvAnnotation[]> = {};
    let closest: AvAnnotation | null = null;
    
    objectsWithRisk.forEach(({ ann }) => {
      const simpleCat = ann.category.split('.')[0];
      if (!groups[simpleCat]) groups[simpleCat] = [];
      groups[simpleCat].push(ann);
      if (!closest || ann.distance < closest.distance) closest = ann;
    });
    
    return { groups, closest, total: objectsWithRisk.length };
  }, [objectsWithRisk]);

  const topRiskObject = useMemo<AnnotatedRisk | null>(() => {
    if (!objectsWithRisk.length) return null;
    const rank: Record<RiskLevel, number> = { danger: 0, caution: 1, safe: 2 };
    return [...objectsWithRisk].sort((a, b) => {
      const riskDiff = rank[a.risk] - rank[b.risk];
      if (riskDiff !== 0) return riskDiff;
      if (a.ttc !== b.ttc) return a.ttc - b.ttc;
      return a.ann.distance - b.ann.distance;
    })[0];
  }, [objectsWithRisk]);

  const sortedObjects = useMemo<AnnotatedRisk[]>(() => {
    const rank: Record<RiskLevel, number> = { danger: 0, caution: 1, safe: 2 };
    const items = [...objectsWithRisk];
    if (sortMode === "nearest") {
      items.sort((a, b) => a.ann.distance - b.ann.distance);
    } else {
      items.sort((a, b) => {
        const riskDiff = rank[a.risk] - rank[b.risk];
        if (riskDiff !== 0) return riskDiff;
        if (a.ttc !== b.ttc) return a.ttc - b.ttc;
        return a.ann.distance - b.ann.distance;
      });
    }
    return items;
  }, [objectsWithRisk, sortMode]);

  const cycleRange = () => {
    const ranges = [30, 50, 75, 100];
    setRange(ranges[(ranges.indexOf(range) + 1) % ranges.length]);
  };

  const baseWidth = Math.max(1, width);
  const effectiveWidth = Math.max(280, containerWidth);
  const effectiveHeight = Math.round((height / baseWidth) * effectiveWidth);
  const canvasWidth = layout === "quad" ? (effectiveWidth - 4) / 2 : effectiveWidth;
  const canvasHeight = layout === "quad" ? (effectiveHeight - 120) / 2 : effectiveHeight - 80;
  const frameDelta = lidar && annotations ? Math.abs(lidar.frame - annotations.frame) : null;
  const hasFrameMismatch = frameDelta !== null && frameDelta > 1;
  const lidarFreshness = getFreshnessLabel(lidar?.updatedAt, nowMs);
  const annotationFreshness = getFreshnessLabel(annotations?.updatedAt, nowMs);

  return (
    <div ref={containerRef} className="w-full flex flex-col bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 border-b border-gray-700">
        <div className="flex items-center gap-1">
          <Radar className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white">LiDAR 3D Scene</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Layout toggle */}
          <button
            onClick={() => setLayout(layout === "single" ? "quad" : "single")}
            className={`p-1.5 rounded transition-colors ${
              layout === "quad" ? "bg-purple-500/80 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
            }`}
            title="Toggle quad view"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowPoints(!showPoints)}
            className={`p-1.5 rounded transition-colors ${
              showPoints ? "bg-cyan-500/80 text-white" : "bg-gray-700 text-gray-400"
            }`}
            title="Toggle points"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowBoxes(!showBoxes)}
            className={`p-1.5 rounded transition-colors ${
              showBoxes ? "bg-amber-500/80 text-white" : "bg-gray-700 text-gray-400"
            }`}
            title="Toggle boxes"
          >
            <Car className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`p-1.5 rounded transition-colors ${
              showLabels ? "bg-green-500/80 text-white" : "bg-gray-700 text-gray-400"
            }`}
            title="Toggle labels"
          >
            {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setShowTrails(!showTrails)}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              showTrails ? "bg-blue-500/80 text-white" : "bg-gray-700 text-gray-400"
            }`}
            title="Toggle history trails"
          >
            Trail
          </button>
          <button
            onClick={() => setTrailSeconds(trailSeconds === 5 ? 3 : 5)}
            className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs text-white transition-colors"
            title="Trail duration"
          >
            {trailSeconds}s
          </button>
          <button
            onClick={cycleRange}
            className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs text-white transition-colors"
          >
            {range}m
          </button>
        </div>
      </div>
      <div className="flex items-center justify-end px-3 py-1 bg-gray-900/70 border-b border-gray-700">
        <div className={`text-[10px] px-2 py-0.5 rounded border ${hasFrameMismatch ? "bg-amber-500/15 border-amber-500/35 text-amber-300" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"}`}>
          L:{lidarFreshness} A:{annotationFreshness}
          {frameDelta !== null && (
            <span className="ml-1 text-[9px] text-gray-300">Δf={frameDelta}</span>
          )}
        </div>
      </div>

      {/* View Angle Selector */}
      <div className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-800/30 border-b border-gray-700">
        {(Object.keys(VIEW_CONFIG) as ViewAngle[]).map((angle) => (
          <button
            key={angle}
            onClick={() => { setViewAngle(angle); setLayout("single"); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
              viewAngle === angle && layout === "single"
                ? "bg-purple-500 text-white"
                : "bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            {VIEW_CONFIG[angle].icon}
            <span className="hidden sm:inline">{angle.charAt(0).toUpperCase() + angle.slice(1)}</span>
          </button>
        ))}
      </div>

      {/* Canvas Area */}
      <div className="relative bg-gray-950">
        {layout === "single" ? (
          <SingleView
            lidar={lidar}
            annotations={annotations}
            trackHistory={trackHistory}
            showTrails={showTrails}
            riskByTrackId={riskByTrackId}
            viewAngle={viewAngle}
            width={effectiveWidth}
            height={canvasHeight}
            range={range}
            showPoints={showPoints}
            showBoxes={showBoxes}
            showLabels={showLabels}
          />
        ) : (
          <div className="grid grid-cols-2 gap-0.5 bg-gray-700">
            {(["top", "front", "left", "right"] as ViewAngle[]).map((angle) => (
              <SingleView
                key={angle}
                lidar={lidar}
                annotations={annotations}
                trackHistory={trackHistory}
                showTrails={showTrails}
                riskByTrackId={riskByTrackId}
                viewAngle={angle}
                width={canvasWidth}
                height={canvasHeight}
                range={range}
                showPoints={showPoints}
                showBoxes={showBoxes}
                showLabels={false}
                isCompact
                onSelect={() => { setViewAngle(angle); setLayout("single"); }}
              />
            ))}
          </div>
        )}

        {/* Point count */}
        {lidar && (
          <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-gray-300">
            {lidar.pointCount.toLocaleString()} pts
          </div>
        )}
      </div>

      {/* Scene Analysis */}
      <div className="bg-gray-800/50 border-t border-gray-700 p-2">
        {/* Risk warning */}
        {topRiskObject && topRiskObject.risk !== "safe" && (
          <div className={`flex items-center gap-2 border rounded px-2 py-1 mb-2 ${getRiskClasses(topRiskObject.risk)}`}>
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs">
              <b>{getCategoryConfig(topRiskObject.ann.category).label}</b>
              {" "}
              {topRiskObject.risk.toUpperCase()}
              {" · "}
              {Number.isFinite(topRiskObject.ttc) ? `${topRiskObject.ttc.toFixed(1)}s TTC` : "No closing risk"}
              {" · "}
              {topRiskObject.ann.distance.toFixed(1)}m
            </span>
          </div>
        )}

        {/* Object groups */}
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(sceneAnalysis.groups).map(([cat, items]) => {
            const config = getCategoryConfig(cat);
            const closest = items.reduce((a, b) => a.distance < b.distance ? a : b);
            return (
              <div 
                key={cat}
                className="flex items-center gap-1.5 bg-gray-900/50 rounded px-2 py-1"
              >
                <span className="text-sm">{config.icon}</span>
                <span className="text-xs text-white font-medium">{items.length}</span>
                <span className="text-[10px] text-gray-400">({closest.distance.toFixed(0)}m)</span>
              </div>
            );
          })}
          {sceneAnalysis.total === 0 && (
            <span className="text-xs text-gray-500">No objects detected</span>
          )}
        </div>

        {/* Semantic object panel */}
        <div className="mt-3 border border-gray-700 rounded bg-gray-900/40 overflow-hidden">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-700">
            <span className="text-[11px] font-medium text-gray-300">Object Panel</span>
            <button
              onClick={() => setSortMode(sortMode === "nearest" ? "risky" : "nearest")}
              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
              title="Toggle sorting"
            >
              Sort: {sortMode === "nearest" ? "Nearest" : "Most risky"}
            </button>
          </div>
          <div className="max-h-44 overflow-auto">
            <table className="w-full text-[10px]">
              <thead className="bg-gray-950 text-gray-400">
                <tr>
                  <th className="text-left px-2 py-1">Category</th>
                  <th className="text-right px-2 py-1">Dist</th>
                  <th className="text-right px-2 py-1">Yaw</th>
                  <th className="text-right px-2 py-1">Pts</th>
                  <th className="text-left px-2 py-1">Attributes</th>
                  <th className="text-right px-2 py-1">TTC</th>
                  <th className="text-right px-2 py-1">Risk</th>
                </tr>
              </thead>
              <tbody>
                {sortedObjects.slice(0, 40).map(({ ann, ttc, risk }) => (
                  <tr key={ann.trackId ?? ann.id} className="border-t border-gray-800 text-gray-200">
                    <td className="px-2 py-1">{getCategoryConfig(ann.category).label}</td>
                    <td className="px-2 py-1 text-right">{ann.distance.toFixed(1)}m</td>
                    <td className="px-2 py-1 text-right">{ann.yaw.toFixed(0)}°</td>
                    <td className="px-2 py-1 text-right">{ann.numLidarPts}</td>
                    <td className="px-2 py-1 truncate max-w-[120px]">{ann.attributes.join(", ") || "-"}</td>
                    <td className="px-2 py-1 text-right">{Number.isFinite(ttc) ? `${ttc.toFixed(1)}s` : "∞"}</td>
                    <td className="px-2 py-1 text-right">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded border ${getRiskClasses(risk)}`}>
                        {risk.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
                {sortedObjects.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-2 py-2 text-center text-gray-500">
                      No objects available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Height Legend */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border-t border-gray-700">
        <span className="text-[10px] text-gray-500">Height:</span>
        <div className="flex gap-0.5 flex-1">
          {HEIGHT_ZONES.slice(0, 6).map((zone, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-sm" style={{ backgroundColor: zone.color }} />
          ))}
        </div>
        <span className="text-[9px] text-gray-500">Ground → Tall</span>
      </div>
    </div>
  );
}
