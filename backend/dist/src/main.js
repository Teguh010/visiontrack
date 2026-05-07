"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({ transform: true, whitelist: true }));
    app.enableCors({
        origin: process.env.FRONTEND_URL || "http://localhost:3001",
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
    });
    app.setGlobalPrefix("api");
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`🚀 Fleet Tracking API running on: http://localhost:${port}`);
    console.log(`📡 WebSocket gateway: ws://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map