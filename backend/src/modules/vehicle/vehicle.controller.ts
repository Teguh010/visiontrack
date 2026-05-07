import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { VehicleService } from './vehicle.service';

@Controller('vehicles')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  /**
   * GET /api/vehicles
   * Returns all registered vehicles
   */
  @Get()
  async findAll() {
    const vehicles = await this.vehicleService.findAll();
    return { count: vehicles.length, data: vehicles };
  }

  /**
   * GET /api/vehicles/:id
   * Returns a single vehicle by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const vehicle = await this.vehicleService.findOne(id);
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }
    return vehicle;
  }
}
