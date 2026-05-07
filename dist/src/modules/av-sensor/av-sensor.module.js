"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvSensorModule = void 0;
const common_1 = require("@nestjs/common");
const av_sensor_controller_1 = require("./av-sensor.controller");
const av_sensor_service_1 = require("./av-sensor.service");
const av_sensor_gateway_1 = require("./av-sensor.gateway");
const av_sensor_mqtt_1 = require("./av-sensor.mqtt");
const redis_module_1 = require("../../redis/redis.module");
let AvSensorModule = class AvSensorModule {
};
exports.AvSensorModule = AvSensorModule;
exports.AvSensorModule = AvSensorModule = __decorate([
    (0, common_1.Module)({
        imports: [redis_module_1.RedisModule],
        controllers: [av_sensor_controller_1.AvSensorController],
        providers: [av_sensor_service_1.AvSensorService, av_sensor_gateway_1.AvSensorGateway, av_sensor_mqtt_1.AvSensorMqtt],
        exports: [av_sensor_service_1.AvSensorService],
    })
], AvSensorModule);
//# sourceMappingURL=av-sensor.module.js.map