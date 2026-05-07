/**
 * AV Sensor Module
 * ──────────────────────────────────────────────────────────────────
 * Handles autonomous vehicle sensor data from nuScenes replayer
 */

import { Module } from '@nestjs/common';
import { AvSensorController } from './av-sensor.controller';
import { AvSensorService } from './av-sensor.service';
import { AvSensorGateway } from './av-sensor.gateway';
import { AvSensorMqtt } from './av-sensor.mqtt';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [AvSensorController],
  providers: [AvSensorService, AvSensorGateway, AvSensorMqtt],
  exports: [AvSensorService],
})
export class AvSensorModule {}
