import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { VehicleModule } from './modules/vehicle/vehicle.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AvSensorModule } from './modules/av-sensor/av-sensor.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    RedisModule,
    VehicleModule,
    TrackingModule,
    ReportsModule,
    AvSensorModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
