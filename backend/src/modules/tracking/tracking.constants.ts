/**
 * Shared tracking constants — Socket.IO rooms and events.
 */

export const FLEET_ROOM = 'fleet:all';

export const TRACKING_EVENTS = {
  vehicleUpdate: 'vehicle:update',
  vehicleStopped: 'vehicle:stopped',
  subscribeFleet: 'subscribe:fleet',
  subscribeVehicle: 'subscribe:vehicle',
  subscribedFleet: 'subscribed:fleet',
  subscribedVehicle: 'subscribed',
} as const;

export function vehicleRoom(vehicleId: string): string {
  return `vehicle:${vehicleId}`;
}
