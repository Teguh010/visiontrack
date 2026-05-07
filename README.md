# Real-Time Fleet Tracking System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/teguhbadru/realtime-tracking-system/actions/workflows/ci.yml/badge.svg)](.github/workflows/ci.yml)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)

> **Built with:** MQTT · NestJS · WebSocket · Redis · PostgreSQL · Next.js · Leaflet.js

A production-grade real-time fleet tracking system demonstrating IoT data ingestion, real-time communication, and geospatial visualization.

---

## 🏗️ Architecture

```
[GPS Simulator (Node.js)]
        │ MQTT publish every 3s
        ▼
[Mosquitto Broker :1883]
        │ subscribe wildcard vehicle/+/location
        ▼
[NestJS Backend :3000]
 ├── MQTT Consumer → parse & normalize
 ├── Stop Detection (speed < 5 km/h for 2 min)
 ├── Redis :6379 ← last position cache (fast reads)
 ├── PostgreSQL :5432 ← tracking history
 └── WebSocket Gateway (Socket.IO)
        │ emit vehicle:update
        ▼
[Next.js Dashboard :3001]
 ├── Live Map (Leaflet.js) — markers update in real-time
 ├── History Playback — polyline trajectory
 └── Analytics — speed chart + stop detection
```

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop (running)
- Node.js 18+

### 1. Start Infrastructure (Mosquitto + Redis + PostgreSQL)
```bash
docker compose up -d
```

### 2. Start Backend
```bash
cd backend
npm install
npx prisma migrate dev --name init   # first time only
npm run start:dev
```

### 3. Start GPS Simulator
```bash
cd simulator
npm install
npm start
```

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev -- --port 3001
```

### 5. Open Dashboard
```
http://localhost:3001
```

---

## 📡 MQTT Protocol

**Topic:** `vehicle/{vehicleId}/location`

**Payload:**
```json
{
  "vehicleId": "VH-001",
  "lat": -7.2575,
  "lon": 112.7521,
  "speed": 45.2,
  "heading": 90,
  "status": "MOVING",
  "timestamp": 1714210000
}
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/vehicles` | List all registered vehicles |
| `GET` | `/api/tracking/latest` | Last position of all vehicles (from Redis) |
| `GET` | `/api/tracking/history?vehicleId=VH-001&from=...&to=...` | Historical tracking points |

**WebSocket Event (Server → Client):**
```
vehicle:update → LastPosition object
```

---

## 🗂️ Project Structure

```
realtime-tracking-system/
├── docker-compose.yml          ← Mosquitto + Redis + PostgreSQL
├── mosquitto/config/           ← MQTT broker config
│
├── backend/                    ← NestJS API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── tracking/       ← MQTT consumer, WebSocket, HTTP API
│   │   │   └── vehicle/        ← Vehicle CRUD
│   │   ├── prisma/             ← Database service (Prisma v7)
│   │   └── redis/              ← Redis cache service
│   └── prisma/
│       └── schema.prisma       ← DB schema (vehicles, tracking_points)
│
├── simulator/                  ← GPS Simulator
│   └── src/simulator.ts        ← 3 vehicles, waypoint interpolation
│
└── frontend/                   ← Next.js 14 Dashboard
    ├── app/
    │   ├── page.tsx            ← Live Map
    │   ├── history/page.tsx    ← History Playback
    │   └── analytics/page.tsx  ← Speed Chart + Stop Detection
    ├── components/
    │   ├── FleetMap.tsx        ← Leaflet wrapper (dynamic import)
    │   ├── FleetMapInner.tsx   ← Leaflet map + markers
    │   ├── HistoryMapInner.tsx ← Trajectory polyline
    │   └── Sidebar.tsx         ← Navigation
    └── hooks/
        └── useFleetSocket.ts   ← Socket.IO WebSocket hook
```

---

## 🧠 Key Technical Decisions

### Stop Detection Algorithm
```
IF speed < 5 km/h for >= 2 minutes → status = STOPPED
ELSE → status = MOVING
```
Implemented as an in-memory FSM (Finite State Machine) per vehicle in `TrackingService`.

### Redis Caching Strategy
- Last position per vehicle stored as JSON with 24-hour TTL
- Key pattern: `vehicle:{vehicleId}:last_position`
- Enables O(1) reads for `/api/tracking/latest` — no DB query needed

### Real-Time Architecture
- No polling — pure event-driven via MQTT → WebSocket
- Socket.IO handles reconnection automatically

---

## 🏷️ CV Description

> *"Built a real-time fleet tracking system using MQTT (Mosquitto) for IoT data ingestion from GPS simulators, NestJS for backend processing with stop-detection logic, Redis for high-performance last-position caching, PostgreSQL for historical data storage, and Next.js with Leaflet.js for live map visualization via WebSocket."*

---

## 🔧 Port Reference

| Service | Port |
|---------|------|
| MQTT Broker | 1883 |
| NestJS API + WebSocket | 3000 |
| Next.js Frontend | 3001 |
| Redis | 6379 |
| PostgreSQL | 5432 |
