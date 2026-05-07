/**
 * Dashboard Home — Live Fleet Map
 * Shows real-time vehicle positions via WebSocket + Leaflet
 */
"use client";

import { useFleetSocket } from "@/hooks/useFleetSocket";
import { FleetMap } from "@/components/FleetMap";
import { Wifi, WifiOff, Truck, TrendingUp, Square } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function DashboardPage() {
  const { vehicleList, connected } = useFleetSocket();

  const moving  = vehicleList.filter((v) => v.status === "MOVING").length;
  const stopped = vehicleList.filter((v) => v.status === "STOPPED").length;

  return (
    <div className="flex flex-col h-screen p-6 gap-4">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Fleet Map</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Real-time vehicle tracking via MQTT & WebSocket
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
            <><Wifi className="w-3.5 h-3.5" /> WebSocket Connected</>
          ) : (
            <><WifiOff className="w-3.5 h-3.5" /> Disconnected</>
          )}
        </div>
      </div>

      {/* ── Stats Bar ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        {[
          { label: "Total Vehicles", value: vehicleList.length, icon: Truck,      color: "blue"  },
          { label: "Moving",         value: moving,             icon: TrendingUp,  color: "green" },
          { label: "Stopped",        value: stopped,            icon: Square,      color: "red"   },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <div className={`w-9 h-9 bg-${color}-500/15 rounded-lg flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 text-${color}-400`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white leading-none">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main content: Map + Sidebar ────────────────────────── */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-gray-800 bg-gray-900">
          <FleetMap positions={vehicleList} />
        </div>

        {/* Vehicle list sidebar */}
        <div className="w-72 flex flex-col gap-2 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-shrink-0">
            Vehicles ({vehicleList.length})
          </p>

          {vehicleList.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-gray-600">
              <Truck className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No vehicles yet</p>
              <p className="text-xs mt-1">Start the simulator to see live data</p>
            </div>
          )}

          {vehicleList.map((vehicle) => (
            <div
              key={vehicle.vehicleId}
              className="bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white text-sm">{vehicle.vehicleId}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    vehicle.status === "MOVING"
                      ? "bg-green-500/15 text-green-400"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {vehicle.status}
                </span>
              </div>

              <div className="space-y-1 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Speed</span>
                  <span className="text-white font-medium">
                    {Number(vehicle.speed).toFixed(1)} km/h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Heading</span>
                  <span className="text-white font-medium">{vehicle.heading}°</span>
                </div>
                <div className="flex justify-between">
                  <span>Updated</span>
                  <span className="text-gray-500">
                    {formatDistanceToNow(new Date(vehicle.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
