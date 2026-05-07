"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  AvGpsData,
  AvCameraData,
  AvLidarData,
  AvStatusData,
  AvAnnotationsData,
  CameraChannel,
} from "@/types/av-sensor";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000";

export interface AvSensorState {
  gps: AvGpsData | null;
  cameras: Map<CameraChannel, AvCameraData>;
  lidar: AvLidarData | null;
  status: AvStatusData | null;
  annotations: AvAnnotationsData | null;
  connected: boolean;
}

export function useAvSensorSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gps, setGps] = useState<AvGpsData | null>(null);
  const [cameras, setCameras] = useState<Map<CameraChannel, AvCameraData>>(new Map());
  const [lidar, setLidar] = useState<AvLidarData | null>(null);
  const [status, setStatus] = useState<AvStatusData | null>(null);
  const [annotations, setAnnotations] = useState<AvAnnotationsData | null>(null);

  useEffect(() => {
    // Connect to the /av namespace
    const socket = io(`${WS_URL}/av`, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ AV WebSocket connected:", socket.id);
      setConnected(true);

      // Subscribe to AV sensor stream
      socket.emit("av:subscribe");
    });

    socket.on("disconnect", () => {
      console.log("🔌 AV WebSocket disconnected");
      setConnected(false);
    });

    // GPS updates
    socket.on("av:gps", (data: AvGpsData) => {
      setGps(data);
    });

    // Camera updates
    socket.on("av:camera", (data: AvCameraData) => {
      setCameras((prev) => {
        const next = new Map(prev);
        next.set(data.camera, data);
        return next;
      });
    });

    // LiDAR updates
    socket.on("av:lidar", (data: AvLidarData) => {
      setLidar(data);
    });

    // Status updates
    socket.on("av:status", (data: AvStatusData) => {
      setStatus(data);
    });

    // Annotations updates (3D bounding boxes)
    socket.on("av:annotations", (data: AvAnnotationsData) => {
      setAnnotations(data);
    });

    return () => {
      socket.emit("av:unsubscribe");
      socket.disconnect();
    };
  }, []);

  // Get camera by channel
  const getCamera = useCallback(
    (channel: CameraChannel): AvCameraData | undefined => {
      return cameras.get(channel);
    },
    [cameras],
  );

  return {
    connected,
    gps,
    cameras,
    lidar,
    status,
    annotations,
    getCamera,
  };
}
