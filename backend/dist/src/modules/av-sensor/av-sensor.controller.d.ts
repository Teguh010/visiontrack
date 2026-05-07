import { AvSensorService } from "./av-sensor.service";
import { AvVehicleState } from "./dto/av-sensor.dto";
export declare class AvSensorController {
    private readonly avSensorService;
    constructor(avSensorService: AvSensorService);
    getCurrentState(): Promise<AvVehicleState>;
    getHealth(): {
        status: string;
        timestamp: string;
    };
}
