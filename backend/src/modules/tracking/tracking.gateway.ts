/**
 * Tracking WebSocket Gateway
 * ──────────────────────────────────────────────────────────────────
 * Uses Socket.IO for bidirectional communication.
 *
 * Server → Client events:
 *   "vehicle:update"   — new position for a specific vehicle
 *   "vehicle:stopped"  — vehicle transitioned to STOPPED state
 *
 * Client → Server events:
 *   "subscribe:fleet"   — join fleet:all room (fleet map dashboard)
 *   "subscribe:vehicle" — join vehicle:{id} room (single-vehicle view)
 */

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { LastPosition } from './tracking.service';
import {
  FLEET_ROOM,
  TRACKING_EVENTS,
  vehicleRoom,
} from './tracking.constants';

export interface VehicleStoppedPayload {
  vehicleId: string;
  lat: number;
  lon: number;
  stoppedAt: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class TrackingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);
  private connectedClients = 0;

  afterInit() {
    this.logger.log('📡 WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.connectedClients++;
    this.logger.log(
      `🔌 Client connected: ${client.id} (total: ${this.connectedClients})`,
    );
  }

  handleDisconnect(client: Socket) {
    this.connectedClients--;
    this.logger.log(
      `🔌 Client disconnected: ${client.id} (total: ${this.connectedClients})`,
    );
  }

  /**
   * Emit vehicle position update to fleet room and per-vehicle room subscribers.
   * Called by TrackingService after processing a new MQTT message.
   */
  emitVehicleUpdate(position: LastPosition): void {
    const room = vehicleRoom(position.vehicleId);
    this.server.to(FLEET_ROOM).emit(TRACKING_EVENTS.vehicleUpdate, position);
    this.server.to(room).emit(TRACKING_EVENTS.vehicleUpdate, position);
  }

  /**
   * Emit stop detection alert when a vehicle transitions to STOPPED.
   */
  emitVehicleStopped(
    vehicleId: string,
    lat: number,
    lon: number,
  ): void {
    const payload: VehicleStoppedPayload = {
      vehicleId,
      lat,
      lon,
      stoppedAt: new Date().toISOString(),
    };
    const room = vehicleRoom(vehicleId);
    this.server.to(FLEET_ROOM).emit(TRACKING_EVENTS.vehicleStopped, payload);
    this.server.to(room).emit(TRACKING_EVENTS.vehicleStopped, payload);
  }

  /**
   * Client joins the fleet-wide room to receive all vehicle updates.
   */
  @SubscribeMessage(TRACKING_EVENTS.subscribeFleet)
  handleSubscribeFleet(@ConnectedSocket() client: Socket) {
    void client.join(FLEET_ROOM);
    this.logger.log(
      `📍 Client ${client.id} subscribed to fleet room (size: ${this.getRoomSize(FLEET_ROOM)})`,
    );
    return { event: TRACKING_EVENTS.subscribedFleet, success: true };
  }

  /**
   * Client subscribes to a specific vehicle only.
   */
  @SubscribeMessage(TRACKING_EVENTS.subscribeVehicle)
  handleSubscribeVehicle(
    @MessageBody() vehicleId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const room = vehicleRoom(vehicleId);
    void client.join(room);
    this.logger.log(
      `📍 Client ${client.id} subscribed to vehicle: ${vehicleId} (room size: ${this.getRoomSize(room)})`,
    );
    return { event: TRACKING_EVENTS.subscribedVehicle, vehicleId };
  }

  private getRoomSize(room: string): number {
    return this.server?.sockets?.adapter?.rooms?.get(room)?.size ?? 0;
  }
}
