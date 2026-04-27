"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TrackingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const redis_service_1 = require("../../redis/redis.service");
const tracking_gateway_1 = require("./tracking.gateway");
const STOP_SPEED_THRESHOLD_KMH = 5;
const STOP_DURATION_MS = 2 * 60 * 1000;
const REDIS_TTL_SECONDS = 60 * 60 * 24;
const REDIS_KEY_PREFIX = "vehicle:last:";
let TrackingService = TrackingService_1 = class TrackingService {
    prisma;
    redis;
    gateway;
    logger = new common_1.Logger(TrackingService_1.name);
    stopStates = new Map();
    constructor(prisma, redis, gateway) {
        this.prisma = prisma;
        this.redis = redis;
        this.gateway = gateway;
    }
    async processLocation(data) {
        const status = this.detectStatus(data.vehicleId, data.speed, data.timestamp);
        await this.ensureVehicleExists(data.vehicleId);
        await this.saveToDatabase(data, status);
        const lastPosition = {
            vehicleId: data.vehicleId,
            lat: data.lat,
            lon: data.lon,
            speed: data.speed,
            heading: data.heading,
            status,
            updatedAt: new Date().toISOString(),
        };
        await this.redis.setJson(`${REDIS_KEY_PREFIX}${data.vehicleId}`, lastPosition, REDIS_TTL_SECONDS);
        this.gateway.emitVehicleUpdate(lastPosition);
    }
    detectStatus(vehicleId, speed, timestamp) {
        if (!this.stopStates.has(vehicleId)) {
            this.stopStates.set(vehicleId, {
                firstSlowTimestamp: null,
                currentStatus: "MOVING",
            });
        }
        const state = this.stopStates.get(vehicleId);
        if (speed >= STOP_SPEED_THRESHOLD_KMH) {
            state.firstSlowTimestamp = null;
            state.currentStatus = "MOVING";
        }
        else {
            if (!state.firstSlowTimestamp) {
                state.firstSlowTimestamp = timestamp;
            }
            const slowDurationMs = timestamp.getTime() - state.firstSlowTimestamp.getTime();
            if (slowDurationMs >= STOP_DURATION_MS) {
                if (state.currentStatus !== "STOPPED") {
                    this.logger.log(`🔴 Vehicle ${vehicleId} STOPPED (slow for ${Math.round(slowDurationMs / 1000)}s)`);
                }
                state.currentStatus = "STOPPED";
            }
        }
        return state.currentStatus;
    }
    async saveToDatabase(data, status) {
        try {
            await this.prisma.trackingPoint.create({
                data: {
                    vehicleId: data.vehicleId,
                    lat: data.lat,
                    lon: data.lon,
                    speed: data.speed,
                    heading: data.heading,
                    status,
                    timestamp: data.timestamp,
                },
            });
        }
        catch (err) {
            this.logger.error(`❌ Failed to save tracking point for ${data.vehicleId}:`, err);
        }
    }
    async ensureVehicleExists(vehicleId) {
        try {
            await this.prisma.vehicle.upsert({
                where: { id: vehicleId },
                update: {},
                create: {
                    id: vehicleId,
                    name: `Fleet ${vehicleId}`,
                    plate: `B ${vehicleId.replace("VH-", "")} ABC`,
                },
            });
        }
        catch (err) {
            this.logger.error(`❌ Failed to upsert vehicle ${vehicleId}:`, err);
        }
    }
    async getLatestPositions() {
        const keys = await this.redis.keys(`${REDIS_KEY_PREFIX}*`);
        if (!keys.length)
            return [];
        const positions = await Promise.all(keys.map((key) => this.redis.getJson(key)));
        return positions.filter(Boolean);
    }
    async getHistory(vehicleId, from, to) {
        return this.prisma.trackingPoint.findMany({
            where: {
                vehicleId,
                timestamp: { gte: from, lte: to },
            },
            orderBy: { timestamp: "asc" },
            select: {
                id: true,
                lat: true,
                lon: true,
                speed: true,
                heading: true,
                status: true,
                timestamp: true,
            },
        });
    }
};
exports.TrackingService = TrackingService;
exports.TrackingService = TrackingService = TrackingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        tracking_gateway_1.TrackingGateway])
], TrackingService);
//# sourceMappingURL=tracking.service.js.map