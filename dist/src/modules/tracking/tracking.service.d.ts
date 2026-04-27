import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { ProcessedLocation } from "./dto/mqtt-payload.dto";
import { TrackingGateway } from "./tracking.gateway";
export interface LastPosition {
    vehicleId: string;
    vehicleType: string;
    lat: number;
    lon: number;
    speed: number;
    heading: number;
    driveState: string;
    status: "MOVING" | "STOPPED";
    updatedAt: string;
}
export declare class TrackingService {
    private readonly prisma;
    private readonly redis;
    private readonly gateway;
    private readonly logger;
    private readonly stopStates;
    constructor(prisma: PrismaService, redis: RedisService, gateway: TrackingGateway);
    processLocation(data: ProcessedLocation): Promise<void>;
    private detectStatus;
    private saveToDatabase;
    private ensureVehicleExists;
    private defaultName;
    getLatestPositions(): Promise<LastPosition[]>;
    getHistory(vehicleId: string, from: Date, to: Date): Promise<unknown[]>;
}
