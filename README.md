<div align="center">

# 🚗 AV Sensor Dashboard — Frontend

[![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)

**Real-time visualization dashboard for Autonomous Vehicle sensors & Fleet Tracking**

</div>

---

## 🎯 Overview

Next.js frontend application that provides real-time visualization of autonomous vehicle sensor data from the [nuScenes dataset](https://www.nuscenes.org/). Features include multi-camera feeds, LiDAR point cloud rendering, 3D object detection display, and fleet tracking maps.

---

## ✨ Features

### 🚙 AV Sensor Dashboard (`/av`)

| Feature | Description |
|---------|-------------|
| **6-Camera Grid** | Synchronized feeds from all vehicle cameras (Front, Front-Left/Right, Back, Back-Left/Right) |
| **LiDAR Multi-View** | Interactive point cloud visualization with Top/Front/Side views and quad-view mode |
| **3D Bounding Boxes** | Object detection overlay with category colors (pedestrian, car, truck, etc.) |
| **Height Colormap** | Point cloud colored by elevation for environment understanding |
| **Scene Analysis** | Real-time object count with proximity warnings |
| **Bird's Eye View** | Local trajectory visualization with heading indicator |

### 🚛 Fleet Tracking Dashboard (`/`)

| Feature | Description |
|---------|-------------|
| **Live Map** | Real-time vehicle positions on Leaflet.js interactive map |
| **History Playback** | Trajectory visualization with time-based controls |
| **Analytics** | Speed charts and trip statistics |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────┘

WebSocket Connection (Socket.IO)
         │
         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Custom Hooks   │ ───▶ │   React State   │ ───▶ │   Components    │
│                 │      │                 │      │                 │
│ useAvSensorSocket│      │ • gps           │      │ • CameraGrid    │
│ useFleetSocket   │      │ • cameras (Map) │      │ • LidarMultiView│
│                 │      │ • lidar         │      │ • BirdEyeView   │
│                 │      │ • annotations   │      │ • StatusPanel   │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                                          │
                                                          ▼
                                                  ┌─────────────────┐
                                                  │  Canvas / DOM   │
                                                  │  Rendering      │
                                                  │  ~20-30 FPS     │
                                                  └─────────────────┘
```

### WebSocket Events Received

| Event | Data | Usage |
|-------|------|-------|
| `av:gps` | Position, heading, speed | Map marker, trajectory |
| `av:camera` | Base64 image, channel | Camera grid display |
| `av:lidar` | Point cloud array | Canvas rendering |
| `av:annotations` | 3D bounding boxes | Object overlay |
| `av:status` | Frame, scene info | Status panel |

---

## 📁 Project Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Fleet tracking dashboard
│   ├── av/
│   │   └── page.tsx        # AV sensor dashboard
│   ├── history/
│   │   └── page.tsx        # Playback page
│   └── analytics/
│       └── page.tsx        # Analytics page
│
├── components/
│   ├── av/                 # AV-specific components
│   │   ├── CameraGrid.tsx      # 6-camera display grid
│   │   ├── LidarMultiView.tsx  # Multi-angle LiDAR view
│   │   ├── LidarView.tsx       # Single LiDAR view
│   │   ├── BirdEyeView.tsx     # Local trajectory map
│   │   ├── StatusPanel.tsx     # GPS & status info
│   │   └── AvMiniMap.tsx       # World map position
│   │
│   ├── FleetMap.tsx        # Fleet tracking map
│   ├── FleetMapInner.tsx   # Leaflet map implementation
│   └── Sidebar.tsx         # Navigation sidebar
│
├── hooks/
│   ├── useAvSensorSocket.ts    # AV sensor WebSocket hook
│   └── useFleetSocket.ts       # Fleet tracking WebSocket hook
│
├── types/
│   ├── av-sensor.ts        # AV sensor type definitions
│   └── tracking.ts         # Fleet tracking types
│
└── public/                 # Static assets
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Backend server running on port 3000

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_WS_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Utility-first styling |
| **Socket.IO Client** | Real-time WebSocket communication |
| **Leaflet.js** | Interactive map visualization |
| **Canvas API** | High-performance LiDAR rendering |
| **Lucide React** | Icon library |

---

## 📊 Key Components

### LidarMultiView

Multi-angle LiDAR visualization with:
- **View Modes**: Top (Bird's Eye), Front, Left, Right, Rear
- **Quad View**: 4 views simultaneously
- **Height Coloring**: Ground → Vehicle → Tall objects
- **3D Bounding Boxes**: Object detection overlay
- **Controls**: Toggle points, boxes, labels, range

### CameraGrid

6-camera synchronized display:
- Responsive grid layout (2 rows × 3 columns)
- Channel labels with icons
- Frame timestamp display
- Click to expand (future)

### useAvSensorSocket Hook

```typescript
const { 
  connected,      // WebSocket connection status
  gps,            // Current GPS data
  cameras,        // Map<CameraChannel, AvCameraData>
  lidar,          // LiDAR point cloud
  annotations,    // 3D object detections
  status,         // Replay status
  getCamera       // Helper to get camera by channel
} = useAvSensorSocket();
```

---

## 📄 License

MIT License

---

## 👤 Author Teguh Badrusalam

Fullstack Developer specializing in **Next.js**, **NestJS**, and **GIS/AV Systems**

---

<div align="center">

*Part of the Real-Time AV Sensor & Fleet Tracking System*

</div>
