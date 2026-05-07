"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const adapter_pg_1 = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
let _prisma = null;
function createClient() {
    const connectionString = process.env.DATABASE_URL;
    const adapter = new adapter_pg_1.PrismaPg({ connectionString });
    return new PrismaClient({ adapter });
}
function getClient() {
    if (!_prisma)
        _prisma = createClient();
    return _prisma;
}
let PrismaService = class PrismaService {
    db = getClient();
    get vehicle() { return this.db.vehicle; }
    get trackingPoint() { return this.db.trackingPoint; }
    async onModuleInit() {
        await this.db.$connect();
        console.log("✅ Prisma connected to PostgreSQL");
    }
    async onModuleDestroy() {
        await this.db.$disconnect();
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)()
], PrismaService);
//# sourceMappingURL=prisma.service.js.map