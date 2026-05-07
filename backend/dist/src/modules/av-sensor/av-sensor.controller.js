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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvSensorController = void 0;
const common_1 = require("@nestjs/common");
const av_sensor_service_1 = require("./av-sensor.service");
let AvSensorController = class AvSensorController {
    avSensorService;
    constructor(avSensorService) {
        this.avSensorService = avSensorService;
    }
    async getCurrentState() {
        return this.avSensorService.getCurrentState();
    }
    getHealth() {
        return {
            status: "ok",
            timestamp: new Date().toISOString(),
        };
    }
};
exports.AvSensorController = AvSensorController;
__decorate([
    (0, common_1.Get)("state"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AvSensorController.prototype, "getCurrentState", null);
__decorate([
    (0, common_1.Get)("health"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], AvSensorController.prototype, "getHealth", null);
exports.AvSensorController = AvSensorController = __decorate([
    (0, common_1.Controller)("av"),
    __metadata("design:paramtypes", [av_sensor_service_1.AvSensorService])
], AvSensorController);
//# sourceMappingURL=av-sensor.controller.js.map