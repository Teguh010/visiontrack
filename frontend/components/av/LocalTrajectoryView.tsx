"use client";

import { useEffect, useRef, useState } from "react";
import { AvGpsData } from "@/types/av-sensor";
import { Navigation, MapPin, Compass } from "lucide-react";

interface LocalTrajectoryViewProps {
  gps: AvGpsData | null;
  width?: number;
  height?: number;
}

interface TrailPoint {
  lat: number;
  lon: number;
  timestamp: number;
}

const MAX_TRAIL_POINTS = 100;

export function LocalTrajectoryView({ gps, width = 288, height = 200 }: LocalTrajectoryViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [bounds, setBounds] = useState({ minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 });
  const lat = gps?.lat;
  const lon = gps?.lon;

  // Update trail when GPS changes
  useEffect(() => {
    if (lat == null || lon == null) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrail((prev) => {
      const newTrail = [...prev, { lat, lon, timestamp: Date.now() }];
      // Keep only last N points
      if (newTrail.length > MAX_TRAIL_POINTS) {
        newTrail.shift();
      }
      return newTrail;
    });
  }, [lat, lon]);

  // Calculate bounds from trail
  useEffect(() => {
    if (trail.length < 2) return;

    const lats = trail.map((p) => p.lat);
    const lons = trail.map((p) => p.lon);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    // Add padding
    const latPad = Math.max((maxLat - minLat) * 0.2, 0.0001);
    const lonPad = Math.max((maxLon - minLon) * 0.2, 0.0001);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBounds({
      minLat: minLat - latPad,
      maxLat: maxLat + latPad,
      minLon: minLon - lonPad,
      maxLon: maxLon + lonPad,
    });
  }, [trail]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (trail.length < 2 || !gps) return;

    const { minLat, maxLat, minLon, maxLon } = bounds;
    const latRange = maxLat - minLat || 0.001;
    const lonRange = maxLon - minLon || 0.001;

    // Convert lat/lon to canvas coordinates
    const toCanvas = (lat: number, lon: number): [number, number] => {
      const x = ((lon - minLon) / lonRange) * (width - 40) + 20;
      const y = height - ((lat - minLat) / latRange) * (height - 40) - 20;
      return [x, y];
    };

    // Draw trail
    ctx.beginPath();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    trail.forEach((point, i) => {
      const [x, y] = toCanvas(point.lat, point.lon);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw trail points with fading
    trail.forEach((point, i) => {
      const [x, y] = toCanvas(point.lat, point.lon);
      const alpha = 0.2 + (i / trail.length) * 0.6;
      ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw current position
    const [cx, cy] = toCanvas(gps.lat, gps.lon);

    // Glow effect
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
    gradient.addColorStop(0, "rgba(16, 185, 129, 0.4)");
    gradient.addColorStop(1, "rgba(16, 185, 129, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();

    // Vehicle triangle pointing in heading direction
    ctx.save();
    ctx.translate(cx, cy);
    // nuScenes heading: 0=East, 90=North. Triangle drawn pointing right (+X)
    // Canvas: positive rotation = clockwise. Y is flipped in toCanvas.
    ctx.rotate((-gps.heading * Math.PI) / 180);

    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-6, -7);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();

    // White direction indicator
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-2, -3);
    ctx.lineTo(-2, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Draw compass
    const compassX = width - 25;
    const compassY = 25;
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(compassX, compassY, 15, 0, Math.PI * 2);
    ctx.stroke();

    // North indicator
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("N", compassX, compassY - 6);
    ctx.fillStyle = "#64748b";
    ctx.fillText("S", compassX, compassY + 12);

  }, [trail, gps, bounds, width, height]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      {/* Header */}
      <div className="absolute top-2 left-2 z-10 bg-black/60 px-2 py-1 rounded text-xs font-medium text-white flex items-center gap-1.5">
        <Navigation className="w-3 h-3" />
        Local Trajectory
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block"
      />

      {/* Info overlay */}
      {gps && (
        <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[10px] text-gray-400">
          <span className="bg-black/60 px-1.5 py-0.5 rounded">
            {gps.speedKph?.toFixed(1)} km/h
          </span>
          <span className="bg-black/60 px-1.5 py-0.5 rounded flex items-center gap-1">
            <Compass className="w-2.5 h-2.5" />
            {gps.heading?.toFixed(0)}°
          </span>
          <span className="bg-black/60 px-1.5 py-0.5 rounded">
            {trail.length} pts
          </span>
        </div>
      )}

      {/* No data state */}
      {!gps && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <MapPin className="w-6 h-6 mx-auto mb-1 opacity-50" />
            <p className="text-xs">Waiting for GPS...</p>
          </div>
        </div>
      )}
    </div>
  );
}
