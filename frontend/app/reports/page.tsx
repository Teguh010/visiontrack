/**
 * Reports Page — Fleet Reports Dashboard
 * Menampilkan 3 jenis laporan:
 *  1. Fleet Overview — snapshot realtime semua kendaraan
 *  2. Trip Report — jarak, durasi, stop events per kendaraan
 *  3. Speed Distribution — pie/bar chart distribusi kecepatan
 */
"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { Vehicle } from "@/types/tracking";
import {
  FileText, Truck, TrendingUp, Clock, MapPin,
  Loader2, RefreshCw, Activity,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FleetOverview {
  generatedAt: string;
  totalVehicles: number;
  moving: number;
  stopped: number;
  vehicles: Array<{
    vehicleId: string; name: string; plate: string;
    status: string; speed: number; lastSeen: string;
    distanceTodayKm: number;
  }>;
}

interface TripReport {
  vehicleId: string; from: string; to: string;
  totalPoints: number; distanceKm: number; durationMinutes: number;
  movingMinutes: number; stoppedMinutes: number;
  maxSpeedKmh: number; avgSpeedKmh: number; stopCount: number;
  stops: Array<{ startTime: string; endTime: string; durationMinutes: number; lat: number; lon: number }>;
}

interface SpeedBand {
  label: string; min: number; max: number; count: number; percentage: number;
}

interface SpeedDistribution {
  vehicleId: string; totalReadings: number; bands: SpeedBand[];
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const BAND_COLORS = ["#64748b", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

// ─────────────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [vehicles, setVehicles]           = useState<Vehicle[]>([]);
  const [selectedId, setSelectedId]       = useState<string>("");
  const [from, setFrom]                   = useState<string>(getTodayStart());
  const [to, setTo]                       = useState<string>(getNow());
  const [activeTab, setActiveTab]         = useState<"overview" | "trip" | "speed">("overview");

  const [overview, setOverview]           = useState<FleetOverview | null>(null);
  const [tripReport, setTripReport]       = useState<TripReport | null>(null);
  const [speedDist, setSpeedDist]         = useState<SpeedDistribution | null>(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/vehicles`).then(r => r.json()).then(res => {
      setVehicles(res.data || []);
      if (res.data?.length) setSelectedId(res.data[0].id);
    }).catch(() => setError("Backend tidak bisa diakses"));

    // Auto-load fleet overview on mount
    loadOverview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadOverview() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/reports/fleet-overview`).then(r => r.json());
      setOverview(res);
    } catch { setError("Gagal load fleet overview"); }
    finally { setLoading(false); }
  }

  async function loadTripReport() {
    if (!selectedId) return;
    setLoading(true); setError(null);
    try {
      const url = `${API}/reports/trip?vehicleId=${selectedId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const res = await fetch(url).then(r => r.json());
      setTripReport(res);
    } catch { setError("Gagal load trip report"); }
    finally { setLoading(false); }
  }

  async function loadSpeedDist() {
    if (!selectedId) return;
    setLoading(true); setError(null);
    try {
      const url = `${API}/reports/speed-distribution?vehicleId=${selectedId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const res = await fetch(url).then(r => r.json());
      setSpeedDist(res);
    } catch { setError("Gagal load speed distribution"); }
    finally { setLoading(false); }
  }

  function handleGenerate() {
    if (activeTab === "overview") loadOverview();
    else if (activeTab === "trip") loadTripReport();
    else loadSpeedDist();
  }

  const tabs = [
    { id: "overview", label: "Fleet Overview",       icon: Truck     },
    { id: "trip",     label: "Trip Report",           icon: MapPin    },
    { id: "speed",    label: "Speed Distribution",    icon: Activity  },
  ] as const;

  return (
    <div className="flex flex-col min-h-screen p-6 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-gray-500 text-sm mt-0.5">Laporan operasional armada kendaraan</p>
        </div>
        <button onClick={handleGenerate} disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Generate
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 flex-shrink-0">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
            }`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Controls (for trip & speed tabs) */}
      {activeTab !== "overview" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex-shrink-0">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Kendaraan</label>
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.id} — {v.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Dari</label>
              <input type="datetime-local" value={from} onChange={e => setFrom(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Sampai</label>
              <input type="datetime-local" value={to} onChange={e => setTo(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>}

      {/* ── TAB: Fleet Overview ── */}
      {activeTab === "overview" && overview && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Kendaraan", value: overview.totalVehicles, color: "blue",  icon: Truck      },
              { label: "Bergerak",         value: overview.moving,        color: "green", icon: TrendingUp },
              { label: "Berhenti",         value: overview.stopped,       color: "red",   icon: Clock      },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className={`w-9 h-9 bg-${color}-500/15 rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 text-${color}-400`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Vehicle table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Detail Per Kendaraan
              </h2>
              <span className="text-xs text-gray-500">
                {overview.generatedAt && `Update: ${formatDistanceToNow(new Date(overview.generatedAt), { addSuffix: true })}`}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-800">
                    {["ID","Nama","Plat","Status","Speed","Jarak Hari Ini","Terakhir Dilihat"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overview.vehicles.map((v) => (
                    <tr key={v.vehicleId} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-blue-400 font-medium">{v.vehicleId}</td>
                      <td className="px-4 py-3 text-gray-200">{v.name}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{v.plate}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          v.status === "MOVING"
                            ? "bg-green-500/15 text-green-400"
                            : "bg-red-500/15 text-red-400"
                        }`}>{v.status}</span>
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{v.speed.toFixed(1)} km/h</td>
                      <td className="px-4 py-3 text-white font-medium">{v.distanceTodayKm} km</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatDistanceToNow(new Date(v.lastSeen), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Trip Report ── */}
      {activeTab === "trip" && tripReport && (
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Jarak",    value: `${tripReport.distanceKm} km`,             color: "blue"   },
              { label: "Durasi",         value: `${tripReport.durationMinutes} menit`,      color: "purple" },
              { label: "Waktu Jalan",    value: `${tripReport.movingMinutes} menit`,        color: "green"  },
              { label: "Waktu Berhenti", value: `${tripReport.stoppedMinutes} menit`,       color: "orange" },
              { label: "Max Speed",      value: `${tripReport.maxSpeedKmh} km/h`,           color: "red"    },
              { label: "Avg Speed",      value: `${tripReport.avgSpeedKmh} km/h`,           color: "cyan"   },
              { label: "Jumlah Stop",    value: `${tripReport.stopCount} kali`,             color: "yellow" },
              { label: "Data Points",    value: tripReport.totalPoints.toLocaleString(),    color: "gray"   },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                <p className={`text-xl font-bold text-${color}-400`}>{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Stop events */}
          {tripReport.stops.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-300">
                  Stop Events ({tripReport.stops.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-800">
                      {["#","Mulai Berhenti","Selesai","Durasi","Lokasi"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tripReport.stops.map((s, i) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-300">
                          {format(new Date(s.startTime), "HH:mm:ss")}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-300">
                          {format(new Date(s.endTime), "HH:mm:ss")}
                        </td>
                        <td className="px-4 py-2.5 text-orange-400 font-medium">
                          {s.durationMinutes} menit
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-400">
                          {s.lat.toFixed(5)}, {s.lon.toFixed(5)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tripReport.totalPoints === 0 && (
            <div className="text-center py-16 text-gray-600">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Tidak ada data untuk rentang waktu ini</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Speed Distribution ── */}
      {activeTab === "speed" && speedDist && (
        <div className="grid grid-cols-2 gap-4">
          {/* Bar chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">
              Distribusi Kecepatan — {speedDist.vehicleId}
              <span className="text-gray-500 font-normal ml-2">
                ({speedDist.totalReadings.toLocaleString()} readings)
              </span>
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={speedDist.bands} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" stroke="#4b5563" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
                <YAxis stroke="#4b5563" tick={{ fontSize: 10 }} unit="%" />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                  formatter={(v) => [`${Number(v ?? 0)}%`, "Persentase"]}
                />
                <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                  {speedDist.bands.map((_, i) => (
                    <Cell key={i} fill={BAND_COLORS[i % BAND_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Proporsi Waktu</h2>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={speedDist.bands.filter(b => b.count > 0)}
                  dataKey="percentage"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {speedDist.bands.filter(b => b.count > 0).map((_, i) => (
                    <Cell key={i} fill={BAND_COLORS[i % BAND_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span className="text-gray-400 text-xs">{value}</span>}
                />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                  formatter={(v) => [`${Number(v ?? 0)}%`, "Persentase"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Detail table */}
          <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300">Detail Bands</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  {["Band","Range (km/h)","Jumlah Reading","Persentase","Bar"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {speedDist.bands.map((b, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="px-4 py-2.5 text-white font-medium">{b.label}</td>
                    <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{b.min}–{b.max === 999 ? "∞" : b.max}</td>
                    <td className="px-4 py-2.5 text-gray-300">{b.count.toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-bold" style={{ color: BAND_COLORS[i] }}>
                      {b.percentage}%
                    </td>
                    <td className="px-4 py-2.5 w-48">
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${b.percentage}%`, background: BAND_COLORS[i] }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty states */}
      {!loading && !error && !overview && !tripReport && !speedDist && (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-600 py-20">
          <FileText className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-sm">Klik &quot;Generate&quot; untuk membuat laporan</p>
        </div>
      )}
    </div>
  );
}

function getTodayStart() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}
function getNow() { return new Date().toISOString().slice(0, 16); }
