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
  firstSlowTimestamp: Date | null; // when speed first dropped below threshold
  currentStatus: "MOVING" | "STOPPED";
}

export interface LastPosition {
  vehicleId: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  status: "MOVING" | "STOPPED";
  updatedAt: string; // ISO string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STOP_SPEED_THRESHOLD_KMH = 5;
const STOP_DURATION_MS = 2 * 60 * 1000; // 2 minutes
const REDIS_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const REDIS_KEY_PREFIX = "vehicle:last:";

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  // In-memory stop state per vehicle (no need to persist this)
  private readonly stopStates = new Map<string, StopState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly gateway: TrackingGateway,
  ) {}

  // ─── Main entry point ────────────────────────────────────────────────────────

  async processLocation(data: ProcessedLocation): Promise<void> {
    const status = this.detectStatus(data.vehicleId, data.speed, data.timestamp);

    // Ensure vehicle record exists (auto-seed from simulator IDs)
    await this.ensureVehicleExists(data.vehicleId);

    // Save to PostgreSQL (history)
    await this.saveToDatabase(data, status);

    // Update Redis cache (last position)
    const lastPosition: LastPosition = {
      vehicleId: data.vehicleId,
      lat: data.lat,
      lon: data.lon,
      speed: data.speed,
      heading: data.heading,
      status,
      updatedAt: new Date().toISOString(),
    };
    await this.redis.setJson(
      `${REDIS_KEY_PREFIX}${data.vehicleId}`,
      lastPosition,
      REDIS_TTL_SECONDS,
    );

    // Emit to WebSocket clients
    this.gateway.emitVehicleUpdate(lastPosition);
  }

  // ─── Stop Detection ──────────────────────────────────────────────────────────
  /**
   * Simple FSM:
   *  speed >= 5 → MOVING (reset slow timer)
   *  speed < 5 for < 2 min → still MOVING (just slow)
   *  speed < 5 for >= 2 min → STOPPED
   */
  private detectStatus(
    vehicleId: string,
    speed: number,
    timestamp: Date,
  ): "MOVING" | "STOPPED" {
    if (!this.stopStates.has(vehicleId)) {
      this.stopStates.set(vehicleId, {
        firstSlowTimestamp: null,
        currentStatus: "MOVING",
      });
    }

    const state = this.stopStates.get(vehicleId)!;

    if (speed >= STOP_SPEED_THRESHOLD_KMH) {
      // Vehicle is moving normally
      state.firstSlowTimestamp = null;
      state.currentStatus = "MOVING";
    } else {
      // Speed is below threshold
      if (!state.firstSlowTimestamp) {
        state.firstSlowTimestamp = timestamp;
      }

      const slowDurationMs = timestamp.getTime() - state.firstSlowTimestamp.getTime();

      if (slowDurationMs >= STOP_DURATION_MS) {
        if (state.currentStatus !== "STOPPED") {
          this.logger.log(
            `🔴 Vehicle ${vehicleId} STOPPED (slow for ${Math.round(slowDurationMs / 1000)}s)`,
          );
        }
        state.currentStatus = "STOPPED";
      }
      // else: still within grace period, keep MOVING
    }

    return state.currentStatus;
  }

  // ─── Database Operations ─────────────────────────────────────────────────────

  private async saveToDatabase(
    data: ProcessedLocation,
    status: "MOVING" | "STOPPED",
  ): Promise<void> {
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
    } catch (err) {
      this.logger.error(`❌ Failed to save tracking point for ${data.vehicleId}:`, err);
    }
  }

  private async ensureVehicleExists(vehicleId: string): Promise<void> {
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
    } catch (err) {
      this.logger.error(`❌ Failed to upsert vehicle ${vehicleId}:`, err);
    }
  }

  // ─── Query Methods (called by controller) ───────────────────────────────────

  /** Get last position of all vehicles from Redis */
  async getLatestPositions(): Promise<LastPosition[]> {
    const keys = await this.redis.keys(`${REDIS_KEY_PREFIX}*`);
    if (!keys.length) return [];

    const positions = await Promise.all(
      keys.map((key) => this.redis.getJson<LastPosition>(key)),
    );

    return positions.filter(Boolean) as LastPosition[];
  }

  /** Get tracking history from PostgreSQL */
  async getHistory(
    vehicleId: string,
    from: Date,
    to: Date,
  ) {
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
}
