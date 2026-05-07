/**
 * AV Sensor MQTT Consumer
 * ──────────────────────────────────────────────────────────────────
 * Subscribes to nuScenes replayer MQTT topics:
 *   vehicle/gps              → GPS/ego pose
 *   vehicle/camera/+         → Camera frames (6 channels)
 *   vehicle/lidar            → LiDAR point cloud
 *   vehicle/status           → Replay status
 *   vehicle/annotations      → 3D bounding box annotations
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as mqtt from "mqtt";
import { MqttClient } from "mqtt";
import { AvSensorService } from "./av-sensor.service";
import { AvSensorGateway } from "./av-sensor.gateway";
import {
  AvGpsPayload,
  AvCameraPayload,
  AvLidarPayload,
  AvStatusPayload,
  AvAnnotationsPayload,
  CameraChannel,
} from "./dto/av-sensor.dto";

const VALID_CAMERAS: CameraChannel[] = [
  'CAM_FRONT',
  'CAM_FRONT_LEFT',
  'CAM_FRONT_RIGHT',
  'CAM_BACK',
  'CAM_BACK_LEFT',
  'CAM_BACK_RIGHT',
];

@Injectable()
export class AvSensorMqtt implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AvSensorMqtt.name);
  private client: MqttClient;

  constructor(
    private readonly config: ConfigService,
    private readonly avSensorService: AvSensorService,
    private readonly avSensorGateway: AvSensorGateway,
  ) {}

  onModuleInit() {
    const brokerUrl = this.config.get<string>("MQTT_BROKER_URL", "mqtt://localhost:1883");

    this.client = mqtt.connect(brokerUrl, {
      clientId: `av-sensor-backend-${Date.now()}`,
      clean: true,
      reconnectPeriod: 3000,
    });

    this.client.on("connect", () => {
      this.logger.log(`✅ Connected to MQTT broker: ${brokerUrl}`);

      // Subscribe to all AV sensor topics
      const topics = [
        "vehicle/gps",
        "vehicle/camera/+",  // wildcard for all cameras
        "vehicle/lidar",
        "vehicle/status",
        "vehicle/annotations",
      ];

      topics.forEach((topic) => {
        this.client.subscribe(topic, { qos: 0 }, (err) => {
          if (err) {
            this.logger.error(`❌ Failed to subscribe to ${topic}:`, err.message);
          } else {
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

  private async handleMessage(topic: string, messageBuffer: Buffer): Promise<void> {
    // Skip processing if no subscribers
    if (!this.avSensorGateway.hasSubscribers()) {
      return;
    }

    try {
      const raw = JSON.parse(messageBuffer.toString());

      if (topic === "vehicle/gps") {
        await this.handleGps(raw as AvGpsPayload);
      } else if (topic.startsWith("vehicle/camera/")) {
        await this.handleCamera(topic, raw as AvCameraPayload);
      } else if (topic === "vehicle/lidar") {
        await this.handleLidar(raw as AvLidarPayload);
      } else if (topic === "vehicle/status") {
        await this.handleStatus(raw as AvStatusPayload);
      } else if (topic === "vehicle/annotations") {
        await this.handleAnnotations(raw as AvAnnotationsPayload);
      }
    } catch (err) {
      this.logger.error(`❌ Failed to parse MQTT message on ${topic}:`, err);
    }
  }

  private async handleGps(payload: AvGpsPayload): Promise<void> {
    // Validate required fields
    if (payload.lat == null || payload.lon == null) {
      this.logger.warn("⚠️ GPS payload missing lat/lon");
      return;
    }

    await this.avSensorService.processGps(payload);
  }

  private async handleCamera(topic: string, payload: AvCameraPayload): Promise<void> {
    // Extract camera channel from topic: vehicle/camera/CAM_FRONT
    const channel = topic.split("/")[2] as CameraChannel;

    if (!VALID_CAMERAS.includes(channel)) {
      this.logger.warn(`⚠️ Unknown camera channel: ${channel}`);
      return;
    }

    if (!payload.image) {
      this.logger.warn(`⚠️ Camera payload missing image data`);
      return;
    }

    // Ensure camera field matches topic
    payload.camera = channel;

    await this.avSensorService.processCamera(payload);
  }

  private async handleLidar(payload: AvLidarPayload): Promise<void> {
    if (!payload.points || !Array.isArray(payload.points)) {
      this.logger.warn("⚠️ LiDAR payload missing points array");
      return;
    }

    await this.avSensorService.processLidar(payload);
  }

  private async handleStatus(payload: AvStatusPayload): Promise<void> {
    if (!payload.scene || payload.frame == null) {
      this.logger.warn("⚠️ Status payload missing required fields");
      return;
    }

    await this.avSensorService.processStatus(payload);
  }

  private async handleAnnotations(payload: AvAnnotationsPayload): Promise<void> {
    if (!payload.annotations || !Array.isArray(payload.annotations)) {
      this.logger.warn("⚠️ Annotations payload missing annotations array");
      return;
    }

    await this.avSensorService.processAnnotations(payload);
  }
}
