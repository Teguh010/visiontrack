/**
 * AV Sensor WebSocket Gateway
 * ──────────────────────────────────────────────────────────────────
 * Real-time streaming of autonomous vehicle sensor data via Socket.IO
 *
 * Server → Client events: see AV_EVENTS
 * Client → Server: av:subscribe / av:unsubscribe
 */

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  AvGpsData,
  AvCameraData,
  AvLidarData,
  AvStatusData,
  AvAnnotationsData,
} from './dto/av-sensor.dto';
import { AV_EVENTS, AV_ROOM } from './av-sensor.constants';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  namespace: '/av',
})
export class AvSensorGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AvSensorGateway.name);

  afterInit() {
    this.logger.log(
      '🚗 AV Sensor WebSocket Gateway initialized (namespace: /av)',
    );
  }

  handleConnection(client: Socket) {
    this.logger.debug(`🔌 Client connected to /av: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    if (client.rooms.has(AV_ROOM)) {
      this.logger.log(
        `📡 AV subscriber disconnected: ${client.id} (room size: ${this.getRoomSize()})`,
      );
    }
  }

  private getRoomSize(): number {
    return this.server?.sockets?.adapter?.rooms?.get(AV_ROOM)?.size ?? 0;
  }

  /**
   * Client subscribes to AV sensor stream.
   * Only clients in the room will receive sensor data.
   */
  @SubscribeMessage(AV_EVENTS.subscribe)
  handleSubscribe(@ConnectedSocket() client: Socket) {
    void client.join(AV_ROOM);
    this.logger.log(
      `📡 Client ${client.id} subscribed to AV stream (room size: ${this.getRoomSize()})`,
    );
    return { event: AV_EVENTS.subscribed, success: true };
  }

  /**
   * Client unsubscribes from AV sensor stream.
   */
  @SubscribeMessage(AV_EVENTS.unsubscribe)
  handleUnsubscribe(@ConnectedSocket() client: Socket) {
    void client.leave(AV_ROOM);
    this.logger.log(
      `📡 Client ${client.id} unsubscribed from AV stream (room size: ${this.getRoomSize()})`,
    );
    return { event: AV_EVENTS.unsubscribed, success: true };
  }

  /**
   * Whether any client is in the AV stream room (derived from adapter; no manual counter).
   */
  hasSubscribers(): boolean {
    return this.getRoomSize() > 0;
  }

  // ─── Emit methods (called by AvSensorService) ────────────────────────────────

  emitGps(data: AvGpsData): void {
    this.server.to(AV_ROOM).emit(AV_EVENTS.gps, data);
  }

  emitCamera(data: AvCameraData): void {
    this.server.to(AV_ROOM).emit(AV_EVENTS.camera, data);
  }

  emitLidar(data: AvLidarData): void {
    this.server.to(AV_ROOM).emit(AV_EVENTS.lidar, data);
  }

  emitStatus(data: AvStatusData): void {
    this.server.to(AV_ROOM).emit(AV_EVENTS.status, data);
  }

  emitAnnotations(data: AvAnnotationsData): void {
    this.server.to(AV_ROOM).emit(AV_EVENTS.annotations, data);
  }
}
