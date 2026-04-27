export interface MqttPayload {
  vehicleId?: string;
  lat: number;
  lon: number;
  speed: number;
  heading?: number;
  timestamp?: number;
}

export interface ProcessedLocation {
  vehicleId: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  timestamp: Date;
}
