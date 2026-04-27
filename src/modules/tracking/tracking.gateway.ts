/**
 * Tracking WebSocket Gateway
 * ──────────────────────────────────────────────────────────────────
 * Uses Socket.IO for bidirectional communication.
 *
 * Server → Client events:
 *   "vehicle:update"  — new position for a specific vehicle
 *
 * Client → Server events:
 *   "subscribe"       — (optional) filter by vehicleId
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
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { LastPosition } from "./tracking.service";

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
})
export class TrackingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);
  private connectedClients = 0;

  afterInit() {
    this.logger.log("📡 WebSocket Gateway initialized");
  }

  handleConnection(client: Socket) {
    this.connectedClients++;
    this.logger.log(`🔌 Client connected: ${client.id} (total: ${this.connectedClients})`);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients--;
    this.logger.log(`🔌 Client disconnected: ${client.id} (total: ${this.connectedClients})`);
  }

  /**
   * Emit vehicle position update to ALL connected clients.
   * Called by TrackingService after processing a new MQTT message.
   */
  emitVehicleUpdate(position: LastPosition): void {
    this.server.emit("vehicle:update", position);
  }

  /**
   * Optional: allow clients to subscribe to a specific vehicle only.
   * They'll join a Socket.IO room named after the vehicleId.
   */
  @SubscribeMessage("subscribe:vehicle")
  handleSubscribeVehicle(
    @MessageBody() vehicleId: string,
    @ConnectedSocket() client: Socket,
  ) {
    void client.join(`vehicle:${vehicleId}`);
    this.logger.log(`📍 Client ${client.id} subscribed to vehicle: ${vehicleId}`);
    return { event: "subscribed", vehicleId };
  }
}
