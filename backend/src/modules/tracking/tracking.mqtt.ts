/**
 * Tracking MQTT Consumer
 * ──────────────────────────────────────────────────────────────────
 * Subscribes to MQTT topic: vehicle/+/location
 * Parses, validates, and forwards data to TrackingService
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
import { TrackingService } from './tracking.service';
import { MqttPayload } from './dto/mqtt-payload.dto';

@Injectable()
export class TrackingMqtt implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrackingMqtt.name);
  private client: MqttClient;

  constructor(
    private readonly config: ConfigService,
    private readonly trackingService: TrackingService,
  ) {}

  onModuleInit() {
    const brokerUrl = this.config.get<string>(
      'MQTT_BROKER_URL',
      'mqtt://localhost:1883',
    );

    this.client = mqtt.connect(brokerUrl, {
      clientId: `fleet-backend-${Date.now()}`,
      clean: true,
      reconnectPeriod: 3000,
    });

    this.client.on('connect', () => {
      this.logger.log(`✅ Connected to MQTT broker: ${brokerUrl}`);
      // Wildcard: subscribe to all vehicles
      this.client.subscribe('vehicle/+/location', { qos: 1 }, (err) => {
        if (err) {
          this.logger.error('❌ Failed to subscribe:', err.message);
        } else {
          this.logger.log('📡 Subscribed to: vehicle/+/location');
        }
      });
    });

    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message);
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

  private handleMessage(topic: string, messageBuffer: Buffer) {
    try {
      // Parse raw message
      const raw = JSON.parse(messageBuffer.toString()) as MqttPayload;

      // Extract vehicleId from topic: "vehicle/VH-001/location"
      const parts = topic.split('/');
      const vehicleId = parts[1];

      if (!vehicleId) {
        this.logger.warn(
          `⚠️  Could not extract vehicleId from topic: ${topic}`,
        );
        return;
      }

      // Validate required fields
      if (raw.lat == null || raw.lon == null || raw.speed == null) {
        this.logger.warn(
          `⚠️  Invalid payload from ${vehicleId}: missing required fields`,
        );
        return;
      }

      // Forward to service for processing
      void this.trackingService.processLocation({
        vehicleId,
        vehicleType: raw.vehicleType ?? 'CITY',
        lat: this.normalizeCoord(raw.lat, -90, 90),
        lon: this.normalizeCoord(raw.lon, -180, 180),
        speed: Math.max(0, raw.speed),
        heading: raw.heading ?? 0,
        driveState: raw.driveState ?? 'DRIVING',
        timestamp: raw.timestamp ? new Date(raw.timestamp * 1000) : new Date(),
      });
    } catch (err) {
      this.logger.error(`❌ Failed to parse MQTT message on ${topic}:`, err);
    }
  }

  /** Clamp coordinate to valid range */
  private normalizeCoord(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
