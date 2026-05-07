import { OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TrackingService } from "./tracking.service";
export declare class TrackingMqtt implements OnModuleInit, OnModuleDestroy {
    private readonly config;
    private readonly trackingService;
    private readonly logger;
    private client;
    constructor(config: ConfigService, trackingService: TrackingService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private handleMessage;
    private normalizeCoord;
}
