"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LastPosition, VehicleType } from "@/types/tracking";
import { formatDistanceToNow } from "date-fns";

// ─── SVG Vehicle Icons (Top-down view, pointing NORTH = up) ──────────────────

function getSvgIcon(type: VehicleType, status: "MOVING" | "STOPPED", driveState: string): string {
  const isActive  = status === "MOVING";
  const isIdle    = driveState === "IDLE";

  // Color based on state
  const bodyColor = isActive && !isIdle ? "#3b82f6"   // blue  = moving
                  : isIdle              ? "#f59e0b"   // amber = idle
                  :                      "#ef4444";   // red   = stopped
  const glowColor = isActive && !isIdle ? "#3b82f6"
                  : isIdle              ? "#f59e0b"
                  :                      "#ef4444";
  const wheelColor   = "#0f172a";
  const glassColor   = "rgba(255,255,255,0.55)";
  const shadowOpacity = isActive ? "0.5" : "0.2";

  switch (type) {
    // ── Bus / City vehicle ──────────────────────────────────────────────────
    case "CITY":
      return `
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="42" viewBox="0 0 22 42">
        <!-- glow -->
        <ellipse cx="11" cy="21" rx="10" ry="20" fill="${glowColor}" opacity="${shadowOpacity}" filter="url(#blur)"/>
        <!-- body -->
        <rect x="2" y="4" width="18" height="34" rx="3" fill="${bodyColor}"/>
        <!-- front windshield (top = front) -->
        <rect x="4" y="5" width="14" height="8" rx="2" fill="${glassColor}"/>
        <!-- rear window -->
        <rect x="4" y="30" width="14" height="5" rx="1" fill="${glassColor}" opacity="0.4"/>
        <!-- side windows -->
        <rect x="3" y="15" width="3" height="5" rx="1" fill="${glassColor}" opacity="0.5"/>
        <rect x="16" y="15" width="3" height="5" rx="1" fill="${glassColor}" opacity="0.5"/>
        <rect x="3" y="22" width="3" height="5" rx="1" fill="${glassColor}" opacity="0.5"/>
        <rect x="16" y="22" width="3" height="5" rx="1" fill="${glassColor}" opacity="0.5"/>
        <!-- front bumper / direction -->
        <rect x="4" y="2" width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.9)"/>
        <!-- wheels -->
        <rect x="0" y="6"  width="3" height="7" rx="1" fill="${wheelColor}"/>
        <rect x="19" y="6" width="3" height="7" rx="1" fill="${wheelColor}"/>
        <rect x="0" y="28" width="3" height="7" rx="1" fill="${wheelColor}"/>
        <rect x="19" y="28" width="3" height="7" rx="1" fill="${wheelColor}"/>
        <defs><filter id="blur"><feGaussianBlur stdDeviation="3"/></filter></defs>
      </svg>`;

    // ── Highway Truck ────────────────────────────────────────────────────────
    case "HIGHWAY":
      return `
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="52" viewBox="0 0 26 52">
        <!-- glow -->
        <ellipse cx="13" cy="26" rx="12" ry="25" fill="${glowColor}" opacity="${shadowOpacity}" filter="url(#blur)"/>
        <!-- cab (front = top) -->
        <rect x="3" y="3" width="20" height="14" rx="3" fill="${bodyColor}"/>
        <!-- windshield -->
        <rect x="5" y="4" width="16" height="8" rx="2" fill="${glassColor}"/>
        <!-- cab-cargo connector -->
        <rect x="4" y="16" width="18" height="3" rx="0" fill="rgba(0,0,0,0.3)"/>
        <!-- cargo box -->
        <rect x="3" y="19" width="20" height="28" rx="2" fill="${bodyColor}" opacity="0.85"/>
        <!-- cargo detail lines -->
        <line x1="3" y1="30" x2="23" y2="30" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
        <line x1="3" y1="40" x2="23" y2="40" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
        <!-- front bumper -->
        <rect x="4" y="1" width="18" height="3" rx="1.5" fill="rgba(255,255,255,0.9)"/>
        <!-- headlights -->
        <rect x="4"  y="2" width="5" height="2" rx="1" fill="#fde68a" opacity="0.9"/>
        <rect x="17" y="2" width="5" height="2" rx="1" fill="#fde68a" opacity="0.9"/>
        <!-- wheels (dual rear) -->
        <rect x="0"  y="5"  width="4" height="8" rx="1" fill="${wheelColor}"/>
        <rect x="22" y="5"  width="4" height="8" rx="1" fill="${wheelColor}"/>
        <rect x="0"  y="25" width="4" height="8" rx="1" fill="${wheelColor}"/>
        <rect x="22" y="25" width="4" height="8" rx="1" fill="${wheelColor}"/>
        <rect x="0"  y="37" width="4" height="8" rx="1" fill="${wheelColor}"/>
        <rect x="22" y="37" width="4" height="8" rx="1" fill="${wheelColor}"/>
        <defs><filter id="blur"><feGaussianBlur stdDeviation="3"/></filter></defs>
      </svg>`;

    // ── Delivery Van / Box ───────────────────────────────────────────────────
    case "DELIVERY":
      return `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="44" viewBox="0 0 24 44">
        <!-- glow -->
        <ellipse cx="12" cy="22" rx="11" ry="21" fill="${glowColor}" opacity="${shadowOpacity}" filter="url(#blur)"/>
        <!-- front cab (top = front) -->
        <rect x="3" y="3" width="18" height="12" rx="3" fill="${bodyColor}"/>
        <!-- windshield -->
        <rect x="5" y="4" width="14" height="7" rx="2" fill="${glassColor}"/>
        <!-- box body -->
        <rect x="2" y="15" width="20" height="26" rx="2" fill="${bodyColor}" opacity="0.9"/>
        <!-- rear door split -->
        <line x1="12" y1="15" x2="12" y2="41" stroke="rgba(0,0,0,0.25)" stroke-width="1.5"/>
        <!-- van logo area -->
        <rect x="6" y="22" width="12" height="8" rx="1" fill="rgba(255,255,255,0.15)"/>
        <!-- front bumper -->
        <rect x="4" y="1" width="16" height="3" rx="1.5" fill="rgba(255,255,255,0.9)"/>
        <!-- headlights -->
        <rect x="4"  y="2" width="4" height="2" rx="1" fill="#fde68a" opacity="0.8"/>
        <rect x="16" y="2" width="4" height="2" rx="1" fill="#fde68a" opacity="0.8"/>
        <!-- wheels -->
        <rect x="0"  y="5"  width="3" height="7" rx="1" fill="${wheelColor}"/>
        <rect x="21" y="5"  width="3" height="7" rx="1" fill="${wheelColor}"/>
        <rect x="0"  y="26" width="3" height="7" rx="1" fill="${wheelColor}"/>
        <rect x="21" y="26" width="3" height="7" rx="1" fill="${wheelColor}"/>
        <defs><filter id="blur"><feGaussianBlur stdDeviation="3"/></filter></defs>
      </svg>`;

    // ── Patrol / Police Car ──────────────────────────────────────────────────
    case "PATROL":
      return `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="36" viewBox="0 0 20 36">
        <!-- glow -->
        <ellipse cx="10" cy="18" rx="9" ry="17" fill="${glowColor}" opacity="${shadowOpacity}" filter="url(#blur)"/>
        <!-- body -->
        <rect x="2" y="7" width="16" height="22" rx="4" fill="${bodyColor}"/>
        <!-- police stripe -->
        <rect x="2" y="16" width="16" height="4" fill="white" opacity="0.5"/>
        <!-- front windshield -->
        <rect x="4" y="8" width="12" height="7" rx="2" fill="${glassColor}"/>
        <!-- rear window -->
        <rect x="4" y="24" width="12" height="4" rx="1" fill="${glassColor}" opacity="0.4"/>
        <!-- light bar (red + blue) -->
        <rect x="5" y="3" width="10" height="4" rx="2" fill="#1e3a8a"/>
        <rect x="5" y="3" width="5"  height="4" rx="2" fill="#dc2626"/>
        <!-- front bumper -->
        <rect x="3" y="5" width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.9)"/>
        <!-- wheels -->
        <rect x="0"  y="8"  width="3" height="6" rx="1" fill="${wheelColor}"/>
        <rect x="17" y="8"  width="3" height="6" rx="1" fill="${wheelColor}"/>
        <rect x="0"  y="22" width="3" height="6" rx="1" fill="${wheelColor}"/>
        <rect x="17" y="22" width="3" height="6" rx="1" fill="${wheelColor}"/>
        <defs><filter id="blur"><feGaussianBlur stdDeviation="3"/></filter></defs>
      </svg>`;

    default:
      return getSvgIcon("CITY", status, driveState);
  }
}

