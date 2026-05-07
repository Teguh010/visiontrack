"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingController = void 0;
const common_1 = require("@nestjs/common");
const tracking_service_1 = require("./tracking.service");
let TrackingController = class TrackingController {
    trackingService;
    constructor(trackingService) {
        this.trackingService = trackingService;
    }
    async getLatest() {
        const positions = await this.trackingService.getLatestPositions();
        return {
            count: positions.length,
            data: positions,
        };
    }
    async getHistory(vehicleId, from, to) {
        if (!vehicleId) {
            throw new common_1.BadRequestException("vehicleId is required");
        }
        const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            throw new common_1.BadRequestException("Invalid date format. Use ISO 8601 (e.g. 2024-01-01T00:00:00Z)");
        }
        if (fromDate >= toDate) {
            throw new common_1.BadRequestException("'from' must be before 'to'");
        }
        const points = await this.trackingService.getHistory(vehicleId, fromDate, toDate);
        return {
            vehicleId,
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            count: points.length,
            data: points,
        };
    }
};
exports.TrackingController = TrackingController;
__decorate([
    (0, common_1.Get)("latest"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TrackingController.prototype, "getLatest", null);
__decorate([
    (0, common_1.Get)("history"),
    __param(0, (0, common_1.Query)("vehicleId")),
    __param(1, (0, common_1.Query)("from")),
    __param(2, (0, common_1.Query)("to")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], TrackingController.prototype, "getHistory", null);
exports.TrackingController = TrackingController = __decorate([
    (0, common_1.Controller)("tracking"),
    __metadata("design:paramtypes", [tracking_service_1.TrackingService])
], TrackingController);
//# sourceMappingURL=tracking.controller.js.map