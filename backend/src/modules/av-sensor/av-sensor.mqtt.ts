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

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { MqttClient } from 'mqtt';
import { AvSensorService } from './av-sensor.service';
import { AV_TOPICS, CAMERA_CHANNELS } from './av-sensor.constants';
import {
  AvGpsPayload,
  AvCameraPayload,
  AvLidarPayload,
  AvStatusPayload,
  AvAnnotationsPayload,
  CameraChannel,
} from './dto/av-sensor.dto';

@Injectable()
export class AvSensorMqtt implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AvSensorMqtt.name);
  private client: MqttClient;

  constructor(
    private readonly config: ConfigService,
    private readonly avSensorService: AvSensorService,
  ) {}

  onModuleInit() {
    const brokerUrl = this.config.get<string>(
      'MQTT_BROKER_URL',
      'mqtt://localhost:1883',
    );

    this.client = mqtt.connect(brokerUrl, {
      clientId: `av-sensor-backend-${Date.now()}`,
      clean: true,
      reconnectPeriod: 3000,
    });

    this.client.on('connect', () => {
      this.logger.log(`✅ Connected to MQTT broker: ${brokerUrl}`);

      // Subscribe to all AV sensor topics
      const topics = [
        AV_TOPICS.gps,
        AV_TOPICS.cameraWildcard,
        AV_TOPICS.lidar,
        AV_TOPICS.status,
        AV_TOPICS.annotations,
      ];

      topics.forEach((topic) => {
        this.client.subscribe(topic, { qos: 0 }, (err) => {
          if (err) {
            this.logger.error(
              `❌ Failed to subscribe to ${topic}:`,
              err.message,
            );
          } else {
            this.logger.log(`📡 Subscribed to: ${topic}`);
          }
        });
      });
    });

    this.client.on('message', (topic, message) => {
      void this.handleMessage(topic, message);
    });

    this.client.on('error', (err) => {
      this.logger.error('❌ MQTT Error:', err.message);
    });

    this.client.on('reconnect', () => {
      this.logger.warn('🔄 Reconnecting to MQTT broker...');
    });
  }

  onModuleDestroy() {
    this.client?.end();
  }

  private async handleMessage(
    topic: string,
    messageBuffer: Buffer,
  ): Promise<void> {
    try {
      const raw: unknown = JSON.parse(messageBuffer.toString());

      if (topic === AV_TOPICS.gps) {
        await this.handleGps(raw as AvGpsPayload);
      } else if (topic.startsWith('vehicle/camera/')) {
        await this.handleCamera(topic, raw as AvCameraPayload);
      } else if (topic === AV_TOPICS.lidar) {
        await this.handleLidar(raw as AvLidarPayload);
      } else if (topic === AV_TOPICS.status) {
        await this.handleStatus(raw as AvStatusPayload);
      } else if (topic === AV_TOPICS.annotations) {
        await this.handleAnnotations(raw as AvAnnotationsPayload);
      }
    } catch (err) {
      this.logger.error(`❌ Failed to parse MQTT message on ${topic}:`, err);
    }
  }

  private async handleGps(payload: AvGpsPayload): Promise<void> {
    // Validate required fields
    if (payload.lat == null || payload.lon == null) {
      this.logger.warn('⚠️ GPS payload missing lat/lon');
      return;
    }

    await this.avSensorService.processGps(payload);
  }

  private async handleCamera(
    topic: string,
    payload: AvCameraPayload,
  ): Promise<void> {
    // Extract camera channel from topic: vehicle/camera/CAM_FRONT
    const channel = topic.split('/')[2] as CameraChannel;

    if (!CAMERA_CHANNELS.includes(channel as CameraChannel)) {
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
      this.logger.warn('⚠️ LiDAR payload missing points array');
      return;
    }

    await this.avSensorService.processLidar(payload);
  }

  private async handleStatus(payload: AvStatusPayload): Promise<void> {
    if (!payload.scene || payload.frame == null) {
      this.logger.warn('⚠️ Status payload missing required fields');
      return;
    }

    await this.avSensorService.processStatus(payload);
  }

  private async handleAnnotations(
    payload: AvAnnotationsPayload,
  ): Promise<void> {
    if (!payload.annotations || !Array.isArray(payload.annotations)) {
      this.logger.warn('⚠️ Annotations payload missing annotations array');
      return;
    }

    await this.avSensorService.processAnnotations(payload);
  }
}
