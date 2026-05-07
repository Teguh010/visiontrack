import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { TrackingGateway } from './tracking.gateway';
import { TrackingMqtt } from './tracking.mqtt';

@Module({
  controllers: [TrackingController],
  providers: [
    TrackingGateway,
    TrackingService,
    TrackingMqtt, // MQTT consumer starts on module init
  ],
  exports: [TrackingService],
})
export class TrackingModule {}
