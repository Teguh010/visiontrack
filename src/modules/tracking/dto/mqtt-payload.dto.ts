export interface MqttPayload {
  vehicleId?: string;
  vehicleType?: string;   // CITY | HIGHWAY | DELIVERY | PATROL
  lat: number;
  lon: number;
  speed: number;
  heading?: number;
  driveState?: string;    // DRIVING | IDLE | STOPPED
  timestamp?: number;
}

export interface ProcessedLocation {
  vehicleId: string;
  vehicleType: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  driveState: string;
  timestamp: Date;
}
