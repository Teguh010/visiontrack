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
var TrackingGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
let TrackingGateway = TrackingGateway_1 = class TrackingGateway {
    server;
    logger = new common_1.Logger(TrackingGateway_1.name);
    connectedClients = 0;
    afterInit() {
        this.logger.log("📡 WebSocket Gateway initialized");
    }
    handleConnection(client) {
        this.connectedClients++;
        this.logger.log(`🔌 Client connected: ${client.id} (total: ${this.connectedClients})`);
    }
    handleDisconnect(client) {
        this.connectedClients--;
        this.logger.log(`🔌 Client disconnected: ${client.id} (total: ${this.connectedClients})`);
    }
    emitVehicleUpdate(position) {
        this.server.emit("vehicle:update", position);
    }
    handleSubscribeVehicle(vehicleId, client) {
        void client.join(`vehicle:${vehicleId}`);
        this.logger.log(`📍 Client ${client.id} subscribed to vehicle: ${vehicleId}`);
        return { event: "subscribed", vehicleId };
    }
};
exports.TrackingGateway = TrackingGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], TrackingGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)("subscribe:vehicle"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], TrackingGateway.prototype, "handleSubscribeVehicle", null);
exports.TrackingGateway = TrackingGateway = TrackingGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:3001",
            methods: ["GET", "POST"],
            credentials: true,
        },
        transports: ["websocket", "polling"],
    })
], TrackingGateway);
//# sourceMappingURL=tracking.gateway.js.map