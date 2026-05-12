/**
 * AV Sensor Dashboard — Autonomous Vehicle Data Visualization
 * Real-time display of sensor data from nuScenes replayer
 */
"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useAvSensorSocket } from "@/hooks/useAvSensorSocket";
import { CameraGrid } from "@/components/av/CameraGrid";
import { LidarMultiView } from "@/components/av/LidarMultiView";
import { StatusPanel } from "@/components/av/StatusPanel";
import { AvMiniMap } from "@/components/av/AvMiniMap";
import { LocalTrajectoryView } from "@/components/av/LocalTrajectoryView";
import { BirdEyeView } from "@/components/av/BirdEyeView";
import { Wifi, WifiOff, Car, Camera, Radar, MapPin, Navigation, Map, Eye } from "lucide-react";

type MapMode = "trajectory" | "bev" | "world";

const STAT_CARD_STYLES = {
  blue: {
    card: "bg-blue-500/5 border-blue-500/20",
    iconWrap: "bg-blue-500/10",
    icon: "text-blue-400",
  },
  purple: {
    card: "bg-purple-500/5 border-purple-500/20",
    iconWrap: "bg-purple-500/10",
    icon: "text-purple-400",
  },
  emerald: {
    card: "bg-emerald-500/5 border-emerald-500/20",
    iconWrap: "bg-emerald-500/10",
    icon: "text-emerald-400",
  },
  amber: {
    card: "bg-amber-500/5 border-amber-500/20",
    iconWrap: "bg-amber-500/10",
    icon: "text-amber-400",
  },
} as const;

type StatCardTone = keyof typeof STAT_CARD_STYLES;

export default function AvDashboardPage() {
  const { connected, gps, cameras, lidar, status, annotations } = useAvSensorSocket();
  const [mapMode, setMapMode] = useState<MapMode>("world");
  const mapPanelRef = useRef<HTMLDivElement>(null);
  const [mapPanelSize, setMapPanelSize] = useState({ width: 288, height: 240 });

  useEffect(() => {
    const el = mapPanelRef.current;
    if (!el) return;

    const updateSize = () => {
      const w = Math.max(260, Math.floor(el.clientWidth));
      const h = Math.max(200, Math.min(380, Math.round(w * 0.52)));
      setMapPanelSize({ width: w, height: h });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stats: {
    label: string;
    value: string | number;
    max: number | null;
    icon: LucideIcon;
    tone: StatCardTone;
  }[] = [
    { label: "Cameras", value: cameras.size, max: 6, icon: Camera, tone: "blue" },
    { label: "LiDAR Points", value: lidar?.pointCount ?? 0, max: null, icon: Radar, tone: "purple" },
    { label: "Speed", value: `${gps?.speedKph?.toFixed(1) ?? "—"} km/h`, max: null, icon: Car, tone: "emerald" },
    { label: "Frame", value: status ? `${status.frame}/${status.totalFrames}` : "—", max: null, icon: MapPin, tone: "amber" },
  ];

  return (
    <div className="flex flex-col h-screen p-4 gap-4 overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Car className="w-6 h-6 text-emerald-400" />
            AV Sensor Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Real-time autonomous vehicle data from nuScenes
          </p>
        </div>

        {/* Connection indicator */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
            connected
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {connected ? (
            <><Wifi className="w-3.5 h-3.5" /> Connected to /av</>
          ) : (
            <><WifiOff className="w-3.5 h-3.5" /> Disconnected</>
          )}
        </div>
      </div>

      {/* ── Stats Bar ──────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {stats.map(({ label, value, max, icon: Icon, tone }) => {
          const styles = STAT_CARD_STYLES[tone];
          return (
            <div
              key={label}
              className={`flex items-center gap-3 p-3 rounded-lg border ${styles.card}`}
            >
              <div className={`p-2 rounded-lg ${styles.iconWrap}`}>
                <Icon className={`w-5 h-5 ${styles.icon}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-semibold text-white">
                  {value}
                  {max !== null && <span className="text-gray-500">/{max}</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Main Content ───────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Left: Camera Grid */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <Camera className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-gray-300">
              Camera Views (6 channels)
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            <CameraGrid cameras={cameras} />
          </div>

          {/* Position View with Toggle */}
          <div ref={mapPanelRef} className="mt-4 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {mapMode === "trajectory" && <Navigation className="w-4 h-4 text-emerald-400" />}
                {mapMode === "bev" && <Eye className="w-4 h-4 text-emerald-400" />}
                {mapMode === "world" && <Map className="w-4 h-4 text-emerald-400" />}
                <h2 className="text-sm font-semibold text-gray-300">
                  {mapMode === "trajectory" && "Local Trajectory"}
                  {mapMode === "bev" && "Bird's Eye View"}
                  {mapMode === "world" && "World Map"}
                </h2>
              </div>
              {/* Toggle buttons */}
              <div className="flex gap-1">
                <button
                  onClick={() => setMapMode("trajectory")}
                  className={`px-1.5 py-0.5 rounded text-[9px] transition-colors ${
                    mapMode === "trajectory"
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  }`}
                  title="Local trajectory view"
                >
                  Trail
                </button>
                <button
                  onClick={() => setMapMode("bev")}
                  className={`px-1.5 py-0.5 rounded text-[9px] transition-colors ${
                    mapMode === "bev"
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  }`}
                  title="Bird's Eye View"
                >
                  BEV
                </button>
                <button
                  onClick={() => setMapMode("world")}
                  className={`px-1.5 py-0.5 rounded text-[9px] transition-colors ${
                    mapMode === "world"
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  }`}
                  title="World map (approximate)"
                >
                  World
                </button>
              </div>
            </div>
            {mapMode === "trajectory" && (
              <LocalTrajectoryView
                gps={gps}
                width={mapPanelSize.width}
                height={mapPanelSize.height}
              />
            )}
            {mapMode === "bev" && (
              <BirdEyeView gps={gps} width={mapPanelSize.width} height={mapPanelSize.height} />
            )}
            {mapMode === "world" && (
              <>
                <AvMiniMap gps={gps} height={mapPanelSize.height} />
                <p className="text-[10px] text-gray-500 mt-1 text-center">
                  ⚠️ Coordinates are approximate (local → GPS)
                </p>
              </>
            )}
          </div>
        </div>

        {/* Right: Sidebar with Status, Map, LiDAR — scrollable */}
        <div className="w-100 shrink-0 overflow-y-auto">
          <div className="flex flex-col gap-4 pb-4">
               {/* LiDAR Multi-View */}
               <div>
              <LidarMultiView 
                lidar={lidar} 
                annotations={annotations} 
                width={340} 
                height={420} 
              />
            </div>

             {/* Status Panel */}
             <StatusPanel gps={gps} status={status} />
          </div>
        </div>
      </div>
    </div>
  );
}
