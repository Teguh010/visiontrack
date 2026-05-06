"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AvGpsData } from "@/types/av-sensor";
import { Map, ZoomIn, ZoomOut, Crosshair } from "lucide-react";

interface NuScenesMapViewProps {
  gps: AvGpsData | null;
  width?: number;
  height?: number;
}

// ─── Map Configuration per Location ─────────────────────────────────────────
// nuScenes semantic_prior maps: 10 pixels per meter
// Maps are very large (15000+ x 20000+ pixels)

interface MapConfig {
  filename: string;
  pixelsPerMeter: number;
  // Origin in PIXELS where ego_pose (0,0) maps to
  originPixelX: number;
  originPixelY: number;
}

// These values calibrated from actual ego_pose data:
// X range: 309-1935m, Y range: 658-2667m
// singapore-onenorth map: 15856 x 20250 pixels at 10px/m = 1585.6 x 2025m
// The map origin (pixel 0,0) corresponds to world coordinate (worldOriginX, worldOriginY)
// pixel_x = (ego_x - worldOriginX) * pixelsPerMeter
// pixel_y = (worldOriginY - ego_y) * pixelsPerMeter (Y inverted)
const MAP_CONFIGS: Record<string, MapConfig> = {
  "singapore-onenorth": {
    filename: "53992ee3023e5494b90c316c183be829.png",
    pixelsPerMeter: 10,
    // World coordinates at pixel (0,0): top-left corner of map
    // Calibrated: ego x~410, y~1180 should appear on road
    originPixelX: 300,    // worldOriginX: x=300m is at pixel x=0
    originPixelY: 2700,   // worldOriginY: y=2700m is at pixel y=0 (top)
  },
  "boston-seaport": {
    filename: "36092f0b03a857c6a3403e25b4b7aab3.png",
    pixelsPerMeter: 10,
    originPixelX: 0,
    originPixelY: 2200,
  },
  "singapore-queenstown": {
    filename: "93406b464a165eaba6d9de76ca09f5da.png",
    pixelsPerMeter: 10,
    originPixelX: 300,
    originPixelY: 3700,
  },
  "singapore-hollandvillage": {
    filename: "37819e65e09e5547b8a3ceaefba56bb2.png",
    pixelsPerMeter: 10,
    originPixelX: 300,
    originPixelY: 2900,
  },
};

const DEFAULT_CONFIG: MapConfig = {
  filename: "36092f0b03a857c6a3403e25b4b7aab3.png",
  pixelsPerMeter: 10,
  originPixelX: 0,      // worldOriginX
  originPixelY: 2200,   // worldOriginY
};

interface TrailPoint {
  x: number;
  y: number;
}

const MAX_TRAIL = 150;

// Normalize location string for matching
function normalizeLocation(s: string): string {
  return s.toLowerCase().replace(/[-_\s]/g, "");
}

// Get map config for location (memoizable)
function getMapConfig(location: string): MapConfig {
  const normalizedLocation = normalizeLocation(location);
  
  const key = Object.keys(MAP_CONFIGS).find((k) => {
    const normalizedKey = normalizeLocation(k);
    return normalizedLocation.includes(normalizedKey) || normalizedKey.includes(normalizedLocation);
  });
  
  return key ? MAP_CONFIGS[key] : DEFAULT_CONFIG;
}

