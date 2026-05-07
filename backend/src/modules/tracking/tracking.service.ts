/**
 * Tracking Service — Core Business Logic
 * ──────────────────────────────────────────────────────────────────
 * Responsibilities:
 *  1. Receive processed location from MQTT consumer
 *  2. Run stop detection (speed < 5 km/h for > 2 minutes)
 *  3. Save last position to Redis (fast reads)
 *  4. Save history to PostgreSQL (via batch write buffer)
 *  5. Emit real-time update via WebSocket gateway
 *  6. Auto-seed vehicle records if they don't exist
 *
 * Scalability improvements:
 *  - Stop detection state stored in Redis (survives restarts, safe for multi-instance)
 *  - Tracking points buffered in-process and flushed to PostgreSQL every FLUSH_INTERVAL_MS
 *    via createMany() — drastically reduces DB write frequency under high load
 */

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { ProcessedLocation } from "./dto/mqtt-payload.dto";
import { TrackingGateway } from "./tracking.gateway";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Serialisable — disimpan di Redis, bukan in-memory */
interface StopState {
  firstSlowTimestamp: string | null; // ISO string (bukan Date) agar bisa JSON.stringify
  currentStatus: "MOVING" | "STOPPED";
}

/** Batch write buffer entry */
interface TrackingPointBuffer {
  vehicleId: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  status: "MOVING" | "STOPPED";
  timestamp: Date;
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
const STOP_STATE_PREFIX        = "vehicle:stop_state:";
const STOP_STATE_TTL_SECONDS   = 60 * 60 * 6;      // 6 jam — cukup lama untuk gap sinyal
const FLUSH_INTERVAL_MS        = 5_000;             // flush batch ke DB setiap 5 detik
const BATCH_MAX_SIZE           = 500;               // flush paksa jika buffer mencapai 500 record

@Injectable()
export class TrackingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrackingService.name);

  /** Batch buffer — di-flush ke PostgreSQL setiap FLUSH_INTERVAL_MS */
  private writeBuffer: TrackingPointBuffer[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly gateway: TrackingGateway,
  ) {}

  onModuleInit() {
    this.flushTimer = setInterval(() => {
      void this.flushBuffer();
    }, FLUSH_INTERVAL_MS);
    this.logger.log(`⏱  Batch write buffer active — flushing every ${FLUSH_INTERVAL_MS / 1000}s`);
  }

  async onModuleDestroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    // Flush sisa buffer sebelum shutdown
    await this.flushBuffer();
  }

  // ─── Main entry point ────────────────────────────────────────────────────────

  async processLocation(data: ProcessedLocation): Promise<void> {
    // detectStatus sekarang async (baca/tulis Redis)
    const status = await this.detectStatus(data.vehicleId, data.speed, data.timestamp);

    // Auto-seed vehicle with type
    await this.ensureVehicleExists(data.vehicleId, data.vehicleType);

    // Buffer ke batch writer (tidak langsung tulis ke DB)
    await this.bufferTrackingPoint(data, status);

    // Update Redis cache (last position) — tetap real-time
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

  // ─── Stop Detection FSM (state di Redis) ────────────────────────────────────

  /**
   * Stop detection menggunakan Redis sebagai state store.
   * Aman untuk multi-instance dan restart — state tidak akan hilang.
   */
  private async detectStatus(vehicleId: string, speed: number, timestamp: Date): Promise<"MOVING" | "STOPPED"> {
    const redisKey = `${STOP_STATE_PREFIX}${vehicleId}`;

    // Ambil state dari Redis (bukan dari Map in-memory)
    const state: StopState = (await this.redis.getJson<StopState>(redisKey)) ?? {
      firstSlowTimestamp: null,
      currentStatus: "MOVING",
    };

    let changed = false;

    if (speed >= STOP_SPEED_THRESHOLD_KMH) {
      if (state.firstSlowTimestamp !== null || state.currentStatus !== "MOVING") {
        state.firstSlowTimestamp = null;
        state.currentStatus      = "MOVING";
        changed = true;
      }
    } else {
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

    // Hanya tulis ke Redis jika ada perubahan state (hemat write)
    if (changed) {
      await this.redis.setJson(redisKey, state, STOP_STATE_TTL_SECONDS);
    }

    return state.currentStatus;
  }

  // ─── Batch Write Buffer ──────────────────────────────────────────────────────

  /**
   * Masukkan record ke buffer. Tidak langsung tulis ke DB.
   * Jika buffer sudah mencapai BATCH_MAX_SIZE, flush sekarang juga.
   */
  private async bufferTrackingPoint(data: ProcessedLocation, status: "MOVING" | "STOPPED"): Promise<void> {
    this.writeBuffer.push({
      vehicleId: data.vehicleId,
      lat:       data.lat,
      lon:       data.lon,
      speed:     data.speed,
      heading:   data.heading,
      status,
      timestamp: data.timestamp,
    });

    // Flush paksa jika buffer terlalu besar (burst traffic)
    if (this.writeBuffer.length >= BATCH_MAX_SIZE) {
      await this.flushBuffer();
    }
  }

  /**
   * Flush semua record di buffer ke PostgreSQL dalam satu query createMany().
   * Dipanggil oleh timer (setiap 5 detik) atau manual saat shutdown.
   */
  private async flushBuffer(): Promise<void> {
    if (this.writeBuffer.length === 0) return;

    // Ambil semua item dan kosongkan buffer (agar tidak double-flush)
    const batch = this.writeBuffer.splice(0, this.writeBuffer.length);

    try {
      const result = await this.prisma.trackingPoint.createMany({ data: batch });
      this.logger.debug(`💾 Flushed ${result.count} tracking points to PostgreSQL`);
    } catch (err) {
      this.logger.error(`❌ Batch flush failed (${batch.length} records):`, err);
      // Kembalikan record ke depan buffer agar tidak hilang
      this.writeBuffer.unshift(...batch);
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
