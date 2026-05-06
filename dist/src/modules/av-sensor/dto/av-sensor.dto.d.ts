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
    x: number;
    y: number;
    updatedAt: string;
}
export type CameraChannel = 'CAM_FRONT' | 'CAM_FRONT_LEFT' | 'CAM_FRONT_RIGHT' | 'CAM_BACK' | 'CAM_BACK_LEFT' | 'CAM_BACK_RIGHT';
export interface AvCameraPayload {
    camera: CameraChannel;
    image: string;
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
export interface AvVehicleState {
    gps: AvGpsData | null;
    cameras: Partial<Record<CameraChannel, AvCameraData>>;
    lidar: AvLidarData | null;
    status: AvStatusData | null;
}
