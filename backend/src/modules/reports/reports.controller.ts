import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /api/reports/fleet-overview
   * Snapshot realtime semua kendaraan + jarak hari ini
   */
  @Get('fleet-overview')
  async getFleetOverview() {
    return this.reportsService.getFleetOverview();
  }

  /**
   * GET /api/reports/trip?vehicleId=VH-001&from=2024-01-01T00:00:00Z&to=2024-01-01T23:59:59Z
   * Laporan perjalanan lengkap: jarak, durasi, stop events
   */
  @Get('trip')
  async getTripReport(
    @Query('vehicleId') vehicleId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!vehicleId) throw new BadRequestException('vehicleId is required');

    const fromDate = from
      ? new Date(from)
      : (() => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          return d;
        })();
    const toDate = to ? new Date(to) : new Date();

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    return this.reportsService.getTripReport(vehicleId, fromDate, toDate);
  }

  /**
   * GET /api/reports/speed-distribution?vehicleId=VH-001&from=...&to=...
   * Distribusi kecepatan dalam % (stopped / slow / city / fast / highway)
   */
  @Get('speed-distribution')
  async getSpeedDistribution(
    @Query('vehicleId') vehicleId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!vehicleId) throw new BadRequestException('vehicleId is required');

    const fromDate = from
      ? new Date(from)
      : (() => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          return d;
        })();
    const toDate = to ? new Date(to) : new Date();

    return this.reportsService.getSpeedDistribution(
      vehicleId,
      fromDate,
      toDate,
    );
  }
}
