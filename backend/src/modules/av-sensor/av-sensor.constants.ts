/**
 * Shared AV sensor constants — MQTT topics, Socket.IO room/events, camera list.
 */

export const AV_ROOM = 'av-sensor-stream';

export const AV_EVENTS = {
  gps: 'av:gps',
  camera: 'av:camera',
  lidar: 'av:lidar',
  status: 'av:status',
  annotations: 'av:annotations',
  subscribe: 'av:subscribe',
  unsubscribe: 'av:unsubscribe',
  subscribed: 'av:subscribed',
  unsubscribed: 'av:unsubscribed',
} as const;

export const AV_TOPICS = {
  gps: 'vehicle/gps',
  cameraWildcard: 'vehicle/camera/+',
  lidar: 'vehicle/lidar',
  status: 'vehicle/status',
  annotations: 'vehicle/annotations',
} as const;

export const CAMERA_CHANNELS = [
  'CAM_FRONT',
  'CAM_FRONT_LEFT',
  'CAM_FRONT_RIGHT',
  'CAM_BACK',
  'CAM_BACK_LEFT',
  'CAM_BACK_RIGHT',
] as const;

export type CameraChannel = (typeof CAMERA_CHANNELS)[number];
