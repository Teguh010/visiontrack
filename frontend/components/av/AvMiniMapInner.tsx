"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AvGpsData } from "@/types/av-sensor";

// ─── AV Vehicle Icon (autonomous car, top-down view) ─────────────────────────

function getAvCarIcon(heading: number): L.DivIcon {
  // Convert nuScenes heading (0=East, 90=North) to CSS rotation (0=North)
  // CSS rotation: 0=up, positive=clockwise
  // nuScenes: 0=East (right), 90=North (up)
  // So: cssRotation = 90 - heading
  const rotation = 90 - heading;
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="44" viewBox="0 0 28 44" style="transform: rotate(${rotation}deg); transform-origin: center;">
      <!-- glow -->
      <ellipse cx="14" cy="22" rx="13" ry="21" fill="#10b981" opacity="0.4" filter="url(#blur)"/>
      <!-- body -->
      <rect x="3" y="5" width="22" height="34" rx="4" fill="#10b981"/>
      <!-- windshield -->
      <rect x="5" y="6" width="18" height="10" rx="2" fill="rgba(255,255,255,0.6)"/>
      <!-- rear window -->
      <rect x="5" y="32" width="18" height="6" rx="2" fill="rgba(255,255,255,0.4)"/>
      <!-- sensor bar on roof -->
      <rect x="8" y="17" width="12" height="3" rx="1" fill="#0f172a"/>
      <circle cx="14" cy="18.5" r="1.5" fill="#fbbf24"/>
      <!-- side sensors -->
      <circle cx="4"  cy="22" r="1.5" fill="#3b82f6"/>
      <circle cx="24" cy="22" r="1.5" fill="#3b82f6"/>
      <!-- front bumper / direction indicator -->
      <rect x="5" y="3" width="18" height="3" rx="1.5" fill="rgba(255,255,255,0.9)"/>
      <!-- headlights -->
      <rect x="5"  y="4" width="5" height="2" rx="1" fill="#fde68a" opacity="0.9"/>
      <rect x="18" y="4" width="5" height="2" rx="1" fill="#fde68a" opacity="0.9"/>
      <!-- wheels -->
      <rect x="0"  y="8"  width="4" height="8" rx="1" fill="#0f172a"/>
      <rect x="24" y="8"  width="4" height="8" rx="1" fill="#0f172a"/>
      <rect x="0"  y="28" width="4" height="8" rx="1" fill="#0f172a"/>
      <rect x="24" y="28" width="4" height="8" rx="1" fill="#0f172a"/>
      <defs><filter id="blur"><feGaussianBlur stdDeviation="3"/></filter></defs>
    </svg>
  `;

  return L.divIcon({
    className: "av-car-marker",
    html: svg,
    iconSize: [28, 44],
    iconAnchor: [14, 22],
    popupAnchor: [0, -22],
  });
}

// ─── Map Panner (follows the AV position) ────────────────────────────────────

interface MapPannerProps {
  position: [number, number] | null;
}

function MapPanner({ position }: MapPannerProps) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [position, map]);

  return null;
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface AvMiniMapInnerProps {
  gps: AvGpsData | null;
}

export default function AvMiniMapInner({ gps }: AvMiniMapInnerProps) {
  // Default center: Boston (nuScenes location)
  const defaultCenter: [number, number] = [42.3368, -71.0579];
  const position: [number, number] | null = gps
    ? [gps.lat, gps.lon]
    : null;

  return (
    <MapContainer
      center={position ?? defaultCenter}
      zoom={17}
      style={{ width: "100%", height: "100%" }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        maxZoom={20}
      />

      {position && (
        <>
          <MapPanner position={position} />
          <Marker
            position={position}
            icon={getAvCarIcon(gps?.heading ?? 0)}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold">AV Ego Vehicle</p>
                <p>Scene: {gps?.scene}</p>
                <p>Speed: {gps?.speedKph?.toFixed(1)} km/h</p>
                <p>Heading: {gps?.heading?.toFixed(1)}°</p>
              </div>
            </Popup>
          </Marker>
        </>
      )}
    </MapContainer>
  );
}