// Icon dimensions per type (width, height, anchorX, anchorY)
const ICON_DIMS: Record<VehicleType, [number, number]> = {
  CITY:     [22, 42],
  HIGHWAY:  [26, 52],
  DELIVERY: [24, 44],
  PATROL:   [20, 36],
};

function createVehicleIcon(pos: LastPosition): L.DivIcon {
  const type      = pos.vehicleType ?? "CITY";
  const [w, h]    = ICON_DIMS[type] ?? [22, 42];
  const svg       = getSvgIcon(type, pos.status, pos.driveState ?? "DRIVING");
  const heading   = pos.heading ?? 0;
  const isMoving  = pos.status === "MOVING" && pos.driveState !== "IDLE";

  // Pulse ring for moving vehicles
  const pulse = isMoving
    ? `<div style="
        position:absolute;
        width:${w + 12}px; height:${h + 12}px;
        top:${-6}px; left:${-6}px;
        border-radius:50%;
        background:rgba(59,130,246,0.15);
        animation:fleet-pulse 2s ease-in-out infinite;
      "></div>`
    : "";

  return L.divIcon({
    html: `
      <div style="position:relative; width:${w}px; height:${h}px;">
        ${pulse}
        <div style="
          transform: rotate(${heading}deg);
          transform-origin: center center;
          width:${w}px; height:${h}px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        ">${svg}</div>
      </div>
    `,
    className:  "",
    iconSize:   [w, h],
    iconAnchor: [w / 2, h / 2],   // center pivot = correct rotation
    popupAnchor:[0, -(h / 2)],
  });
}

