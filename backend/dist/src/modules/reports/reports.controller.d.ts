import { ReportsService } from "./reports.service";
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getFleetOverview(): Promise<import("./reports.service").FleetOverview>;
    getTripReport(vehicleId: string, from: string, to: string): Promise<import("./reports.service").TripReport>;
    getSpeedDistribution(vehicleId: string, from: string, to: string): Promise<import("./reports.service").SpeedDistributionReport>;
}
