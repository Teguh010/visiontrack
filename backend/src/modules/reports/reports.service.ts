import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { LastPosition } from '../tracking/tracking.service';

// ─── Return types ─────────────────────────────────────────────────────────────

export interface FleetOverview {
  generatedAt: string;
  totalVehicles: number;
  moving: number;
  idle: number;
  stopped: number;
  vehicles: VehicleSummary[];
}

export interface VehicleSummary {
  vehicleId: string;
  name: string;
  plate: string;
  status: string;
  speed: number;
  lastSeen: string;
  distanceTodayKm: number;
}

export interface TripReport {
  vehicleId: string;
  from: string;
  to: string;
  totalPoints: number;
  distanceKm: number;
  durationMinutes: number;
  movingMinutes: number;
  stoppedMinutes: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
  stopCount: number;
  stops: StopEvent[];
}

export interface StopEvent {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  lat: number;
  lon: number;
}

export interface SpeedBand {
  label: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface SpeedDistributionReport {
  vehicleId: string;
  from: string;
  to: string;
  totalReadings: number;
  bands: SpeedBand[];
}

// ─── Haversine distance (km) ──────────────────────────────────────────────────

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dL = ((lat2 - lat1) * Math.PI) / 180;
  const dG = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dL / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── 1. Fleet Overview ───────────────────────────────────────────────────────
  /**
   * GET /api/reports/fleet-overview
   * Real-time snapshot: status semua kendaraan + jarak hari ini
   */
  async getFleetOverview(): Promise<FleetOverview> {
    // Get last positions from Redis
    const keys = await this.redis.keys('vehicle:last:*');
    const positions = (
      await Promise.all(keys.map((k) => this.redis.getJson<LastPosition>(k)))
    ).filter(Boolean) as LastPosition[];

    // Get vehicle metadata from DB
    const vehicles = (await this.prisma.vehicle.findMany()) as Array<{
      id: string;
      name: string;
      plate: string;
      createdAt: Date;
    }>;
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

    // Compute distance today per vehicle
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const summaries: VehicleSummary[] = await Promise.all(
      positions.map(async (pos) => {
        const meta = vehicleMap.get(pos.vehicleId);
        const todayPoints = (await this.prisma.trackingPoint.findMany({
          where: {
            vehicleId: pos.vehicleId,
            timestamp: { gte: today, lt: tomorrow },
          },
          orderBy: { timestamp: 'asc' },
          select: { lat: true, lon: true },
        })) as Array<{ lat: unknown; lon: unknown }>;

        const distanceKm = this.calcDistance(todayPoints);

        return {
          vehicleId: pos.vehicleId,
          name: meta?.name ?? pos.vehicleId,
          plate: meta?.plate ?? '—',
          status: pos.status,
          speed: pos.speed,
          lastSeen: pos.updatedAt,
          distanceTodayKm: Math.round(distanceKm * 100) / 100,
        };
      }),
    );

    const moving = summaries.filter((s) => s.status === 'MOVING').length;
    const stopped = summaries.filter((s) => s.status === 'STOPPED').length;

    return {
      generatedAt: new Date().toISOString(),
      totalVehicles: summaries.length,
      moving,
      idle: 0, // future: from driveState
      stopped,
      vehicles: summaries.sort((a, b) =>
        a.vehicleId.localeCompare(b.vehicleId),
      ),
    };
  }

