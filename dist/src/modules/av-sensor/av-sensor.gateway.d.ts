import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { AvGpsData, AvCameraData, AvLidarData, AvStatusData } from "./dto/av-sensor.dto";
export declare class AvSensorGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private readonly logger;
    private subscriberCount;
    afterInit(): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleSubscribe(client: Socket): {
        event: string;
        success: boolean;
    };
    handleUnsubscribe(client: Socket): {
        event: string;
        success: boolean;
    };
    hasSubscribers(): boolean;
    emitGps(data: AvGpsData): void;
    emitCamera(data: AvCameraData): void;
    emitLidar(data: AvLidarData): void;
    emitStatus(data: AvStatusData): void;
}
