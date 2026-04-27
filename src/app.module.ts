import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { VehicleModule } from "./modules/vehicle/vehicle.module";
import { TrackingModule } from "./modules/tracking/tracking.module";

@Module({
  imports: [
    // Global config (reads .env)
    ConfigModule.forRoot({ isGlobal: true }),

    // Shared infrastructure
    PrismaModule,
    RedisModule,

    // Feature modules
    VehicleModule,
    TrackingModule,
  ],
})
export class AppModule {}