  // ─── 2. Trip / Daily Report ───────────────────────────────────────────────────
  /**
   * GET /api/reports/trip?vehicleId=VH-001&from=...&to=...
   * Analisis lengkap perjalanan: jarak, durasi, stop events
   */
  async getTripReport(
    vehicleId: string,
    from: Date,
    to: Date,
  ): Promise<TripReport> {
    const points = (await this.prisma.trackingPoint.findMany({
      where: { vehicleId, timestamp: { gte: from, lte: to } },
      orderBy: { timestamp: 'asc' },
      select: {
        lat: true,
        lon: true,
        speed: true,
        status: true,
        timestamp: true,
      },
    })) as Array<{
      lat: unknown;
      lon: unknown;
      speed: unknown;
      status: string;
      timestamp: Date;
    }>;

    if (points.length === 0) {
      return {
        vehicleId,
        from: from.toISOString(),
        to: to.toISOString(),
        totalPoints: 0,
        distanceKm: 0,
        durationMinutes: 0,
        movingMinutes: 0,
        stoppedMinutes: 0,
        maxSpeedKmh: 0,
        avgSpeedKmh: 0,
        stopCount: 0,
        stops: [],
      };
    }

    const TICK_SECONDS = 3; // simulator interval
    const TICK_MINUTES = TICK_SECONDS / 60;

    let distanceKm = 0;
    let movingTicks = 0;
    let stoppedTicks = 0;
    let maxSpeed = 0;
    let speedSum = 0;
    const stops: StopEvent[] = [];
    let stopStart: Date | null = null;
    let stopLat = 0,
      stopLon = 0;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const speed = Number(p.speed);
      speedSum += speed;
      if (speed > maxSpeed) maxSpeed = speed;

      if (p.status === 'MOVING') {
        movingTicks++;
        if (stopStart) {
          // Stop ended
          const durMin =
            Math.round(
              ((p.timestamp.getTime() - stopStart.getTime()) / 60000) * 10,
            ) / 10;
          stops.push({
            startTime: stopStart.toISOString(),
            endTime: p.timestamp.toISOString(),
            durationMinutes: durMin,
            lat: stopLat,
            lon: stopLon,
          });
          stopStart = null;
        }
        if (i > 0) {
          distanceKm += haversineKm(
            Number(points[i - 1].lat),
            Number(points[i - 1].lon),
            Number(p.lat),
            Number(p.lon),
          );
        }
      } else {
        stoppedTicks++;
        if (!stopStart) {
          stopStart = p.timestamp;
          stopLat = Number(p.lat);
          stopLon = Number(p.lon);
        }
      }
    }

    // Close open stop
    if (stopStart) {
      const last = points[points.length - 1];
      stops.push({
        startTime: stopStart.toISOString(),
        endTime: last.timestamp.toISOString(),
        durationMinutes:
          Math.round(
            ((last.timestamp.getTime() - stopStart.getTime()) / 60000) * 10,
          ) / 10,
        lat: stopLat,
        lon: stopLon,
      });
    }

    const totalMinutes = Math.round(
      (points[points.length - 1].timestamp.getTime() -
        points[0].timestamp.getTime()) /
        60000,
    );

    return {
      vehicleId,
      from: from.toISOString(),
      to: to.toISOString(),
      totalPoints: points.length,
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMinutes: totalMinutes,
      movingMinutes: Math.round(movingTicks * TICK_MINUTES * 10) / 10,
      stoppedMinutes: Math.round(stoppedTicks * TICK_MINUTES * 10) / 10,
      maxSpeedKmh: Math.round(maxSpeed * 10) / 10,
      avgSpeedKmh: Math.round((speedSum / points.length) * 10) / 10,
      stopCount: stops.length,
      stops,
    };
  }

  // ─── 3. Speed Distribution ───────────────────────────────────────────────────
  /**
   * GET /api/reports/speed-distribution?vehicleId=VH-001&from=...&to=...
   * Berapa % waktu kendaraan di speed band tertentu
   */
  async getSpeedDistribution(
    vehicleId: string,
    from: Date,
    to: Date,
  ): Promise<SpeedDistributionReport> {
    const points = (await this.prisma.trackingPoint.findMany({
      where: { vehicleId, timestamp: { gte: from, lte: to } },
      select: { speed: true },
    })) as Array<{ speed: unknown }>;

    const bands = [
      { label: 'Stopped (0)', min: 0, max: 1 },
      { label: 'Slow (1–20)', min: 1, max: 20 },
      { label: 'City (20–50)', min: 20, max: 50 },
      { label: 'Fast (50–80)', min: 50, max: 80 },
      { label: 'Highway (80+)', min: 80, max: 999 },
    ].map((b) => ({
      ...b,
      count: points.filter((p) => {
        const s = Number(p.speed);
        return s >= b.min && s < b.max;
      }).length,
      percentage: 0,
    }));

    const total = points.length || 1;
    bands.forEach((b) => {
      b.percentage = Math.round((b.count / total) * 1000) / 10;
    });

    return {
      vehicleId,
      from: from.toISOString(),
      to: to.toISOString(),
      totalReadings: points.length,
      bands,
    };
  }

  // ─── Helper ───────────────────────────────────────────────────────────────────

  private calcDistance(points: Array<{ lat: unknown; lon: unknown }>): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += haversineKm(
        Number(points[i - 1].lat),
        Number(points[i - 1].lon),
        Number(points[i].lat),
        Number(points[i].lon),
      );
    }
    return total;
  }
}
