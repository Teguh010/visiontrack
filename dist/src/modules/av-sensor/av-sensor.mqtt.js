"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AvSensorMqtt_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvSensorMqtt = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mqtt = __importStar(require("mqtt"));
const av_sensor_service_1 = require("./av-sensor.service");
const av_sensor_gateway_1 = require("./av-sensor.gateway");
const VALID_CAMERAS = [
    'CAM_FRONT',
    'CAM_FRONT_LEFT',
    'CAM_FRONT_RIGHT',
    'CAM_BACK',
    'CAM_BACK_LEFT',
    'CAM_BACK_RIGHT',
];
let AvSensorMqtt = AvSensorMqtt_1 = class AvSensorMqtt {
    config;
    avSensorService;
    avSensorGateway;
    logger = new common_1.Logger(AvSensorMqtt_1.name);
    client;
    constructor(config, avSensorService, avSensorGateway) {
        this.config = config;
        this.avSensorService = avSensorService;
        this.avSensorGateway = avSensorGateway;
    }
    onModuleInit() {
        const brokerUrl = this.config.get("MQTT_BROKER_URL", "mqtt://localhost:1883");
        this.client = mqtt.connect(brokerUrl, {
            clientId: `av-sensor-backend-${Date.now()}`,
            clean: true,
            reconnectPeriod: 3000,
        });
        this.client.on("connect", () => {
            this.logger.log(`✅ Connected to MQTT broker: ${brokerUrl}`);
            const topics = [
                "vehicle/gps",
                "vehicle/camera/+",
                "vehicle/lidar",
                "vehicle/status",
            ];
            topics.forEach((topic) => {
                this.client.subscribe(topic, { qos: 0 }, (err) => {
                    if (err) {
                        this.logger.error(`❌ Failed to subscribe to ${topic}:`, err.message);
                    }
                    else {
                        this.logger.log(`📡 Subscribed to: ${topic}`);
                    }
                });
            });
        });
        this.client.on("message", (topic, message) => {
            void this.handleMessage(topic, message);
        });
        this.client.on("error", (err) => {
            this.logger.error("❌ MQTT Error:", err.message);
        });
        this.client.on("reconnect", () => {
            this.logger.warn("🔄 Reconnecting to MQTT broker...");
        });
    }
    onModuleDestroy() {
        this.client?.end();
    }
    async handleMessage(topic, messageBuffer) {
        if (!this.avSensorGateway.hasSubscribers()) {
            return;
        }
        try {
            const raw = JSON.parse(messageBuffer.toString());
            if (topic === "vehicle/gps") {
                await this.handleGps(raw);
            }
            else if (topic.startsWith("vehicle/camera/")) {
                await this.handleCamera(topic, raw);
            }
            else if (topic === "vehicle/lidar") {
                await this.handleLidar(raw);
            }
            else if (topic === "vehicle/status") {
                await this.handleStatus(raw);
            }
        }
        catch (err) {
            this.logger.error(`❌ Failed to parse MQTT message on ${topic}:`, err);
        }
    }
    async handleGps(payload) {
        if (payload.lat == null || payload.lon == null) {
            this.logger.warn("⚠️ GPS payload missing lat/lon");
            return;
        }
        await this.avSensorService.processGps(payload);
    }
    async handleCamera(topic, payload) {
        const channel = topic.split("/")[2];
        if (!VALID_CAMERAS.includes(channel)) {
            this.logger.warn(`⚠️ Unknown camera channel: ${channel}`);
            return;
        }
        if (!payload.image) {
            this.logger.warn(`⚠️ Camera payload missing image data`);
            return;
        }
        payload.camera = channel;
        await this.avSensorService.processCamera(payload);
    }
    async handleLidar(payload) {
        if (!payload.points || !Array.isArray(payload.points)) {
            this.logger.warn("⚠️ LiDAR payload missing points array");
            return;
        }
        await this.avSensorService.processLidar(payload);
    }
    async handleStatus(payload) {
        if (!payload.scene || payload.frame == null) {
            this.logger.warn("⚠️ Status payload missing required fields");
            return;
        }
        await this.avSensorService.processStatus(payload);
    }
};
exports.AvSensorMqtt = AvSensorMqtt;
exports.AvSensorMqtt = AvSensorMqtt = AvSensorMqtt_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        av_sensor_service_1.AvSensorService,
        av_sensor_gateway_1.AvSensorGateway])
], AvSensorMqtt);
//# sourceMappingURL=av-sensor.mqtt.js.map