// ─── Pulse animation (injected once) ─────────────────────────────────────────

function injectPulseStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById("fleet-pulse-style")) return;
  const style = document.createElement("style");
  style.id = "fleet-pulse-style";
  style.textContent = `
    @keyframes fleet-pulse {
      0%, 100% { transform: scale(1);   opacity: 0.6; }
      50%       { transform: scale(1.4); opacity: 0.1; }
    }
  `;
  document.head.appendChild(style);
}

// ─── Bounds Updater ───────────────────────────────────────────────────────────

function BoundsUpdater({ positions }: { positions: LastPosition[] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lon]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
  // only on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ─── Type Labels ─────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<VehicleType, string> = {
  CITY:     "🚌 City Bus",
  HIGHWAY:  "🚛 Express Truck",
  DELIVERY: "🚐 Delivery Van",
  PATROL:   "🚔 Patrol Car",
};

const DRIVE_STATE_LABELS: Record<string, string> = {
  DRIVING: "🟢 Driving",
  IDLE:    "🟡 Idle",
  STOPPED: "🔴 Stopped",
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  positions: LastPosition[];
}

export default function FleetMapInner({ positions }: Props) {
  useEffect(() => { injectPulseStyle(); }, []);

  const center: [number, number] =
    positions.length > 0
      ? [positions[0].lat, positions[0].lon]
      : [-7.265, 112.734];   // Surabaya

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="w-full h-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <BoundsUpdater positions={positions} />

      {positions.map((pos) => (
        <Marker
          key={pos.vehicleId}
          position={[pos.lat, pos.lon]}
          icon={createVehicleIcon(pos)}
        >
          <Popup className="fleet-popup">
            <div className="bg-gray-900 text-white rounded-lg text-sm min-w-[180px]">
              {/* header */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-gray-700">
                <span className="font-bold text-blue-400">{pos.vehicleId}</span>
                <span className="text-xs text-gray-400">
                  {TYPE_LABELS[pos.vehicleType] ?? pos.vehicleType}
                </span>
              </div>
              {/* body */}
              <div className="px-3 py-2 space-y-1.5">
                <Row label="State"   value={DRIVE_STATE_LABELS[pos.driveState] ?? pos.driveState} />
                <Row label="Speed"   value={`${pos.speed.toFixed(1)} km/h`} />
                <Row label="Heading" value={`${pos.heading}°`} />
                <Row label="Lat"     value={pos.lat.toFixed(6)} mono />
                <Row label="Lon"     value={pos.lon.toFixed(6)} mono />
                <Row label="Updated" value={formatDistanceToNow(new Date(pos.updatedAt), { addSuffix: true })} />
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={`text-gray-200 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
