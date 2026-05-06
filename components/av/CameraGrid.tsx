"use client";

import { AvCameraData, CameraChannel, CAMERA_LAYOUT } from "@/types/av-sensor";
import { Camera, CameraOff } from "lucide-react";

interface CameraViewProps {
  camera: AvCameraData | undefined;
  channel: CameraChannel;
  label: string;
}

function CameraView({ camera, channel, label }: CameraViewProps) {
  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-[16/9] border border-gray-700">
      {/* Label */}
      <div className="absolute top-2 left-2 z-10 bg-black/60 px-2 py-1 rounded text-xs font-medium text-white flex items-center gap-1.5">
        <Camera className="w-3 h-3" />
        {label}
      </div>

      {camera ? (
        <>
          {/* Camera image */}
          <img
            src={`data:image/jpeg;base64,${camera.image}`}
            alt={label}
            className="w-full h-full object-cover"
          />
          {/* Frame number */}
          <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 rounded text-xs text-gray-300">
            Frame {camera.frame}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <CameraOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No signal</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface CameraGridProps {
  cameras: Map<CameraChannel, AvCameraData>;
}

export function CameraGrid({ cameras }: CameraGridProps) {
  // Group cameras by row
  const frontCameras = CAMERA_LAYOUT.filter((c) => c.position.startsWith("front"));
  const backCameras = CAMERA_LAYOUT.filter((c) => c.position.startsWith("back"));

  return (
    <div className="space-y-2">
      {/* Front cameras row */}
      <div className="grid grid-cols-3 gap-2">
        {frontCameras.map(({ channel, label }) => (
          <CameraView
            key={channel}
            channel={channel}
            label={label}
            camera={cameras.get(channel)}
          />
        ))}
      </div>

      {/* Back cameras row */}
      <div className="grid grid-cols-3 gap-2">
        {backCameras.map(({ channel, label }) => (
          <CameraView
            key={channel}
            channel={channel}
            label={label}
            camera={cameras.get(channel)}
          />
        ))}
      </div>
    </div>
  );
}
