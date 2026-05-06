"use client";

import { useEffect, useRef, useState } from "react";
import { AvGpsData } from "@/types/av-sensor";
import { Map, ZoomIn, ZoomOut, Crosshair } from "lucide-react";

interface NuScenesMapViewProps {
  gps: AvGpsData | null;
  width?: number;
  height?: number;
}

// ─── Map Configuration per Location ─────────────────────────────────────────
// nuScenes map parameters: resolution = 10 pixels per meter
// Origin offset = where (0,0) in ego_pose maps to in the image

interface MapConfig {
  filename: string;
  pixelsPerMeter: number;
  // Offset: (x, y) in meters that corresponds to pixel (0, 0) in the map
  originX: number;
  originY: number;
}

const MAP_CONFIGS: Record<string, MapConfig> = {
  "singapore-onenorth": {
    filename: "53992ee3023e5494b90c316c183be829.png",
    pixelsPerMeter: 10,
    originX: -500,
    originY: 2000,
  },
  "boston-seaport": {
    filename: "36092f0b03a857c6a3403e25b4b7aab3.png",
    pixelsPerMeter: 10,
    originX: -50,
    originY: 3000,
  },
  "singapore-queenstown": {
    filename: "93406b464a165eaba6d9de76ca09f5da.png",
    pixelsPerMeter: 10,
    originX: -350,
    originY: 1650,
  },
  "singapore-hollandvillage": {
    filename: "37819e65e09e5547b8a3ceaefba56bb2.png",
    pixelsPerMeter: 10,
    originX: -600,
    originY: 1750,
  },
};

// Default config
const DEFAULT_CONFIG: MapConfig = {
  filename: "36092f0b03a857c6a3403e25b4b7aab3.png",
  pixelsPerMeter: 10,
  originX: 0,
  originY: 2000,
};

interface TrailPoint {
  x: number;
  y: number;
}

const MAX_TRAIL = 200;

export function NuScenesMapView({ gps, width = 288, height = 200 }: NuScenesMapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>("");
  const [zoom, setZoom] = useState(1.5); // Zoom level (higher = more zoomed in)
  const [trail, setTrail] = useState<TrailPoint[]>([]);

  // Get map config for location
  const getMapConfig = (location: string): MapConfig => {
    const key = Object.keys(MAP_CONFIGS).find((k) =>
      location.toLowerCase().includes(k.toLowerCase().replace("-", ""))
    );
    return key ? MAP_CONFIGS[key] : DEFAULT_CONFIG;
  };

  // Load map image when location changes
  useEffect(() => {
    if (!gps?.location || gps.location === currentLocation) return;

    const config = getMapConfig(gps.location);
    setCurrentLocation(gps.location);
    setMapLoaded(false);
    setTrail([]); // Reset trail on location change

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `/maps/${config.filename}`;
    img.onload = () => {
      mapImageRef.current = img;
      setMapLoaded(true);
    };
    img.onerror = () => {
      console.error(`Failed to load map: ${config.filename}`);
      setMapLoaded(false);
    };
  }, [gps?.location, currentLocation]);

  // Update trail
  useEffect(() => {
    if (!gps || gps.x === 0 && gps.y === 0) return;

    setTrail((prev) => {
      const newTrail = [...prev, { x: gps.x, y: gps.y }];
      if (newTrail.length > MAX_TRAIL) newTrail.shift();
      return newTrail;
    });
  }, [gps?.x, gps?.y]);

  // Draw map
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    if (!mapLoaded || !mapImageRef.current || !gps) {
      // Draw loading state
      ctx.fillStyle = "#64748b";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        mapLoaded ? "Waiting for GPS..." : "Loading map...",
        width / 2,
        height / 2
      );
      return;
    }

    const config = getMapConfig(gps.location);
    const img = mapImageRef.current;

    // Convert ego_pose (x, y) to map pixel coordinates
    // Map pixel = (x - originX) * pixelsPerMeter, (originY - y) * pixelsPerMeter
    const egoPixelX = (gps.x - config.originX) * config.pixelsPerMeter;
    const egoPixelY = (config.originY - gps.y) * config.pixelsPerMeter;

    // Calculate viewport: center on vehicle
    const viewportWidth = width / zoom;
    const viewportHeight = height / zoom;

    // Source rectangle (from the large map image)
    const srcX = egoPixelX - viewportWidth / 2;
    const srcY = egoPixelY - viewportHeight / 2;

    // Draw the map portion centered on vehicle
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Draw map
    ctx.drawImage(
      img,
      srcX,
      srcY,
      viewportWidth,
      viewportHeight,
      0,
      0,
      width,
      height
    );

    // Draw trail
    if (trail.length > 1) {
      ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();

      trail.forEach((point, i) => {
        const px = ((point.x - config.originX) * config.pixelsPerMeter - srcX) * zoom;
        const py = ((config.originY - point.y) * config.pixelsPerMeter - srcY) * zoom;

        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      });
      ctx.stroke();

      // Trail dots with fade
      trail.forEach((point, i) => {
        const px = ((point.x - config.originX) * config.pixelsPerMeter - srcX) * zoom;
        const py = ((config.originY - point.y) * config.pixelsPerMeter - srcY) * zoom;
        const alpha = 0.2 + (i / trail.length) * 0.6;

        ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw vehicle at center
    const centerX = width / 2;
    const centerY = height / 2;

    // Glow
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 25);
    gradient.addColorStop(0, "rgba(16, 185, 129, 0.5)");
    gradient.addColorStop(1, "rgba(16, 185, 129, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
    ctx.fill();

    // Vehicle triangle
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(((gps.heading - 90) * Math.PI) / 180);

    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();

    // White tip
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-2, -4);
    ctx.lineTo(-2, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }, [gps, mapLoaded, width, height, zoom, trail]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      {/* Header */}
      <div className="absolute top-2 left-2 z-10 bg-black/60 px-2 py-1 rounded text-xs font-medium text-white flex items-center gap-1.5">
        <Map className="w-3 h-3" />
        nuScenes Map
      </div>

      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.5, 4))}
          className="bg-black/60 hover:bg-black/80 p-1 rounded text-white transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.5, 0.5))}
          className="bg-black/60 hover:bg-black/80 p-1 rounded text-white transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom(1.5)}
          className="bg-black/60 hover:bg-black/80 p-1 rounded text-white transition-colors"
          title="Reset zoom"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block"
      />

      {/* Info overlay */}
      {gps && (
        <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[10px] text-gray-300">
          <span className="bg-black/60 px-1.5 py-0.5 rounded">
            x: {gps.x?.toFixed(1)}m, y: {gps.y?.toFixed(1)}m
          </span>
          <span className="bg-black/60 px-1.5 py-0.5 rounded">
            {zoom.toFixed(1)}x
          </span>
        </div>
      )}

      {/* Loading state */}
      {!mapLoaded && gps?.location && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <div className="text-center text-gray-400">
            <Map className="w-6 h-6 mx-auto mb-1 animate-pulse" />
            <p className="text-xs">Loading {gps.location}...</p>
          </div>
        </div>
      )}
    </div>
  );
}
