/**
 * Analytics Page — Speed chart + Stop detection timeline
 */
"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { Vehicle, TrackingPoint } from "@/types/tracking";
import { format } from "date-fns";
import { BarChart2, Loader2, AlertCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export default function AnalyticsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [from, setFrom] = useState<string>(getTodayStart());
  const [to, setTo] = useState<string>(getNow());
  const [points, setPoints] = useState<TrackingPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/vehicles`)
      .then((r) => r.json())
      .then((res) => {
        setVehicles(res.data || []);
        if (res.data?.length) setSelectedId(res.data[0].id);
      })
      .catch(() => setError("Backend not reachable"));
  }, []);

  async function load() {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      const url = `${API}/tracking/history?vehicleId=${selectedId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const res = await fetch(url).then((r) => r.json());
      setPoints(res.data || []);
    } catch {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }

  // Prepare chart data
  const chartData = points.map((p) => ({
    time: format(new Date(p.timestamp), "HH:mm:ss"),
    speed: Number(Number(p.speed).toFixed(1)),
    status: p.status,
  }));

  // Stop events
  const stopEvents = points.filter((p) => p.status === "STOPPED");

  // Stats
  const maxSpeed = points.length
    ? Math.max(...points.map((p) => Number(p.speed)))
    : 0;
  const avgSpeed = points.length
    ? points.reduce((s, p) => s + Number(p.speed), 0) / points.length
    : 0;
  const totalStops = stopEvents.length;

  return (
    <div className="flex flex-col h-screen p-6 gap-4 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Speed profile & stop detection per vehicle
        </p>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex-shrink-0">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Vehicle</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} — {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">From</label>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">To</label>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={load}
            disabled={loading || !selectedId}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BarChart2 className="w-4 h-4" />
            )}
            Analyze
          </button>
        </div>
        {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
      </div>

      {/* Stat cards */}
      {points.length > 0 && (
        <div className="grid grid-cols-3 gap-3 flex-shrink-0">
          {[
            {
              label: "Max Speed",
              value: `${maxSpeed.toFixed(1)} km/h`,
              color: "blue",
            },
            {
              label: "Avg Speed",
              value: `${avgSpeed.toFixed(1)} km/h`,
              color: "green",
            },
            { label: "Stop Events", value: totalStops, color: "red" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3"
            >
              <p className={`text-2xl font-bold text-${color}-400`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Speed Chart */}
      {points.length > 0 ? (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">
              Speed Profile — {selectedId}
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="time"
                  stroke="#4b5563"
                  tick={{ fontSize: 10 }}
                  interval={Math.floor(chartData.length / 8)}
                />
                <YAxis stroke="#4b5563" tick={{ fontSize: 10 }} unit=" km/h" />
                <Tooltip
                  contentStyle={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: "#94a3b8", fontSize: 11 }}
                  itemStyle={{ color: "#60a5fa" }}
                />
                {/* Stop threshold line */}
                <ReferenceLine
                  y={5}
                  stroke="#f97316"
                  strokeDasharray="4 4"
                  label={{
                    value: "Stop threshold",
                    fill: "#f97316",
                    fontSize: 10,
                  }}
                />
                <Line
                  dataKey="speed"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  name="Speed"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Stop Events Table */}
          {stopEvents.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-400" />
                Stop Events ({stopEvents.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-800">
                      <th className="pb-2 pr-4">#</th>
                      <th className="pb-2 pr-4">Timestamp</th>
                      <th className="pb-2 pr-4">Location</th>
                      <th className="pb-2">Speed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stopEvents.slice(0, 20).map((p, i) => (
                      <tr
                        key={p.id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30"
                      >
                        <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                        <td className="py-2 pr-4 text-gray-300 font-mono text-xs">
                          {format(new Date(p.timestamp), "HH:mm:ss")}
                        </td>
                        <td className="py-2 pr-4 text-gray-400 font-mono text-xs">
                          {Number(p.lat).toFixed(5)}, {Number(p.lon).toFixed(5)}
                        </td>
                        <td className="py-2 text-orange-400 font-medium">
                          {Number(p.speed).toFixed(1)} km/h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-600 py-20">
          <BarChart2 className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-sm">
            Select a vehicle and date range, then click &quot;Analyze&quot;
          </p>
        </div>
      )}
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
