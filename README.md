<div align="center">

# 🚗 VisionTrack

### Real-Time Fleet Tracking & Autonomous Vehicle Sensor Platform

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![CI](https://github.com/Teguh010/visiontrack/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Teguh010/visiontrack/actions/workflows/ci.yml?query=branch%3Amain)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)

<p align="center">
  <strong>A production-grade platform for real-time vehicle telemetry ingestion, processing, and visualization</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-nuscenes-dataset-setup-av-sensor">nuScenes Setup</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-documentation">Docs</a> •
  <a href="#-contributing">Contributing</a>
</p>

</div>

---

## ✨ Features

### 🗺️ Fleet Tracking
- **Real-time GPS tracking** — Sub-second latency vehicle position updates
- **Interactive map dashboard** — Leaflet.js with smooth marker animations
- **Stop detection** — Automatic detection when vehicles stop (speed < 5 km/h for 2+ min)
- **History playback** — Replay vehicle trajectories with timeline controls
- **Analytics dashboard** — Speed charts, stop events, and fleet statistics

### 🚙 Autonomous Vehicle Sensor Visualization
- **6-camera grid view** — Front, back, and side cameras from nuScenes dataset
- **LiDAR point cloud** — Real-time 3D point cloud visualization
- **3D bounding boxes** — Object detection annotations overlay
- **GPS/IMU data** — Ego vehicle position and heading
- **Scene replay** — Frame-by-frame playback of AV sensor data

### 🔧 Technical Highlights
- **Event-driven architecture** — MQTT + WebSocket for real-time data flow
- **Modular monorepo** — Cleanly separated backend, frontend, simulator, and replayer
- **Type-safe** — Full TypeScript across all packages
- **Production-ready** — Docker Compose, CI/CD, proper error handling

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              VISIONTRACK PLATFORM                                │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐     ┌──────────────┐
  │ GPS Simulator│     │  nuScenes    │
  │  (Node.js)   │     │  Replayer    │
  │              │     │  (Python)    │
  └──────┬───────┘     └──────┬───────┘
         │                    │
         │  MQTT publish      │  MQTT publish
         │  every 3s          │  every 500ms
         ▼                    ▼
  ┌─────────────────────────────────────┐
  │     Mosquitto MQTT Broker :1883     │
  │     (Message Queue)                 │
  └──────────────────┬──────────────────┘
                     │
                     │ Subscribe: vehicle/#
                     ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │                    NestJS Backend :3000                          │
  │                                                                  │
  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
  │  │ MQTT Module │─▶│  Services   │─▶│  WebSocket  │              │
  │  │             │  │             │  │  Gateway    │              │
  │  │ • Subscribe │  │ • Validate  │  │             │              │
  │  │ • Parse     │  │ • Transform │  │ • Socket.IO │              │
  │  │ • Route     │  │ • Cache     │  │ • Broadcast │              │
  │  └─────────────┘  └─────────────┘  └─────────────┘              │
  │         │               │                 │                      │
  │         │               ▼                 │                      │
  │         │        ┌─────────────┐          │                      │
  │         │        │    Redis    │          │                      │
  │         │        │   (Cache)   │          │                      │
  │         │        └─────────────┘          │                      │
  │         │               │                 │                      │
  │         ▼               ▼                 ▼                      │
  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
  │  │ PostgreSQL  │  │   History   │  │  Frontend   │              │
  │  │  (Prisma)   │  │   Storage   │  │  Clients    │              │
  │  └─────────────┘  └─────────────┘  └─────────────┘              │
  └─────────────────────────────────────────────────────────────────┘
                                              │
                                              │ WebSocket
                                              ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │                  Next.js Dashboard :3001                         │
  │                                                                  │
  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
  │  │  Fleet Map  │  │  AV Sensor  │  │  Analytics  │              │
  │  │  (Leaflet)  │  │  Dashboard  │  │  (Recharts) │              │
  │  └─────────────┘  └─────────────┘  └─────────────┘              │
  └─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** (running)
- **Node.js 18+**
- **Python 3.8+** (for AV sensor replayer)

### 1. Clone & Setup

```bash
git clone https://github.com/Teguh010/visiontrack.git
cd visiontrack
```

### 2. Start Infrastructure

```bash
docker compose up -d
```

This starts:
- 🦟 **Mosquitto** MQTT Broker (port 1883)
- 🔴 **Redis** Cache (port 6379)
- 🐘 **PostgreSQL** Database (port 5432)

### 3. Start Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev
```

### 4. Start Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 5. Start Simulator (Fleet Tracking)

```bash
cd simulator
npm install
npm start
```

### 6. Open Dashboard

| Dashboard | URL |
|-----------|-----|
| Fleet Tracking | http://localhost:3001 |
| AV Sensor View | http://localhost:3001/av |
| Analytics | http://localhost:3001/analytics |
| History Playback | http://localhost:3001/history |

---

## 📦 nuScenes Dataset Setup (AV Sensor)

This section explains how to prepare the AV sensor dataset so the `/av` page runs with full features (camera, LiDAR, ego GPS, and annotations).

### 1) Download the dataset from nuScenes

1. Sign up / log in at the [nuScenes official website](https://www.nuscenes.org/).
2. Download the **`v1.0-mini`** package (recommended for local development and demos).
3. Extract the dataset to:

```bash
visiontrack/data/nuscenes/
```

Expected minimum structure:

```text
data/nuscenes/
├── samples/
├── sweeps/
├── maps/
└── v1.0-mini/
    ├── sample.json
    ├── sample_data.json
    ├── sample_annotation.json
    ├── scene.json
    └── ...
```

### 2) Run the nuScenes replayer

```bash
cd replayer
python3 nuscenes_replayer.py --list-scenes
python3 nuscenes_replayer.py --scene 0 --speed 1.0 --loop
```

> The replayer default `dataroot` is `../data/nuscenes`, so make sure your dataset follows the folder structure above.

### 3) Example payloads published to MQTT

The replayer publishes data to these AV topics:

- `vehicle/gps`
- `vehicle/camera/CAM_*`
- `vehicle/lidar`
- `vehicle/annotations`
- `vehicle/status`

Compact payload example:

```json
{
  "gps": {
    "lat": 42.3368491,
    "lon": -71.0578536,
    "heading": 127.3,
    "speed_kph": 22.4,
    "x": 410.2,
    "y": 1180.6,
    "frame": 42
  },
  "lidar": {
    "points": [[1.24, -0.33, 0.45, 0.73], [1.11, -0.41, 0.40, 0.69]],
    "count": 300
  },
  "annotations": {
    "count": 8,
    "example": {
      "category": "vehicle.car",
      "x": 12.5,
      "y": -3.2,
      "z": 0.1,
      "width": 1.9,
      "length": 4.4,
      "height": 1.6,
      "yaw": 15.2,
      "distance": 12.9
    }
  }
}
```

### 4) How data is processed in this project

End-to-end AV sensor data flow:

1. **Replayer (Python)** reads nuScenes frames and publishes them to MQTT.
2. **NestJS backend** subscribes to `vehicle/#`, then:
   - validates and normalizes payloads
   - transforms coordinates/objects to frontend-friendly shape
   - stores latest state in Redis
   - broadcasts real-time updates to WebSocket namespace `/av`
3. **Next.js frontend (`/av`)** consumes the WebSocket stream and renders:
   - 6-camera grid
   - LiDAR point cloud (2D/3D views)
   - 3D bounding boxes with category metadata
   - ego GPS/heading with map overlays

### 5) Why this is relevant for real AV integration

This project architecture is **source-agnostic**: upstream data can come from the nuScenes replayer (offline) or a real vehicle stack (online), as long as topic/payload contracts are equivalent.

For real AV integration, in most cases you only need to:

- replace `nuscenes_replayer.py` with a ROS2/CAN/perception bridge publisher
- keep publishing to the same MQTT topics
- keep backend + frontend mostly unchanged

---

## 📁 Project Structure

```
visiontrack/
├── 📄 LICENSE                    # MIT License
├── 📄 CONTRIBUTING.md            # Contribution guidelines
├── 📄 CODE_OF_CONDUCT.md         # Community standards
├── 📄 SECURITY.md                # Security policy
├── 📄 CHANGELOG.md               # Version history
├── 📄 ARCHITECTURE.md            # Detailed architecture docs
├── 📄 docker-compose.yml         # Infrastructure setup
│
├── 📁 .github/                   # GitHub templates & CI
│   ├── workflows/ci.yml
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── 📁 backend/                   # NestJS API Server
│   ├── src/
│   │   ├── modules/
│   │   │   ├── av-sensor/        # AV sensor processing
│   │   │   ├── tracking/         # Fleet GPS tracking
│   │   │   └── vehicle/          # Vehicle management
│   │   ├── prisma/               # Database service
│   │   └── redis/                # Cache service
│   └── prisma/schema.prisma
│
├── 📁 frontend/                  # Next.js Dashboard
│   ├── app/
│   │   ├── page.tsx              # Fleet map
│   │   ├── av/page.tsx           # AV sensor dashboard
│   │   ├── analytics/page.tsx    # Analytics
│   │   └── history/page.tsx      # History playback
│   ├── components/
│   └── hooks/
│
├── 📁 simulator/                 # GPS Fleet Simulator
│   └── src/simulator.ts
│
├── 📁 replayer/                  # nuScenes Dataset Replayer
│   └── nuscenes_replayer.py
│
└── 📁 mosquitto/                 # MQTT Broker Config
    └── config/mosquitto.conf
```

---

## 📡 API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/vehicles` | List all vehicles |
| `GET` | `/api/tracking/latest` | Latest positions (from Redis) |
| `GET` | `/api/tracking/history` | Historical tracking data |
| `GET` | `/api/av-sensor/state` | Current AV sensor state |

### WebSocket Events

**Fleet Tracking (default namespace)**
| Event | Direction | Description |
|-------|-----------|-------------|
| `vehicle:update` | Server → Client | Real-time position update |
| `vehicle:stopped` | Server → Client | Stop detection alert |

**AV Sensor (`/av` namespace)**
| Event | Direction | Description |
|-------|-----------|-------------|
| `av:gps` | Server → Client | Ego vehicle position |
| `av:camera` | Server → Client | Camera frame (base64) |
| `av:lidar` | Server → Client | LiDAR point cloud |
| `av:annotations` | Server → Client | 3D bounding boxes |

### MQTT Topics

| Topic | Publisher | Description |
|-------|-----------|-------------|
| `vehicle/{id}/location` | Simulator | Fleet GPS data |
| `vehicle/gps` | Replayer | AV ego position |
| `vehicle/camera/CAM_*` | Replayer | Camera frames |
| `vehicle/lidar` | Replayer | LiDAR point cloud |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | NestJS, TypeScript, Prisma, Socket.IO |
| **Frontend** | Next.js 16, React 19, Tailwind CSS, Leaflet.js |
| **Database** | PostgreSQL 15, Redis 7 |
| **Messaging** | MQTT (Mosquitto), WebSocket |
| **DevOps** | Docker, GitHub Actions |
| **Dataset** | nuScenes (AV sensor data) |

---

## 📖 Documentation

- [Architecture Deep Dive](ARCHITECTURE.md) — Detailed system design
- [Contributing Guide](CONTRIBUTING.md) — How to contribute
- [Backend README](backend/README.md) — Backend specific docs
- [Frontend README](frontend/README.md) — Frontend specific docs

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a PR.

```bash
# Fork the repo, then:
git clone https://github.com/YOUR_USERNAME/visiontrack.git
cd visiontrack
git checkout -b feature/your-feature

# Make changes, then:
git commit -m "feat: add awesome feature"
git push origin feature/your-feature
# Open a Pull Request
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Code style guidelines
- Commit conventions
- PR process

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Teguh Badrusalam**

Fullstack Developer specializing in real-time systems, IoT, and geospatial applications.

---

<div align="center">

**⭐ Star this repo if you find it useful!**

[Report Bug](https://github.com/Teguh010/visiontrack/issues/new?template=bug_report.md) •
[Request Feature](https://github.com/Teguh010/visiontrack/issues/new?template=feature_request.md)

</div>
