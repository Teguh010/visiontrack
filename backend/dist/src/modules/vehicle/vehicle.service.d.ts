import { PrismaService } from "../../prisma/prisma.service";
export declare class VehicleService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<unknown[]>;
    findOne(id: string): Promise<unknown>;
}
