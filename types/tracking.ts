/**
 * Shared TypeScript types used across the frontend
 */

export type VehicleStatus = "MOVING" | "STOPPED";
export type VehicleType   = "CITY" | "HIGHWAY" | "DELIVERY" | "PATROL";
export type DriveState    = "DRIVING" | "IDLE" | "STOPPED";

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  vehicleType: VehicleType;
  createdAt: string;
}

export interface LastPosition {
  vehicleId: string;
  vehicleType: VehicleType;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  driveState: DriveState;
  status: VehicleStatus;
  updatedAt: string;
}

export interface TrackingPoint {
  id: number;
  lat: string | number;
  lon: string | number;
  speed: string | number;
  heading: string | number;
  status: VehicleStatus;
  timestamp: string;
}

export interface HistoryResponse {
  vehicleId: string;
  from: string;
  to: string;
  count: number;
  data: TrackingPoint[];
}
