<div align="center">

# 🖥️ AV Sensor & Fleet Tracking — Backend

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MQTT](https://img.shields.io/badge/MQTT-660066?style=for-the-badge&logo=mqtt&logoColor=white)](https://mqtt.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)

**Real-time backend for Autonomous Vehicle sensor processing & Fleet Tracking**

</div>

---

## 🎯 Overview

NestJS backend that ingests sensor data from autonomous vehicles (via MQTT), processes it in real-time, and broadcasts to connected clients via WebSocket. Supports both AV sensor visualization (nuScenes dataset) and fleet GPS tracking.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **MQTT Consumer** | Subscribe to vehicle sensor topics with wildcard support |
| **Real-time WebSocket** | Socket.IO gateway for instant data broadcast |
| **Redis Caching** | Latest state cached for fast initial load |
| **PostgreSQL Storage** | Historical tracking data with Prisma ORM |
| **Modular Architecture** | Separate modules for AV sensors and fleet tracking |
| **Type Safety** | Full TypeScript with DTOs and validation |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────┘

                    MQTT Broker (Mosquitto :1883)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NestJS Backend (:3000)                             │
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │   MQTT Module   │───▶│  Service Layer  │───▶│ WebSocket Gateway│         │
│  │                 │    │                 │    │                 │          │
│  │ • Subscribe     │    │ • Validation    │    │ • Socket.IO     │          │
│  │ • Parse JSON    │    │ • Transform     │    │ • Namespaces    │          │
│  │ • Route msgs    │    │ • Business logic│    │ • Broadcast     │          │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘          │
│           │                     │                      │                     │
│           │                     ▼                      │                     │
│           │           ┌─────────────────┐              │                     │
│           │           │  Redis Cache    │              │                     │
│           │           │  (Latest State) │              │                     │
│           │           └─────────────────┘              │                     │
│           │                     │                      │                     │
│           │                     ▼                      ▼                     │
│           │           ┌─────────────────┐    ┌─────────────────┐            │
│           │           │   PostgreSQL    │    │    Frontend     │            │
│           │           │   (History)     │    │    Clients      │            │
│           └──────────▶└─────────────────┘    └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. MQTT Message Received
   │
   ▼
2. av-sensor.mqtt.ts (or tracking.mqtt.ts)
   • Parse JSON payload
   • Validate required fields
   • Route to appropriate handler
   │
   ▼
3. av-sensor.service.ts
   • Transform data (e.g., add channel to camera)
   • Cache latest state to Redis
   • Optionally save to PostgreSQL
   │
   ▼
4. av-sensor.gateway.ts
   • Emit event to all connected clients
   • Namespace: /av for AV sensors, default for fleet
```

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── app.module.ts           # Root module
│   ├── main.ts                 # Application entry point
│   │
│   ├── modules/
│   │   ├── av-sensor/          # AV Sensor Module
│   │   │   ├── av-sensor.module.ts
│   │   │   ├── av-sensor.mqtt.ts       # MQTT subscriber
│   │   │   ├── av-sensor.service.ts    # Business logic
│   │   │   ├── av-sensor.gateway.ts    # WebSocket gateway
│   │   │   ├── av-sensor.controller.ts # REST endpoints
│   │   │   └── dto/
│   │   │       └── av-sensor.dto.ts    # Type definitions
│   │   │
│   │   ├── tracking/           # Fleet Tracking Module
│   │   │   ├── tracking.module.ts
│   │   │   ├── tracking.mqtt.ts
│   │   │   ├── tracking.service.ts
│   │   │   └── tracking.gateway.ts
│   │   │
│   │   └── vehicle/            # Vehicle Management
│   │       ├── vehicle.module.ts
│   │       ├── vehicle.service.ts
│   │       └── vehicle.controller.ts
│   │
│   ├── prisma/                 # Database Service
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   └── redis/                  # Cache Service
│       ├── redis.module.ts
│       └── redis.service.ts
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Database migrations
│
└── test/                       # E2E tests
```

---

## 📡 MQTT Topics

### AV Sensor Topics

| Topic | Description | Handler |
|-------|-------------|---------|
| `vehicle/gps` | Ego vehicle position | `handleGps()` |
| `vehicle/camera/+` | Camera frames (6 channels) | `handleCamera()` |
| `vehicle/lidar` | LiDAR point cloud | `handleLidar()` |
| `vehicle/status` | Replay status | `handleStatus()` |
| `vehicle/annotations` | 3D object detections | `handleAnnotations()` |

### Fleet Tracking Topics

| Topic | Description | Handler |
|-------|-------------|---------|
| `vehicle/+/location` | Vehicle GPS position | `handleLocation()` |

---

## 🔌 WebSocket Events

### Namespace: `/av` (AV Sensors)

| Event | Direction | Payload |
|-------|-----------|---------|
| `av:gps` | Server → Client | `AvGpsData` |
| `av:camera` | Server → Client | `AvCameraData` |
| `av:lidar` | Server → Client | `AvLidarData` |
| `av:status` | Server → Client | `AvStatusData` |
| `av:annotations` | Server → Client | `AvAnnotationsData` |

### Default Namespace (Fleet Tracking)

| Event | Direction | Payload |
|-------|-----------|---------|
| `vehicle:update` | Server → Client | `VehiclePosition` |
| `vehicle:stopped` | Server → Client | `StopEvent` |

---

## 🗄️ Database Schema

```prisma
model Vehicle {
  id          String   @id @default(cuid())
  vehicleId   String   @unique
  name        String?
  type        VehicleType @default(DELIVERY)
  status      VehicleStatus @default(ACTIVE)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  trackingHistory TrackingHistory[]
}

model TrackingHistory {
  id        String   @id @default(cuid())
  vehicleId String
  lat       Float
  lon       Float
  speed     Float?
  heading   Float?
  status    String?
  timestamp DateTime
  vehicle   Vehicle  @relation(fields: [vehicleId], references: [vehicleId])
}
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker (for Mosquitto, Redis, PostgreSQL)

### Installation

```bash
# Install dependencies
npm install

# Setup database
npx prisma migrate dev

# Run in development mode
npm run start:dev

# Build for production
npm run build

# Run production
npm run start:prod
```

### Environment Variables

Create `.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tracking?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883
```

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **NestJS** | Modular Node.js framework with DI |
| **TypeScript** | Type safety |
| **Socket.IO** | Real-time WebSocket server |
| **MQTT.js** | MQTT client for broker communication |
| **Prisma** | Type-safe ORM for PostgreSQL |
| **Redis (ioredis)** | In-memory caching |
| **class-validator** | DTO validation |

---

## 📊 Key Modules

### AvSensorModule

Handles all autonomous vehicle sensor data:

```typescript
@Module({
  imports: [RedisModule, PrismaModule],
  providers: [AvSensorMqtt, AvSensorService, AvSensorGateway],
  controllers: [AvSensorController],
  exports: [AvSensorService],
})
export class AvSensorModule {}
```

**Service Methods:**
- `processGps(payload)` — Cache GPS, emit to clients
- `processCamera(payload)` — Cache camera frame, emit
- `processLidar(payload)` — Cache point cloud, emit
- `processAnnotations(payload)` — Cache detections, emit
- `getCurrentState()` — Get latest state from Redis

### TrackingModule

Handles fleet GPS tracking:

```typescript
@Module({
  imports: [RedisModule, PrismaModule, VehicleModule],
  providers: [TrackingMqtt, TrackingService, TrackingGateway],
  controllers: [TrackingController],
})
export class TrackingModule {}
```

**Features:**
- Stop detection (speed < 5 km/h for 2+ min)
- History storage to PostgreSQL
- Redis cache for latest positions

---

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/av-sensor/state` | Current AV sensor state |
| `GET` | `/api/vehicles` | List all vehicles |
| `GET` | `/api/tracking/latest` | Latest vehicle positions |
| `GET` | `/api/tracking/history` | Historical tracking data |

---

## 📄 License

MIT License

---

## 👤 Author Teguh Badrusalam

Fullstack Developer specializing in **NestJS**, **Next.js**, and **GIS/AV Systems**

---

<div align="center">

*Part of the Real-Time AV Sensor & Fleet Tracking System*

</div>
