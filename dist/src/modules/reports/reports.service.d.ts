import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
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
export declare class ReportsService {
    private readonly prisma;
    private readonly redis;
    constructor(prisma: PrismaService, redis: RedisService);
    getFleetOverview(): Promise<FleetOverview>;
    getTripReport(vehicleId: string, from: Date, to: Date): Promise<TripReport>;
    getSpeedDistribution(vehicleId: string, from: Date, to: Date): Promise<SpeedDistributionReport>;
    private calcDistance;
}
