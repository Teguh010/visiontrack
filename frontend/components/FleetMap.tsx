/**
 * Live Fleet Map — Dynamic import (Leaflet doesn't support SSR)
 */
"use client";

import dynamic from "next/dynamic";
import { LastPosition } from "@/types/tracking";

const FleetMapInner = dynamic(() => import("./FleetMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-xl">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Loading map...</p>
      </div>
    </div>
  ),
});

interface FleetMapProps {
  positions: LastPosition[];
}

export function FleetMap({ positions }: FleetMapProps) {
  return <FleetMapInner positions={positions} />;
}
