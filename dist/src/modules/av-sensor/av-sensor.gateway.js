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
var AvSensorGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvSensorGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const AV_ROOM = "av-sensor-stream";
let AvSensorGateway = AvSensorGateway_1 = class AvSensorGateway {
    server;
    logger = new common_1.Logger(AvSensorGateway_1.name);
    subscriberCount = 0;
    afterInit() {
        this.logger.log("🚗 AV Sensor WebSocket Gateway initialized (namespace: /av)");
    }
    handleConnection(client) {
        this.logger.debug(`🔌 Client connected to /av: ${client.id}`);
    }
    handleDisconnect(client) {
        if (client.rooms.has(AV_ROOM)) {
            this.subscriberCount--;
            this.logger.log(`📡 AV subscriber disconnected: ${client.id} (total: ${this.subscriberCount})`);
        }
    }
    handleSubscribe(client) {
        void client.join(AV_ROOM);
        this.subscriberCount++;
        this.logger.log(`📡 Client ${client.id} subscribed to AV stream (total: ${this.subscriberCount})`);
        return { event: "av:subscribed", success: true };
    }
    handleUnsubscribe(client) {
        void client.leave(AV_ROOM);
        this.subscriberCount--;
        this.logger.log(`📡 Client ${client.id} unsubscribed from AV stream (total: ${this.subscriberCount})`);
        return { event: "av:unsubscribed", success: true };
    }
    hasSubscribers() {
        return this.subscriberCount > 0;
    }
    emitGps(data) {
        this.server.to(AV_ROOM).emit("av:gps", data);
    }
    emitCamera(data) {
        this.server.to(AV_ROOM).emit("av:camera", data);
    }
    emitLidar(data) {
        this.server.to(AV_ROOM).emit("av:lidar", data);
    }
    emitStatus(data) {
        this.server.to(AV_ROOM).emit("av:status", data);
    }
};
exports.AvSensorGateway = AvSensorGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], AvSensorGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)("av:subscribe"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], AvSensorGateway.prototype, "handleSubscribe", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("av:unsubscribe"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], AvSensorGateway.prototype, "handleUnsubscribe", null);
exports.AvSensorGateway = AvSensorGateway = AvSensorGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:3001",
            methods: ["GET", "POST"],
            credentials: true,
        },
        transports: ["websocket", "polling"],
        namespace: "/av",
    })
], AvSensorGateway);
//# sourceMappingURL=av-sensor.gateway.js.map