export function NuScenesMapView({ gps, width = 288, height = 200 }: NuScenesMapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const loadedLocationRef = useRef<string>("");
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.4); // Lower zoom = see more area
  const [trail, setTrail] = useState<TrailPoint[]>([]);

  // Get config based on location
  const location = gps?.location ?? "";
  const config = location ? getMapConfig(location) : DEFAULT_CONFIG;

  // Load map image when location changes
  useEffect(() => {
    if (!location) return;
    
    // Skip if already loaded this location
    if (loadedLocationRef.current === location && mapImageRef.current) {
      return;
    }

    console.log(`[NuScenesMap] Loading map for: ${location}`);
    loadedLocationRef.current = location;
    setMapLoaded(false);
    setMapError(null);
    setTrail([]);

    const img = new Image();
    const mapUrl = `/maps/${config.filename}`;
    console.log(`[NuScenesMap] URL: ${mapUrl}`);
    
    img.onload = () => {
      console.log(`[NuScenesMap] Loaded: ${img.width}x${img.height}`);
      mapImageRef.current = img;
      setMapLoaded(true);
    };
    
    img.onerror = () => {
      console.error(`[NuScenesMap] Failed to load: ${config.filename}`);
      setMapError(`Failed: ${config.filename}`);
    };
    
    img.src = mapUrl;
  }, [location, config.filename]);

  // Update trail when position changes
  const gpsX = gps?.x ?? 0;
  const gpsY = gps?.y ?? 0;
  
  useEffect(() => {
    if (gpsX === 0 && gpsY === 0) return;

    setTrail((prev) => {
      // Avoid duplicate points
      const last = prev[prev.length - 1];
      if (last && Math.abs(last.x - gpsX) < 0.1 && Math.abs(last.y - gpsY) < 0.1) {
        return prev;
      }
      
      const newTrail = [...prev, { x: gpsX, y: gpsY }];
      if (newTrail.length > MAX_TRAIL) newTrail.shift();
      return newTrail;
    });
  }, [gpsX, gpsY]);

  // Convert ego coordinates to map pixel coordinates
  // originPixelX/Y = world coordinates at pixel (0,0)
  const egoToPixel = useCallback((x: number, y: number): [number, number] => {
    // pixel_x = (ego_x - worldOriginX) * scale
    // pixel_y = (worldOriginY - ego_y) * scale (Y inverted: world Y up, pixel Y down)
    const pixelX = (x - config.originPixelX) * config.pixelsPerMeter;
    const pixelY = (config.originPixelY - y) * config.pixelsPerMeter;
    return [pixelX, pixelY];
  }, [config.originPixelX, config.originPixelY, config.pixelsPerMeter]);

  // Draw map
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Clear with dark background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    const img = mapImageRef.current;
    if (!mapLoaded || !img || !gps) {
      ctx.fillStyle = "#64748b";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        !gps ? "Waiting for GPS..." : "Loading map...",
        width / 2,
        height / 2
      );
      return;
    }

    // Verify image is actually loaded and has content
    if (!img.complete || img.naturalWidth === 0) {
      console.error("[NuScenesMap] Image not properly loaded");
      ctx.fillStyle = "#ef4444";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Image load error", width / 2, height / 2);
      return;
    }

    // Get vehicle position in map pixels
    const [egoPixelX, egoPixelY] = egoToPixel(gps.x, gps.y);
    
    // Debug: log coordinates once per second
    if (Math.random() < 0.1) {
      console.log(`[NuScenesMap] ego:(${gps.x.toFixed(0)},${gps.y.toFixed(0)})m -> pixel:(${egoPixelX.toFixed(0)},${egoPixelY.toFixed(0)}) in map ${img.naturalWidth}x${img.naturalHeight}`);
    }
    
    // Viewport size in map pixels (how much of the source to grab)
    const viewW = width / zoom;
    const viewH = height / zoom;

    // Source rectangle centered on vehicle
    let srcX = egoPixelX - viewW / 2;
    let srcY = egoPixelY - viewH / 2;
    
    // Clamp to image bounds
    srcX = Math.max(0, Math.min(srcX, img.naturalWidth - viewW));
    srcY = Math.max(0, Math.min(srcY, img.naturalHeight - viewH));
    
    // Ensure we have valid dimensions
    const drawW = Math.max(1, Math.min(viewW, img.naturalWidth));
    const drawH = Math.max(1, Math.min(viewH, img.naturalHeight));

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    try {
      // Draw grayscale map as background
      ctx.drawImage(
        img,
        srcX,
        srcY,
        drawW,
        drawH,
        0,
        0,
        width,
        height
      );
      // No color manipulation - keep original grayscale
    } catch (e) {
      console.error("[NuScenesMap] drawImage error:", e);
    }

    // Calculate where vehicle appears on canvas
    const vehicleCanvasX = (egoPixelX - srcX) * zoom;
    const vehicleCanvasY = (egoPixelY - srcY) * zoom;

    // Draw trail line (blue, thicker for visibility on grayscale)
    if (trail.length > 1) {
      // Outline for contrast
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      trail.forEach((point, i) => {
        const [px, py] = egoToPixel(point.x, point.y);
        const canvasX = (px - srcX) * zoom;
        const canvasY = (py - srcY) * zoom;
        if (i === 0) ctx.moveTo(canvasX, canvasY);
        else ctx.lineTo(canvasX, canvasY);
      });
      ctx.stroke();

      // Main trail line
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      trail.forEach((point, i) => {
        const [px, py] = egoToPixel(point.x, point.y);
        const canvasX = (px - srcX) * zoom;
        const canvasY = (py - srcY) * zoom;
        if (i === 0) ctx.moveTo(canvasX, canvasY);
        else ctx.lineTo(canvasX, canvasY);
      });
      ctx.stroke();

      // Trail dots with outline
      trail.forEach((point, i) => {
        const [px, py] = egoToPixel(point.x, point.y);
        const canvasX = (px - srcX) * zoom;
        const canvasY = (py - srcY) * zoom;
        
        if (canvasX >= -5 && canvasX <= width + 5 && canvasY >= -5 && canvasY <= height + 5) {
          const alpha = 0.4 + (i / trail.length) * 0.6;
          // Dot outline
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.beginPath();
          ctx.arc(canvasX, canvasY, 4, 0, Math.PI * 2);
          ctx.fill();
          // Dot fill
          ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
          ctx.beginPath();
          ctx.arc(canvasX, canvasY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Draw vehicle glow
    const gradient = ctx.createRadialGradient(
      vehicleCanvasX, vehicleCanvasY, 0,
      vehicleCanvasX, vehicleCanvasY, 20
    );
    gradient.addColorStop(0, "rgba(16, 185, 129, 0.6)");
    gradient.addColorStop(1, "rgba(16, 185, 129, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(vehicleCanvasX, vehicleCanvasY, 20, 0, Math.PI * 2);
    ctx.fill();

    // Draw vehicle triangle
    ctx.save();
    ctx.translate(vehicleCanvasX, vehicleCanvasY);
    // Heading: 0 = North, 90 = East. Canvas: 0 = right
    ctx.rotate(((gps.heading - 90) * Math.PI) / 180);

    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-6, -6);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-2, -3);
    ctx.lineTo(-2, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }, [gps, mapLoaded, width, height, zoom, trail, egoToPixel]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      {/* Header */}
      <div className="absolute top-2 left-2 z-10 bg-black/70 px-2 py-1 rounded text-xs font-medium text-white flex items-center gap-1.5">
        <Map className="w-3 h-3" />
        nuScenes Map
      </div>

      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}
          className="bg-black/70 hover:bg-black/90 p-1.5 rounded text-white transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-3 h-3" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.1, 0.1))}
          className="bg-black/70 hover:bg-black/90 p-1.5 rounded text-white transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-3 h-3" />
        </button>
        <button
          onClick={() => setZoom(0.4)}
          className="bg-black/70 hover:bg-black/90 p-1.5 rounded text-white transition-colors"
          title="Reset zoom"
        >
          <Crosshair className="w-3 h-3" />
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block"
      />

      {/* Info */}
      {gps && mapLoaded && (
        <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[10px] text-gray-300">
          <span className="bg-black/70 px-1.5 py-0.5 rounded">
            ({gps.x?.toFixed(0)}, {gps.y?.toFixed(0)})m
          </span>
          <span className="bg-black/70 px-1.5 py-0.5 rounded">
            {zoom.toFixed(1)}x
          </span>
        </div>
      )}

      {/* Loading */}
      {!mapLoaded && !mapError && gps?.location && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
          <div className="text-center text-gray-400">
            <Map className="w-6 h-6 mx-auto mb-1 animate-pulse" />
            <p className="text-xs">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
          <div className="text-center text-red-400">
            <Map className="w-6 h-6 mx-auto mb-1" />
            <p className="text-xs">{mapError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
