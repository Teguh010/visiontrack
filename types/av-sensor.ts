/**
 * AV Sensor TypeScript types
 * Used for autonomous vehicle sensor data from nuScenes
 */

// ─── GPS Data ────────────────────────────────────────────────────────────────

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

export interface AvCameraData {
  camera: CameraChannel;
  image: string;  // base64 encoded
  timestamp: number;
  frame: number;
  updatedAt: string;
}

// ─── LiDAR Data ──────────────────────────────────────────────────────────────

/** LiDAR point: [x, y, z, intensity] */
export type LidarPoint = [number, number, number, number];

export interface AvLidarData {
  points: LidarPoint[];
  pointCount: number;
  timestamp: number;
  frame: number;
  updatedAt: string;
}

// ─── Status Data ─────────────────────────────────────────────────────────────

export type ReplayStatus = 'playing' | 'paused' | 'finished' | 'idle';

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
}

// ─── Camera Layout Info ──────────────────────────────────────────────────────

export interface CameraLayoutInfo {
  channel: CameraChannel;
  label: string;
  position: 'front' | 'front-left' | 'front-right' | 'back' | 'back-left' | 'back-right';
}

export const CAMERA_LAYOUT: CameraLayoutInfo[] = [
  { channel: 'CAM_FRONT_LEFT',  label: 'Front Left',  position: 'front-left' },
  { channel: 'CAM_FRONT',       label: 'Front',       position: 'front' },
  { channel: 'CAM_FRONT_RIGHT', label: 'Front Right', position: 'front-right' },
  { channel: 'CAM_BACK_LEFT',   label: 'Back Left',   position: 'back-left' },
  { channel: 'CAM_BACK',        label: 'Back',        position: 'back' },
  { channel: 'CAM_BACK_RIGHT',  label: 'Back Right',  position: 'back-right' },
];
