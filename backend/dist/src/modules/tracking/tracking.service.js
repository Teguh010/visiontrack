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
const STOP_STATE_PREFIX = "vehicle:stop_state:";
const STOP_STATE_TTL_SECONDS = 60 * 60 * 6;
const FLUSH_INTERVAL_MS = 5_000;
const BATCH_MAX_SIZE = 500;
let TrackingService = TrackingService_1 = class TrackingService {
    prisma;
    redis;
    gateway;
    logger = new common_1.Logger(TrackingService_1.name);
    writeBuffer = [];
    flushTimer = null;
    constructor(prisma, redis, gateway) {
        this.prisma = prisma;
        this.redis = redis;
        this.gateway = gateway;
    }
    onModuleInit() {
        this.flushTimer = setInterval(() => {
            void this.flushBuffer();
        }, FLUSH_INTERVAL_MS);
        this.logger.log(`⏱  Batch write buffer active — flushing every ${FLUSH_INTERVAL_MS / 1000}s`);
    }
    async onModuleDestroy() {
        if (this.flushTimer)
            clearInterval(this.flushTimer);
        await this.flushBuffer();
    }
    async processLocation(data) {
        const status = await this.detectStatus(data.vehicleId, data.speed, data.timestamp);
        await this.ensureVehicleExists(data.vehicleId, data.vehicleType);
        await this.bufferTrackingPoint(data, status);
        const lastPosition = {
            vehicleId: data.vehicleId,
            vehicleType: data.vehicleType,
            lat: data.lat,
            lon: data.lon,
            speed: data.speed,
            heading: data.heading,
            driveState: data.driveState,
            status,
            updatedAt: new Date().toISOString(),
        };
        await this.redis.setJson(`${REDIS_KEY_PREFIX}${data.vehicleId}`, lastPosition, REDIS_TTL_SECONDS);
        this.gateway.emitVehicleUpdate(lastPosition);
    }
    async detectStatus(vehicleId, speed, timestamp) {
        const redisKey = `${STOP_STATE_PREFIX}${vehicleId}`;
        const state = (await this.redis.getJson(redisKey)) ?? {
            firstSlowTimestamp: null,
            currentStatus: "MOVING",
        };
        let changed = false;
        if (speed >= STOP_SPEED_THRESHOLD_KMH) {
            if (state.firstSlowTimestamp !== null || state.currentStatus !== "MOVING") {
                state.firstSlowTimestamp = null;
                state.currentStatus = "MOVING";
                changed = true;
            }
        }
        else {
            if (!state.firstSlowTimestamp) {
                state.firstSlowTimestamp = timestamp.toISOString();
                changed = true;
            }
            const slowDurationMs = timestamp.getTime() - new Date(state.firstSlowTimestamp).getTime();
            if (slowDurationMs >= STOP_DURATION_MS && state.currentStatus !== "STOPPED") {
                this.logger.log(`🔴 Vehicle ${vehicleId} STOPPED (slow ${Math.round(slowDurationMs / 1000)}s)`);
                state.currentStatus = "STOPPED";
                changed = true;
            }
        }
        if (changed) {
            await this.redis.setJson(redisKey, state, STOP_STATE_TTL_SECONDS);
        }
        return state.currentStatus;
    }
    async bufferTrackingPoint(data, status) {
        this.writeBuffer.push({
            vehicleId: data.vehicleId,
            lat: data.lat,
            lon: data.lon,
            speed: data.speed,
            heading: data.heading,
            status,
            timestamp: data.timestamp,
        });
        if (this.writeBuffer.length >= BATCH_MAX_SIZE) {
            await this.flushBuffer();
        }
    }
    async flushBuffer() {
        if (this.writeBuffer.length === 0)
            return;
        const batch = this.writeBuffer.splice(0, this.writeBuffer.length);
        try {
            const result = await this.prisma.trackingPoint.createMany({ data: batch });
            this.logger.debug(`💾 Flushed ${result.count} tracking points to PostgreSQL`);
        }
        catch (err) {
            this.logger.error(`❌ Batch flush failed (${batch.length} records):`, err);
            this.writeBuffer.unshift(...batch);
        }
    }
    async ensureVehicleExists(vehicleId, vehicleType) {
        try {
            await this.prisma.vehicle.upsert({
                where: { id: vehicleId },
                update: { vehicleType },
                create: {
                    id: vehicleId,
                    name: this.defaultName(vehicleId, vehicleType),
                    plate: `B ${vehicleId.replace("VH-", "")} ${vehicleType.slice(0, 3)}`,
                    vehicleType,
                },
            });
        }
        catch (err) {
            this.logger.error(`❌ Failed to upsert vehicle ${vehicleId}:`, err);
        }
    }
    defaultName(vehicleId, vehicleType) {
        const labels = {
            CITY: "City Bus",
            HIGHWAY: "Express Truck",
            DELIVERY: "Delivery Van",
            PATROL: "Patrol Car",
        };
        return `${labels[vehicleType] ?? vehicleType} ${vehicleId.replace("VH-", "")}`;
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
            where: { vehicleId, timestamp: { gte: from, lte: to } },
            orderBy: { timestamp: "asc" },
            select: { id: true, lat: true, lon: true, speed: true, heading: true, status: true, timestamp: true },
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