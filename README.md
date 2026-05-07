<div align="center">

# 🚗 VisionTrack

### Real-Time Fleet Tracking & Autonomous Vehicle Sensor Platform

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![CI](https://github.com/teguhbadru/visiontrack/actions/workflows/ci.yml/badge.svg)](https://github.com/teguhbadru/visiontrack/actions/workflows/ci.yml)
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
  <a href="#-architecture">Architecture</a> •
  <a href="#-documentation">Docs</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

![Dashboard Preview](https://via.placeholder.com/1200x600/1a1a2e/eaeaea?text=VisionTrack+Dashboard+Preview)

</div>

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
git clone https://github.com/teguhbadru/visiontrack.git
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
- [Architecture (English)](ARCHITECTURE.en.md) — English translation
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

[Report Bug](https://github.com/teguhbadru/visiontrack/issues/new?template=bug_report.md) •
[Request Feature](https://github.com/teguhbadru/visiontrack/issues/new?template=feature_request.md)

</div>
