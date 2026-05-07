import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { LastPosition } from "./tracking.service";
export declare class TrackingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private readonly logger;
    private connectedClients;
    afterInit(): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    emitVehicleUpdate(position: LastPosition): void;
    handleSubscribeVehicle(vehicleId: string, client: Socket): {
        event: string;
        vehicleId: string;
    };
}
