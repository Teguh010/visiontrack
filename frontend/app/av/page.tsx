/**
 * AV Sensor Dashboard — Autonomous Vehicle Data Visualization
 * Real-time display of sensor data from nuScenes replayer
 */
"use client";

import { useState } from "react";
import { useAvSensorSocket } from "@/hooks/useAvSensorSocket";
import { CameraGrid } from "@/components/av/CameraGrid";
import { LidarMultiView } from "@/components/av/LidarMultiView";
import { StatusPanel } from "@/components/av/StatusPanel";
import { AvMiniMap } from "@/components/av/AvMiniMap";
import { LocalTrajectoryView } from "@/components/av/LocalTrajectoryView";
import { BirdEyeView } from "@/components/av/BirdEyeView";
import { Wifi, WifiOff, Car, Camera, Radar, MapPin, Navigation, Map, Eye } from "lucide-react";

type MapMode = "trajectory" | "bev" | "world";

export default function AvDashboardPage() {
  const { connected, gps, cameras, lidar, status, annotations } = useAvSensorSocket();
  const [mapMode, setMapMode] = useState<MapMode>("bev");

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
        {[
          {
            label: "Cameras",
            value: cameras.size,
            max: 6,
            icon: Camera,
            color: "blue",
          },
          {
            label: "LiDAR Points",
            value: lidar?.pointCount ?? 0,
            max: null,
            icon: Radar,
            color: "purple",
          },
          {
            label: "Speed",
            value: `${gps?.speedKph?.toFixed(1) ?? "—"} km/h`,
            max: null,
            icon: Car,
            color: "emerald",
          },
          {
            label: "Frame",
            value: status ? `${status.frame}/${status.totalFrames}` : "—",
            max: null,
            icon: MapPin,
            color: "amber",
          },
        ].map(({ label, value, max, icon: Icon, color }) => (
          <div
            key={label}
            className={`flex items-center gap-3 p-3 rounded-lg border bg-${color}-500/5 border-${color}-500/20`}
          >
            <div className={`p-2 rounded-lg bg-${color}-500/10`}>
              <Icon className={`w-5 h-5 text-${color}-400`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-lg font-semibold text-white">
                {value}
                {max !== null && <span className="text-gray-500">/{max}</span>}
              </p>
            </div>
          </div>
        ))}
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
        </div>

        {/* Right: Sidebar with Status, Map, LiDAR — scrollable */}
        <div className="w-80 shrink-0 overflow-y-auto">
          <div className="flex flex-col gap-4 pb-4">
            {/* Status Panel */}
            <StatusPanel gps={gps} status={status} />

            {/* Position View with Toggle */}
            <div>
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
                <LocalTrajectoryView gps={gps} width={288} height={200} />
              )}
              {mapMode === "bev" && (
                <BirdEyeView gps={gps} width={288} height={200} />
              )}
              {mapMode === "world" && (
                <>
                  <AvMiniMap gps={gps} height={200} />
                  <p className="text-[10px] text-gray-500 mt-1 text-center">
                    ⚠️ Coordinates are approximate (local → GPS)
                  </p>
                </>
              )}
            </div>

            {/* LiDAR Multi-View */}
            <div>
              <LidarMultiView 
                lidar={lidar} 
                annotations={annotations} 
                width={340} 
                height={420} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
