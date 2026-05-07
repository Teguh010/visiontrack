import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
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
export declare class TrackingService implements OnModuleInit, OnModuleDestroy {
    private readonly prisma;
    private readonly redis;
    private readonly gateway;
    private readonly logger;
    private writeBuffer;
    private flushTimer;
    constructor(prisma: PrismaService, redis: RedisService, gateway: TrackingGateway);
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    processLocation(data: ProcessedLocation): Promise<void>;
    private detectStatus;
    private bufferTrackingPoint;
    private flushBuffer;
    private ensureVehicleExists;
    private defaultName;
    getLatestPositions(): Promise<LastPosition[]>;
    getHistory(vehicleId: string, from: Date, to: Date): Promise<unknown[]>;
}
