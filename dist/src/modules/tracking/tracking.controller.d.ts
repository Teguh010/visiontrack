import { TrackingService } from "./tracking.service";
export declare class TrackingController {
    private readonly trackingService;
    constructor(trackingService: TrackingService);
    getLatest(): Promise<{
        count: number;
        data: import("./tracking.service").LastPosition[];
    }>;
    getHistory(vehicleId: string, from: string, to: string): Promise<{
        vehicleId: string;
        from: string;
        to: string;
        count: number;
        data: unknown[];
    }>;
}
