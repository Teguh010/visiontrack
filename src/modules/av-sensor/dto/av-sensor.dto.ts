/**
 * AV Sensor Data DTOs
 * ──────────────────────────────────────────────────────────────────
 * Data types for autonomous vehicle sensor data from nuScenes replayer
 */

// ─── GPS Data ────────────────────────────────────────────────────────────────

export interface AvGpsPayload {
  lat: number;
  lon: number;
  altitude: number;
  heading: number;
  speed_kph: number;
  timestamp: number;
  frame: number;
  scene: string;
  location: string;
  // Raw coordinates in meters (for nuScenes map rendering)
  x?: number;
  y?: number;
}

export interface AvGpsData {
  lat: number;
  lon: number;
  altitude: number;
  heading: number;
  speedKph: number;
  timestamp: number;
  frame: number;
  scene: string;
  location: string;
  // Raw coordinates in meters (for nuScenes map rendering)
  x: number;
  y: number;
  updatedAt: string;
}

// ─── Camera Data ─────────────────────────────────────────────────────────────

export type CameraChannel = 
  | 'CAM_FRONT'
  | 'CAM_FRONT_LEFT'
  | 'CAM_FRONT_RIGHT'
  | 'CAM_BACK'
  | 'CAM_BACK_LEFT'
  | 'CAM_BACK_RIGHT';

export interface AvCameraPayload {
  camera: CameraChannel;
  image: string;  // base64 encoded
  timestamp: number;
  frame: number;
}

export interface AvCameraData {
  camera: CameraChannel;
  image: string;
  timestamp: number;
  frame: number;
  updatedAt: string;
}

// ─── LiDAR Data ──────────────────────────────────────────────────────────────

/** LiDAR point: [x, y, z, intensity] */
export type LidarPoint = [number, number, number, number];

export interface AvLidarPayload {
  points: LidarPoint[];
  timestamp: number;
  frame: number;
}

export interface AvLidarData {
  points: LidarPoint[];
  pointCount: number;
  timestamp: number;
  frame: number;
  updatedAt: string;
}

// ─── Status Data ─────────────────────────────────────────────────────────────

export type ReplayStatus = 'playing' | 'paused' | 'finished' | 'idle';

export interface AvStatusPayload {
  scene: string;
  frame: number;
  total: number;
  pct: number;
  timestamp?: number;
  status: ReplayStatus;
}

export interface AvStatusData {
  scene: string;
  frame: number;
  totalFrames: number;
  progressPct: number;
  status: ReplayStatus;
  updatedAt: string;
}

// ─── Combined AV State ───────────────────────────────────────────────────────

export interface AvVehicleState {
  gps: AvGpsData | null;
  cameras: Partial<Record<CameraChannel, AvCameraData>>;
  lidar: AvLidarData | null;
  status: AvStatusData | null;
  annotations: AvAnnotationsData | null;
}

// ─── Annotation Data (3D Bounding Boxes) ─────────────────────────────────────

export type ObjectCategory = 
  | 'human'
  | 'vehicle.car'
  | 'vehicle.truck'
  | 'vehicle.bus'
  | 'vehicle.motorcycle'
  | 'vehicle.bicycle'
  | 'movable_object';

export type ObjectAttribute = 
  | 'vehicle.moving'
  | 'vehicle.stopped'
  | 'vehicle.parked'
  | 'cycle.with_rider'
  | 'cycle.without_rider'
  | 'pedestrian.sitting_lying_down'
  | 'pedestrian.standing'
  | 'pedestrian.moving';

export interface AvAnnotation {
  id: string;
  category: ObjectCategory;
  categoryFull: string;
  attributes: ObjectAttribute[];
  // Position relative to ego vehicle (meters)
  x: number;
  y: number;
  z: number;
  // Bounding box dimensions (meters)
  width: number;
  length: number;
  height: number;
  // Rotation relative to ego (degrees)
  yaw: number;
  // Distance from ego (meters)
  distance: number;
  // Visualization color
  color: string;
  // Number of LiDAR points in this object
  numLidarPts: number;
}

export interface AvAnnotationsPayload {
  annotations: {
    id: string;
    category: string;
    category_full: string;
    attributes: string[];
    x: number;
    y: number;
    z: number;
    width: number;
    length: number;
    height: number;
    yaw: number;
    distance: number;
    color: string;
    num_lidar_pts: number;
  }[];
  timestamp: number;
  frame: number;
  count: number;
}

export interface AvAnnotationsData {
  annotations: AvAnnotation[];
  timestamp: number;
  frame: number;
  count: number;
  updatedAt: string;
}
