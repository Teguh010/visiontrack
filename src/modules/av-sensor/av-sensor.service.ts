/**
 * AV Sensor Service
 * ──────────────────────────────────────────────────────────────────
 * Processes incoming sensor data from nuScenes replayer and:
 *  1. Transforms raw MQTT payloads to typed data
 *  2. Caches current state in Redis
 *  3. Emits real-time updates via WebSocket
 */

import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "../../redis/redis.service";
import { AvSensorGateway } from "./av-sensor.gateway";
import {
  AvGpsPayload,
  AvGpsData,
  AvCameraPayload,
  AvCameraData,
  AvLidarPayload,
  AvLidarData,
  AvStatusPayload,
  AvStatusData,
  AvAnnotationsPayload,
  AvAnnotationsData,
  AvAnnotation,
  AvVehicleState,
  CameraChannel,
} from "./dto/av-sensor.dto";

// Redis keys
const REDIS_AV_GPS         = "av:gps";
const REDIS_AV_CAMERA      = "av:camera:";  // + channel
const REDIS_AV_LIDAR       = "av:lidar";
const REDIS_AV_STATUS      = "av:status";
const REDIS_AV_ANNOTATIONS = "av:annotations";
const REDIS_TTL_SECONDS    = 60 * 5;  // 5 minutes

@Injectable()
export class AvSensorService {
  private readonly logger = new Logger(AvSensorService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly gateway: AvSensorGateway,
  ) {}

  // ─── GPS Processing ────────────────────────────────────────────────────────

  async processGps(payload: AvGpsPayload): Promise<void> {
    const data: AvGpsData = {
      lat: payload.lat,
      lon: payload.lon,
      altitude: payload.altitude,
      heading: payload.heading,
      speedKph: payload.speed_kph,
      timestamp: payload.timestamp,
      frame: payload.frame,
      scene: payload.scene,
      location: payload.location,
      // Raw coordinates for nuScenes map
      x: payload.x ?? 0,
      y: payload.y ?? 0,
      updatedAt: new Date().toISOString(),
    };

    // Cache in Redis
    await this.redis.setJson(REDIS_AV_GPS, data, REDIS_TTL_SECONDS);

    // Emit to subscribers
    this.gateway.emitGps(data);

    this.logger.debug(
      `📍 GPS frame ${data.frame}: ${data.lat.toFixed(5)}, ${data.lon.toFixed(5)} @ ${data.speedKph} km/h`,
    );
  }

  // ─── Camera Processing ─────────────────────────────────────────────────────

  async processCamera(payload: AvCameraPayload): Promise<void> {
    const data: AvCameraData = {
      camera: payload.camera,
      image: payload.image,
      timestamp: payload.timestamp,
      frame: payload.frame,
      updatedAt: new Date().toISOString(),
    };

    // Cache in Redis (one key per camera channel)
    await this.redis.setJson(
      `${REDIS_AV_CAMERA}${payload.camera}`,
      data,
      REDIS_TTL_SECONDS,
    );

    // Emit to subscribers
    this.gateway.emitCamera(data);

    this.logger.debug(`📷 Camera ${data.camera} frame ${data.frame}`);
  }

  // ─── LiDAR Processing ──────────────────────────────────────────────────────

  async processLidar(payload: AvLidarPayload): Promise<void> {
    const data: AvLidarData = {
      points: payload.points,
      pointCount: payload.points.length,
      timestamp: payload.timestamp,
      frame: payload.frame,
      updatedAt: new Date().toISOString(),
    };

    // Cache in Redis (without point cloud data — too large)
    const cacheData = {
      pointCount: data.pointCount,
      timestamp: data.timestamp,
      frame: data.frame,
      updatedAt: data.updatedAt,
    };
    await this.redis.setJson(REDIS_AV_LIDAR, cacheData, REDIS_TTL_SECONDS);

    // Emit to subscribers (with full point cloud)
    this.gateway.emitLidar(data);

    this.logger.debug(`🔵 LiDAR frame ${data.frame}: ${data.pointCount} points`);
  }

  // ─── Status Processing ─────────────────────────────────────────────────────

  async processStatus(payload: AvStatusPayload): Promise<void> {
    const data: AvStatusData = {
      scene: payload.scene,
      frame: payload.frame,
      totalFrames: payload.total,
      progressPct: payload.pct,
      status: payload.status,
      updatedAt: new Date().toISOString(),
    };

    // Cache in Redis
    await this.redis.setJson(REDIS_AV_STATUS, data, REDIS_TTL_SECONDS);

    // Emit to subscribers
    this.gateway.emitStatus(data);

    if (payload.status === "finished") {
      this.logger.log(`🏁 Scene ${data.scene} finished`);
    }
  }

  // ─── Annotations Processing ────────────────────────────────────────────────

  async processAnnotations(payload: AvAnnotationsPayload): Promise<void> {
    const annotations: AvAnnotation[] = payload.annotations.map((ann) => ({
      id: ann.id,
      category: ann.category as AvAnnotation['category'],
      categoryFull: ann.category_full,
      attributes: ann.attributes as AvAnnotation['attributes'],
      x: ann.x,
      y: ann.y,
      z: ann.z,
      width: ann.width,
      length: ann.length,
      height: ann.height,
      yaw: ann.yaw,
      distance: ann.distance,
      color: ann.color,
      numLidarPts: ann.num_lidar_pts,
    }));

    const data: AvAnnotationsData = {
      annotations,
      timestamp: payload.timestamp,
      frame: payload.frame,
      count: payload.count,
      updatedAt: new Date().toISOString(),
    };

    // Cache in Redis (without full annotations — just metadata)
    const cacheData = {
      count: data.count,
      timestamp: data.timestamp,
      frame: data.frame,
      updatedAt: data.updatedAt,
    };
    await this.redis.setJson(REDIS_AV_ANNOTATIONS, cacheData, REDIS_TTL_SECONDS);

    // Emit to subscribers (with full annotations)
    this.gateway.emitAnnotations(data);

    this.logger.debug(`📦 Annotations frame ${data.frame}: ${data.count} objects`);
  }

  // ─── Get Current State ─────────────────────────────────────────────────────

  /**
   * Get the current AV vehicle state from Redis.
   * Useful for new clients that need to catch up.
   */
  async getCurrentState(): Promise<AvVehicleState> {
    const [gps, lidar, status, annotations] = await Promise.all([
      this.redis.getJson<AvGpsData>(REDIS_AV_GPS),
      this.redis.getJson<AvLidarData>(REDIS_AV_LIDAR),
      this.redis.getJson<AvStatusData>(REDIS_AV_STATUS),
      this.redis.getJson<AvAnnotationsData>(REDIS_AV_ANNOTATIONS),
    ]);

    // Get all camera channels
    const cameraChannels: CameraChannel[] = [
      'CAM_FRONT',
      'CAM_FRONT_LEFT',
      'CAM_FRONT_RIGHT',
      'CAM_BACK',
      'CAM_BACK_LEFT',
      'CAM_BACK_RIGHT',
    ];

    const cameraPromises = cameraChannels.map((ch) =>
      this.redis.getJson<AvCameraData>(`${REDIS_AV_CAMERA}${ch}`),
    );
    const cameraResults = await Promise.all(cameraPromises);

    const cameras: Partial<Record<CameraChannel, AvCameraData>> = {};
    cameraChannels.forEach((ch, i) => {
      if (cameraResults[i]) {
        cameras[ch] = cameraResults[i]!;
      }
    });

    return {
      gps: gps ?? null,
      cameras,
      lidar: lidar ?? null,
      status: status ?? null,
      annotations: annotations ?? null,
    };
  }
}
