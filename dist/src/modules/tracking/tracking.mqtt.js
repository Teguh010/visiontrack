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
var TrackingMqtt_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingMqtt = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mqtt = __importStar(require("mqtt"));
const tracking_service_1 = require("./tracking.service");
let TrackingMqtt = TrackingMqtt_1 = class TrackingMqtt {
    config;
    trackingService;
    logger = new common_1.Logger(TrackingMqtt_1.name);
    client;
    constructor(config, trackingService) {
        this.config = config;
        this.trackingService = trackingService;
    }
    onModuleInit() {
        const brokerUrl = this.config.get("MQTT_BROKER_URL", "mqtt://localhost:1883");
        this.client = mqtt.connect(brokerUrl, {
            clientId: `fleet-backend-${Date.now()}`,
            clean: true,
            reconnectPeriod: 3000,
        });
        this.client.on("connect", () => {
            this.logger.log(`✅ Connected to MQTT broker: ${brokerUrl}`);
            this.client.subscribe("vehicle/+/location", { qos: 1 }, (err) => {
                if (err) {
                    this.logger.error("❌ Failed to subscribe:", err.message);
                }
                else {
                    this.logger.log("📡 Subscribed to: vehicle/+/location");
                }
            });
        });
        this.client.on("message", (topic, message) => {
            this.handleMessage(topic, message);
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
    handleMessage(topic, messageBuffer) {
        try {
            const raw = JSON.parse(messageBuffer.toString());
            const parts = topic.split("/");
            const vehicleId = parts[1];
            if (!vehicleId) {
                this.logger.warn(`⚠️  Could not extract vehicleId from topic: ${topic}`);
                return;
            }
            if (raw.lat == null || raw.lon == null || raw.speed == null) {
                this.logger.warn(`⚠️  Invalid payload from ${vehicleId}: missing required fields`);
                return;
            }
            void this.trackingService.processLocation({
                vehicleId,
                lat: this.normalizeCoord(raw.lat, -90, 90),
                lon: this.normalizeCoord(raw.lon, -180, 180),
                speed: Math.max(0, raw.speed),
                heading: raw.heading ?? 0,
                timestamp: raw.timestamp
                    ? new Date(raw.timestamp * 1000)
                    : new Date(),
            });
        }
        catch (err) {
            this.logger.error(`❌ Failed to parse MQTT message on ${topic}:`, err);
        }
    }
    normalizeCoord(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
};
exports.TrackingMqtt = TrackingMqtt;
exports.TrackingMqtt = TrackingMqtt = TrackingMqtt_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        tracking_service_1.TrackingService])
], TrackingMqtt);
//# sourceMappingURL=tracking.mqtt.js.map