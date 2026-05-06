import { OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AvSensorService } from "./av-sensor.service";
import { AvSensorGateway } from "./av-sensor.gateway";
export declare class AvSensorMqtt implements OnModuleInit, OnModuleDestroy {
    private readonly config;
    private readonly avSensorService;
    private readonly avSensorGateway;
    private readonly logger;
    private client;
    constructor(config: ConfigService, avSensorService: AvSensorService, avSensorGateway: AvSensorGateway);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private handleMessage;
    private handleGps;
    private handleCamera;
    private handleLidar;
    private handleStatus;
}
