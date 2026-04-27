"use client";

import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LastPosition } from "@/types/tracking";
import { formatDistanceToNow } from "date-fns";

// ── Fix Leaflet default icon (broken in Next.js) ──────────────────────────────
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Custom colored marker icon ────────────────────────────────────────────────
function createVehicleIcon(status: "MOVING" | "STOPPED") {
  const color = status === "MOVING" ? "#22c55e" : "#ef4444";
  const pulse = status === "MOVING"
    ? `<circle cx="12" cy="12" r="10" fill="${color}" opacity="0.2"><animate attributeName="r" from="8" to="14" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite"/></circle>`
    : "";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      ${pulse}
      <path d="M16 0C9.4 0 4 5.4 4 12c0 9 12 28 12 28s12-19 12-28C28 5.4 22.6 0 16 0z"
            fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="16" cy="12" r="5" fill="white" opacity="0.9"/>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -42],
  });
}

// ── Auto-fit bounds when positions change ─────────────────────────────────────
function BoundsUpdater({ positions }: { positions: LastPosition[] }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (positions.length > 0 && !fittedRef.current) {
      const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lon]));
      map.fitBounds(bounds, { padding: [60, 60] });
      fittedRef.current = true;
    }
  }, [positions, map]);

  return null;
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  positions: LastPosition[];
}

export default function FleetMapInner({ positions }: Props) {
  // Default center: Surabaya, Indonesia
  const center: [number, number] = [-7.28, 112.72];

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="w-full h-full rounded-xl"
      zoomControl={false}
    >
      {/* Dark map tiles */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <BoundsUpdater positions={positions} />

      {positions.map((pos) => (
        <Marker
          key={pos.vehicleId}
          position={[pos.lat, pos.lon]}
          icon={createVehicleIcon(pos.status)}
        >
          <Popup>
            <div className="text-sm space-y-1 min-w-[160px]">
              <p className="font-bold text-white text-base">{pos.vehicleId}</p>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    pos.status === "MOVING" ? "bg-green-400" : "bg-red-400"
                  }`}
                />
                <span
                  className={
                    pos.status === "MOVING" ? "text-green-400" : "text-red-400"
                  }
                >
                  {pos.status}
                </span>
              </div>
              <p className="text-gray-300">
                🚗 Speed:{" "}
                <span className="text-white font-medium">
                  {Number(pos.speed).toFixed(1)} km/h
                </span>
              </p>
              <p className="text-gray-300">
                🧭 Heading:{" "}
                <span className="text-white font-medium">{pos.heading}°</span>
              </p>
              <p className="text-gray-300">
                📍 {pos.lat.toFixed(5)}, {pos.lon.toFixed(5)}
              </p>
              <p className="text-gray-500 text-xs pt-1">
                Updated{" "}
                {formatDistanceToNow(new Date(pos.updatedAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
