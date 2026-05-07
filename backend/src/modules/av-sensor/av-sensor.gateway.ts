/**
 * AV Sensor WebSocket Gateway
 * ──────────────────────────────────────────────────────────────────
 * Real-time streaming of autonomous vehicle sensor data via Socket.IO
 *
 * Server → Client events:
 *   "av:gps"      — GPS/ego pose update
 *   "av:camera"   — Camera frame (base64)
 *   "av:lidar"    — LiDAR point cloud
 *   "av:status"   — Replay status
 *
 * Client → Server events:
 *   "av:subscribe"   — Subscribe to AV sensor stream
 *   "av:unsubscribe" — Unsubscribe from AV sensor stream
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

const AV_ROOM = 'av-sensor-stream';

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
  private subscriberCount = 0;

  afterInit() {
    this.logger.log(
      '🚗 AV Sensor WebSocket Gateway initialized (namespace: /av)',
    );
  }

  handleConnection(client: Socket) {
    this.logger.debug(`🔌 Client connected to /av: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // Check if client was in the AV room
    if (client.rooms.has(AV_ROOM)) {
      this.subscriberCount--;
      this.logger.log(
        `📡 AV subscriber disconnected: ${client.id} (total: ${this.subscriberCount})`,
      );
    }
  }

  /**
   * Client subscribes to AV sensor stream.
   * Only clients in the room will receive sensor data.
   */
  @SubscribeMessage('av:subscribe')
  handleSubscribe(@ConnectedSocket() client: Socket) {
    void client.join(AV_ROOM);
    this.subscriberCount++;
    this.logger.log(
      `📡 Client ${client.id} subscribed to AV stream (total: ${this.subscriberCount})`,
    );
    return { event: 'av:subscribed', success: true };
  }

  /**
   * Client unsubscribes from AV sensor stream.
   */
  @SubscribeMessage('av:unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket) {
    void client.leave(AV_ROOM);
    this.subscriberCount--;
    this.logger.log(
      `📡 Client ${client.id} unsubscribed from AV stream (total: ${this.subscriberCount})`,
    );
    return { event: 'av:unsubscribed', success: true };
  }

  /**
   * Check if there are any active subscribers.
   * Used to skip processing if no one is listening.
   */
  hasSubscribers(): boolean {
    return this.subscriberCount > 0;
  }

  // ─── Emit methods (called by AvSensorService) ────────────────────────────────

  emitGps(data: AvGpsData): void {
    this.server.to(AV_ROOM).emit('av:gps', data);
  }

  emitCamera(data: AvCameraData): void {
    this.server.to(AV_ROOM).emit('av:camera', data);
  }

  emitLidar(data: AvLidarData): void {
    this.server.to(AV_ROOM).emit('av:lidar', data);
  }

  emitStatus(data: AvStatusData): void {
    this.server.to(AV_ROOM).emit('av:status', data);
  }

  emitAnnotations(data: AvAnnotationsData): void {
    this.server.to(AV_ROOM).emit('av:annotations', data);
  }
}
