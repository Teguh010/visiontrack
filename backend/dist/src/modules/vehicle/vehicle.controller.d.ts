import { VehicleService } from "./vehicle.service";
export declare class VehicleController {
    private readonly vehicleService;
    constructor(vehicleService: VehicleService);
    findAll(): Promise<{
        count: number;
        data: unknown[];
    }>;
    findOne(id: string): Promise<{}>;
}
