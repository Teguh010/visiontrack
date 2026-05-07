import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { TrackingService } from './tracking.service';

@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  /**
   * GET /api/tracking/latest
   * Returns last known position for all vehicles (served from Redis)
   */
  @Get('latest')
  async getLatest() {
    const positions = await this.trackingService.getLatestPositions();
    return {
      count: positions.length,
      data: positions,
    };
  }

  /**
   * GET /api/tracking/history?vehicleId=VH-001&from=2024-01-01&to=2024-01-02
   * Returns tracking history from PostgreSQL for a date range
   */
  @Get('history')
  async getHistory(
    @Query('vehicleId') vehicleId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!vehicleId) {
      throw new BadRequestException('vehicleId is required');
    }

    const fromDate = from
      ? new Date(from)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException(
        'Invalid date format. Use ISO 8601 (e.g. 2024-01-01T00:00:00Z)',
      );
    }

    if (fromDate >= toDate) {
      throw new BadRequestException("'from' must be before 'to'");
    }

    const points = await this.trackingService.getHistory(
      vehicleId,
      fromDate,
      toDate,
    );

    return {
      vehicleId,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      count: points.length,
      data: points,
    };
  }
}
