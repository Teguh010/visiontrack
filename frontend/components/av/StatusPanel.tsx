"use client";

import { AvGpsData, AvStatusData } from "@/types/av-sensor";
import {
  MapPin,
  Compass,
  Gauge,
  Mountain,
  Film,
  Play,
  Pause,
  CheckCircle,
  Clock,
} from "lucide-react";

interface StatusPanelProps {
  gps: AvGpsData | null;
  status: AvStatusData | null;
}

export function StatusPanel({ gps, status }: StatusPanelProps) {
  const statusIcon = {
    playing: <Play className="w-4 h-4 text-green-400" />,
    paused: <Pause className="w-4 h-4 text-yellow-400" />,
    finished: <CheckCircle className="w-4 h-4 text-blue-400" />,
    idle: <Clock className="w-4 h-4 text-gray-400" />,
  };

  const statusColor = {
    playing: "text-green-400",
    paused: "text-yellow-400",
    finished: "text-blue-400",
    idle: "text-gray-400",
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 space-y-4">
      {/* Scene Info */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Film className="w-4 h-4" />
          Scene Info
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-gray-900/50 rounded px-3 py-2">
            <span className="text-gray-500 text-xs">Scene</span>
            <p className="text-white font-mono">{status?.scene ?? "—"}</p>
          </div>
          <div className="bg-gray-900/50 rounded px-3 py-2">
            <span className="text-gray-500 text-xs">Status</span>
            <p className={`font-medium flex items-center gap-1.5 ${statusColor[status?.status ?? "idle"]}`}>
              {statusIcon[status?.status ?? "idle"]}
              {status?.status ?? "idle"}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {status && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Frame {status.frame} / {status.totalFrames}</span>
              <span>{status.progressPct.toFixed(1)}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${status.progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* GPS Info */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Vehicle Position
        </h3>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-gray-900/50 rounded px-3 py-2">
            <span className="text-gray-500 text-xs flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Latitude
            </span>
            <p className="text-white font-mono">
              {gps?.lat?.toFixed(6) ?? "—"}
            </p>
          </div>
          <div className="bg-gray-900/50 rounded px-3 py-2">
            <span className="text-gray-500 text-xs flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Longitude
            </span>
            <p className="text-white font-mono">
              {gps?.lon?.toFixed(6) ?? "—"}
            </p>
          </div>
          <div className="bg-gray-900/50 rounded px-3 py-2">
            <span className="text-gray-500 text-xs flex items-center gap-1">
              <Compass className="w-3 h-3" /> Heading
            </span>
            <p className="text-white font-mono">
              {gps?.heading?.toFixed(1) ?? "—"}°
            </p>
          </div>
          <div className="bg-gray-900/50 rounded px-3 py-2">
            <span className="text-gray-500 text-xs flex items-center gap-1">
              <Gauge className="w-3 h-3" /> Speed
            </span>
            <p className="text-white font-mono">
              {gps?.speedKph?.toFixed(1) ?? "—"} km/h
            </p>
          </div>
          <div className="bg-gray-900/50 rounded px-3 py-2 col-span-2">
            <span className="text-gray-500 text-xs flex items-center gap-1">
              <Mountain className="w-3 h-3" /> Altitude
            </span>
            <p className="text-white font-mono">
              {gps?.altitude?.toFixed(2) ?? "—"} m
            </p>
          </div>
        </div>

        {/* Location */}
        {gps?.location && (
          <div className="text-xs text-gray-400 text-center">
            📍 {gps.location}
          </div>
        )}
      </div>
    </div>
  );
}
