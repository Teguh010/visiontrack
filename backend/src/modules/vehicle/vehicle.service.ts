import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class VehicleService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get all registered vehicles */
  async findAll() {
    return this.prisma.vehicle.findMany({
      orderBy: { id: "asc" },
    });
  }

  /** Get a single vehicle by ID */
  async findOne(id: string) {
    return this.prisma.vehicle.findUnique({ where: { id } });
  }
}
