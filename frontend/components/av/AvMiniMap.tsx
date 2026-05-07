"use client";

import dynamic from "next/dynamic";
import { AvGpsData } from "@/types/av-sensor";

// Dynamic import to avoid SSR issues with Leaflet
const AvMiniMapInner = dynamic(() => import("./AvMiniMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
      <div className="text-gray-500 text-sm">Loading map...</div>
    </div>
  ),
});

interface AvMiniMapProps {
  gps: AvGpsData | null;
  height?: number;
}

export function AvMiniMap({ gps, height = 200 }: AvMiniMapProps) {
  return (
    <div
      className="rounded-lg overflow-hidden border border-gray-700"
      style={{ height }}
    >
      <AvMiniMapInner gps={gps} />
    </div>
  );
}
