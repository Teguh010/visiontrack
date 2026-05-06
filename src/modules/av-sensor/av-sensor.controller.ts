/**
 * AV Sensor Controller
 * ──────────────────────────────────────────────────────────────────
 * REST API endpoints for autonomous vehicle sensor data
 */

import { Controller, Get } from "@nestjs/common";
import { AvSensorService } from "./av-sensor.service";
import { AvVehicleState } from "./dto/av-sensor.dto";

@Controller("av")
export class AvSensorController {
  constructor(private readonly avSensorService: AvSensorService) {}

  /**
   * GET /av/state
   * Returns the current AV vehicle state (GPS, cameras, lidar, status)
   * Useful for initial state when client connects
   */
  @Get("state")
  async getCurrentState(): Promise<AvVehicleState> {
    return this.avSensorService.getCurrentState();
  }

  /**
   * GET /av/health
   * Health check for AV sensor module
   */
  @Get("health")
  getHealth(): { status: string; timestamp: string } {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
