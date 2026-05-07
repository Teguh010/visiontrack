"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TrackingPoint } from "@/types/tracking";
import { format } from "date-fns";

// Fix Leaflet icons
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const startIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid white;box-shadow:0 0 8px #22c55e"></div>`,
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const endIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 0 8px #ef4444"></div>`,
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const stopIcon = L.divIcon({
  html: `<div style="width:10px;height:10px;border-radius:50%;background:#f97316;border:2px solid white;opacity:0.9"></div>`,
  className: "",
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

function BoundsUpdater({ points }: { points: TrackingPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [Number(p.lat), Number(p.lon)]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
}

interface Props {
  points: TrackingPoint[];
}

export default function HistoryMapInner({ points }: Props) {
  if (points.length === 0) return null;

  const latlngs: [number, number][] = points.map((p) => [Number(p.lat), Number(p.lon)]);
  const stopPoints = points.filter((p) => p.status === "STOPPED");
  const first = points[0];
  const last  = points[points.length - 1];

  return (
    <MapContainer
      center={[Number(first.lat), Number(first.lon)]}
      zoom={14}
      className="w-full h-full rounded-xl"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <BoundsUpdater points={points} />

      {/* Main trajectory polyline */}
      <Polyline
        positions={latlngs}
        color="#3b82f6"
        weight={3}
        opacity={0.85}
      />

      {/* Start marker */}
      <Marker position={[Number(first.lat), Number(first.lon)]} icon={startIcon}>
        <Popup>
          <div className="text-sm text-white">
            <strong>🟢 Start</strong><br />
            <span className="text-gray-300">{format(new Date(first.timestamp), "HH:mm:ss")}</span><br />
            Speed: {Number(first.speed).toFixed(1)} km/h
          </div>
        </Popup>
      </Marker>

      {/* End marker */}
      <Marker position={[Number(last.lat), Number(last.lon)]} icon={endIcon}>
        <Popup>
          <div className="text-sm text-white">
            <strong>🔴 End</strong><br />
            <span className="text-gray-300">{format(new Date(last.timestamp), "HH:mm:ss")}</span><br />
            Speed: {Number(last.speed).toFixed(1)} km/h
          </div>
        </Popup>
      </Marker>

      {/* Stop event markers */}
      {stopPoints.map((p) => (
        <Marker
          key={p.id}
          position={[Number(p.lat), Number(p.lon)]}
          icon={stopIcon}
        >
          <Popup>
            <div className="text-sm text-white">
              <strong>🟠 Stopped</strong><br />
              <span className="text-gray-300">{format(new Date(p.timestamp), "HH:mm:ss")}</span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
