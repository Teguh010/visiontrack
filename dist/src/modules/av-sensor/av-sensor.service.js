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
var AvSensorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvSensorService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../../redis/redis.service");
const av_sensor_gateway_1 = require("./av-sensor.gateway");
const REDIS_AV_GPS = "av:gps";
const REDIS_AV_CAMERA = "av:camera:";
const REDIS_AV_LIDAR = "av:lidar";
const REDIS_AV_STATUS = "av:status";
const REDIS_TTL_SECONDS = 60 * 5;
let AvSensorService = AvSensorService_1 = class AvSensorService {
    redis;
    gateway;
    logger = new common_1.Logger(AvSensorService_1.name);
    constructor(redis, gateway) {
        this.redis = redis;
        this.gateway = gateway;
    }
    async processGps(payload) {
        const data = {
            lat: payload.lat,
            lon: payload.lon,
            altitude: payload.altitude,
            heading: payload.heading,
            speedKph: payload.speed_kph,
            timestamp: payload.timestamp,
            frame: payload.frame,
            scene: payload.scene,
            location: payload.location,
            x: payload.x ?? 0,
            y: payload.y ?? 0,
            updatedAt: new Date().toISOString(),
        };
        await this.redis.setJson(REDIS_AV_GPS, data, REDIS_TTL_SECONDS);
        this.gateway.emitGps(data);
        this.logger.debug(`📍 GPS frame ${data.frame}: ${data.lat.toFixed(5)}, ${data.lon.toFixed(5)} @ ${data.speedKph} km/h`);
    }
    async processCamera(payload) {
        const data = {
            camera: payload.camera,
            image: payload.image,
            timestamp: payload.timestamp,
            frame: payload.frame,
            updatedAt: new Date().toISOString(),
        };
        await this.redis.setJson(`${REDIS_AV_CAMERA}${payload.camera}`, data, REDIS_TTL_SECONDS);
        this.gateway.emitCamera(data);
        this.logger.debug(`📷 Camera ${data.camera} frame ${data.frame}`);
    }
    async processLidar(payload) {
        const data = {
            points: payload.points,
            pointCount: payload.points.length,
            timestamp: payload.timestamp,
            frame: payload.frame,
            updatedAt: new Date().toISOString(),
        };
        const cacheData = {
            pointCount: data.pointCount,
            timestamp: data.timestamp,
            frame: data.frame,
            updatedAt: data.updatedAt,
        };
        await this.redis.setJson(REDIS_AV_LIDAR, cacheData, REDIS_TTL_SECONDS);
        this.gateway.emitLidar(data);
        this.logger.debug(`🔵 LiDAR frame ${data.frame}: ${data.pointCount} points`);
    }
    async processStatus(payload) {
        const data = {
            scene: payload.scene,
            frame: payload.frame,
            totalFrames: payload.total,
            progressPct: payload.pct,
            status: payload.status,
            updatedAt: new Date().toISOString(),
        };
        await this.redis.setJson(REDIS_AV_STATUS, data, REDIS_TTL_SECONDS);
        this.gateway.emitStatus(data);
        if (payload.status === "finished") {
            this.logger.log(`🏁 Scene ${data.scene} finished`);
        }
    }
    async getCurrentState() {
        const [gps, lidar, status] = await Promise.all([
            this.redis.getJson(REDIS_AV_GPS),
            this.redis.getJson(REDIS_AV_LIDAR),
            this.redis.getJson(REDIS_AV_STATUS),
        ]);
        const cameraChannels = [
            'CAM_FRONT',
            'CAM_FRONT_LEFT',
            'CAM_FRONT_RIGHT',
            'CAM_BACK',
            'CAM_BACK_LEFT',
            'CAM_BACK_RIGHT',
        ];
        const cameraPromises = cameraChannels.map((ch) => this.redis.getJson(`${REDIS_AV_CAMERA}${ch}`));
        const cameraResults = await Promise.all(cameraPromises);
        const cameras = {};
        cameraChannels.forEach((ch, i) => {
            if (cameraResults[i]) {
                cameras[ch] = cameraResults[i];
            }
        });
        return {
            gps: gps ?? null,
            cameras,
            lidar: lidar ?? null,
            status: status ?? null,
        };
    }
};
exports.AvSensorService = AvSensorService;
exports.AvSensorService = AvSensorService = AvSensorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        av_sensor_gateway_1.AvSensorGateway])
], AvSensorService);
//# sourceMappingURL=av-sensor.service.js.map