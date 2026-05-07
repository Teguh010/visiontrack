/**
 * History Playback Page
 * Select a vehicle + date range → fetch trajectory → render polyline
 */
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Vehicle, TrackingPoint } from "@/types/tracking";
import { Calendar, Search, Loader2, MapPin } from "lucide-react";

const HistoryMapInner = dynamic(() => import("@/components/HistoryMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-xl">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export default function HistoryPage() {
  const [vehicles, setVehicles]       = useState<Vehicle[]>([]);
  const [selectedId, setSelectedId]   = useState<string>("");
  const [from, setFrom]               = useState<string>(getTodayStart());
  const [to, setTo]                   = useState<string>(getNow());
  const [points, setPoints]           = useState<TrackingPoint[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Load vehicle list
  useEffect(() => {
    fetch(`${API}/vehicles`)
      .then((r) => r.json())
      .then((res) => {
        setVehicles(res.data || []);
        if (res.data?.length) setSelectedId(res.data[0].id);
      })
      .catch(() => setError("Failed to load vehicles. Is the backend running?"));
  }, []);

  async function fetchHistory() {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      const url = `${API}/tracking/history?vehicleId=${selectedId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const res = await fetch(url);
      const json = await res.json();
      setPoints(json.data || []);
    } catch {
      setError("Failed to fetch history.");
    } finally {
      setLoading(false);
    }
  }

  const stops   = points.filter((p) => p.status === "STOPPED").length;
  const avgSpeed = points.length
    ? (points.reduce((s, p) => s + Number(p.speed), 0) / points.length).toFixed(1)
    : "—";

  return (
    <div className="flex flex-col h-screen p-6 gap-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">History Playback</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Visualize vehicle trajectory for any date range
        </p>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex-shrink-0">
        <div className="flex flex-wrap items-end gap-3">
          {/* Vehicle select */}
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs text-gray-500 font-medium">Vehicle</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.id} — {v.name}</option>
              ))}
              {vehicles.length === 0 && (
                <option value="" disabled>No vehicles yet</option>
              )}
            </select>
          </div>

          {/* From */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3" /> From
            </label>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* To */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3" /> To
            </label>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Search */}
          <button
            onClick={fetchHistory}
            disabled={loading || !selectedId}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Load Trajectory
          </button>
        </div>

        {/* Stats */}
        {points.length > 0 && (
          <div className="flex gap-6 mt-4 pt-4 border-t border-gray-800 text-sm">
            <div><span className="text-gray-500">Points: </span><span className="text-white font-medium">{points.length}</span></div>
            <div><span className="text-gray-500">Stops: </span><span className="text-red-400 font-medium">{stops}</span></div>
            <div><span className="text-gray-500">Avg Speed: </span><span className="text-white font-medium">{avgSpeed} km/h</span></div>
          </div>
        )}

        {error && (
          <p className="mt-3 text-red-400 text-sm">{error}</p>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 rounded-xl overflow-hidden border border-gray-800 bg-gray-900 min-h-0">
        {points.length > 0 ? (
          <HistoryMapInner points={points} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
            <MapPin className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Select a vehicle and date range, then click &quot;Load Trajectory&quot;</p>
          </div>
        )}
      </div>
    </div>
  );
}

function getTodayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function getNow() {
  return new Date().toISOString().slice(0, 16);
}
