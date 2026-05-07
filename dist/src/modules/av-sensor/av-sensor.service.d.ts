import { RedisService } from "../../redis/redis.service";
import { AvSensorGateway } from "./av-sensor.gateway";
import { AvGpsPayload, AvCameraPayload, AvLidarPayload, AvStatusPayload, AvAnnotationsPayload, AvVehicleState } from "./dto/av-sensor.dto";
export declare class AvSensorService {
    private readonly redis;
    private readonly gateway;
    private readonly logger;
    constructor(redis: RedisService, gateway: AvSensorGateway);
    processGps(payload: AvGpsPayload): Promise<void>;
    processCamera(payload: AvCameraPayload): Promise<void>;
    processLidar(payload: AvLidarPayload): Promise<void>;
    processStatus(payload: AvStatusPayload): Promise<void>;
    processAnnotations(payload: AvAnnotationsPayload): Promise<void>;
    getCurrentState(): Promise<AvVehicleState>;
}
