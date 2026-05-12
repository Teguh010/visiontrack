/**
 * Socket.IO event names for `/av` namespace — keep in sync with backend
 * {@link backend/src/modules/av-sensor/av-sensor.constants.ts AV_EVENTS}.
 */
export const AV_EVENTS = {
  gps: 'av:gps',
  camera: 'av:camera',
  lidar: 'av:lidar',
  status: 'av:status',
  annotations: 'av:annotations',
  subscribe: 'av:subscribe',
  unsubscribe: 'av:unsubscribe',
} as const;
