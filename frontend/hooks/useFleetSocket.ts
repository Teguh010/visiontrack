"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { LastPosition } from "@/types/tracking";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000";

export function useFleetSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [positions, setPositions] = useState<Map<string, LastPosition>>(new Map());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(WS_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ WebSocket connected:", socket.id);
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("🔌 WebSocket disconnected");
      setConnected(false);
    });

    socket.on("vehicle:update", (position: LastPosition) => {
      setPositions((prev) => {
        const next = new Map(prev);
        next.set(position.vehicleId, position);
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const vehicleList = Array.from(positions.values());

  return { positions, vehicleList, connected };
}
