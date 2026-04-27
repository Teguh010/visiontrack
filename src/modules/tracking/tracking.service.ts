/**
 * Tracking Service — Core Business Logic
 * ──────────────────────────────────────────────────────────────────
 * Responsibilities:
 *  1. Receive processed location from MQTT consumer
 *  2. Run stop detection (speed < 5 km/h for > 2 minutes)
 *  3. Save last position to Redis (fast reads)
 *  4. Save history to PostgreSQL
 *  5. Emit real-time update via WebSocket gateway
 *  6. Auto-seed vehicle records if they don't exist
 */

import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { ProcessedLocation } from "./dto/mqtt-payload.dto";
import { TrackingGateway } from "./tracking.gateway";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StopState {
  firstSlowTimestamp: Date | null;
  currentStatus: "MOVING" | "STOPPED";
}

export interface LastPosition {
  vehicleId: string;
  vehicleType: string;       // CITY | HIGHWAY | DELIVERY | PATROL
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  driveState: string;        // DRIVING | IDLE | STOPPED
  status: "MOVING" | "STOPPED";
  updatedAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STOP_SPEED_THRESHOLD_KMH = 5;
const STOP_DURATION_MS         = 2 * 60 * 1000;   // 2 minutes
const REDIS_TTL_SECONDS        = 60 * 60 * 24;     // 24 hours
const REDIS_KEY_PREFIX         = "vehicle:last:";

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);
  private readonly stopStates = new Map<string, StopState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly gateway: TrackingGateway,
  ) {}

  // ─── Main entry point ────────────────────────────────────────────────────────

  async processLocation(data: ProcessedLocation): Promise<void> {
    const status = this.detectStatus(data.vehicleId, data.speed, data.timestamp);

    // Auto-seed vehicle with type
    await this.ensureVehicleExists(data.vehicleId, data.vehicleType);

    // Save to PostgreSQL (history)
    await this.saveToDatabase(data, status);

    // Update Redis cache (last position)
    const lastPosition: LastPosition = {
      vehicleId:   data.vehicleId,
      vehicleType: data.vehicleType,
      lat:         data.lat,
      lon:         data.lon,
      speed:       data.speed,
      heading:     data.heading,
      driveState:  data.driveState,
      status,
      updatedAt:   new Date().toISOString(),
    };
    await this.redis.setJson(
      `${REDIS_KEY_PREFIX}${data.vehicleId}`,
      lastPosition,
      REDIS_TTL_SECONDS,
    );

    // Emit to WebSocket clients
    this.gateway.emitVehicleUpdate(lastPosition);
  }

  // ─── Stop Detection FSM ──────────────────────────────────────────────────────

  private detectStatus(vehicleId: string, speed: number, timestamp: Date): "MOVING" | "STOPPED" {
    if (!this.stopStates.has(vehicleId)) {
      this.stopStates.set(vehicleId, { firstSlowTimestamp: null, currentStatus: "MOVING" });
    }

    const state = this.stopStates.get(vehicleId)!;

    if (speed >= STOP_SPEED_THRESHOLD_KMH) {
      state.firstSlowTimestamp = null;
      state.currentStatus      = "MOVING";
    } else {
      if (!state.firstSlowTimestamp) state.firstSlowTimestamp = timestamp;

      const slowDurationMs = timestamp.getTime() - state.firstSlowTimestamp.getTime();
      if (slowDurationMs >= STOP_DURATION_MS) {
        if (state.currentStatus !== "STOPPED") {
          this.logger.log(`🔴 Vehicle ${vehicleId} STOPPED (slow ${Math.round(slowDurationMs / 1000)}s)`);
        }
        state.currentStatus = "STOPPED";
      }
    }

    return state.currentStatus;
  }

  // ─── Database Operations ─────────────────────────────────────────────────────

  private async saveToDatabase(data: ProcessedLocation, status: "MOVING" | "STOPPED"): Promise<void> {
    try {
      await this.prisma.trackingPoint.create({
        data: {
          vehicleId: data.vehicleId,
          lat:       data.lat,
          lon:       data.lon,
          speed:     data.speed,
          heading:   data.heading,
          status,
          timestamp: data.timestamp,
        },
      });
    } catch (err) {
      this.logger.error(`❌ Failed to save tracking point for ${data.vehicleId}:`, err);
    }
  }

  private async ensureVehicleExists(vehicleId: string, vehicleType: string): Promise<void> {
    try {
      await this.prisma.vehicle.upsert({
        where:  { id: vehicleId },
        update: { vehicleType },    // always keep vehicleType in sync
        create: {
          id:          vehicleId,
          name:        this.defaultName(vehicleId, vehicleType),
          plate:       `B ${vehicleId.replace("VH-", "")} ${vehicleType.slice(0, 3)}`,
          vehicleType,
        },
      });
    } catch (err) {
      this.logger.error(`❌ Failed to upsert vehicle ${vehicleId}:`, err);
    }
  }

  private defaultName(vehicleId: string, vehicleType: string): string {
    const labels: Record<string, string> = {
      CITY:     "City Bus",
      HIGHWAY:  "Express Truck",
      DELIVERY: "Delivery Van",
      PATROL:   "Patrol Car",
    };
    return `${labels[vehicleType] ?? vehicleType} ${vehicleId.replace("VH-", "")}`;
  }

  // ─── Query Methods ───────────────────────────────────────────────────────────

  async getLatestPositions(): Promise<LastPosition[]> {
    const keys      = await this.redis.keys(`${REDIS_KEY_PREFIX}*`);
    if (!keys.length) return [];

    const positions = await Promise.all(
      keys.map((key) => this.redis.getJson<LastPosition>(key)),
    );
    return positions.filter(Boolean) as LastPosition[];
  }

  async getHistory(vehicleId: string, from: Date, to: Date) {
    return this.prisma.trackingPoint.findMany({
      where:   { vehicleId, timestamp: { gte: from, lte: to } },
      orderBy: { timestamp: "asc" },
      select:  { id: true, lat: true, lon: true, speed: true, heading: true, status: true, timestamp: true },
    });
  }
}
