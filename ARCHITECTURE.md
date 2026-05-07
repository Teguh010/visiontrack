<div align="center">

# 🏗️ VisionTrack Architecture

### System Design & Data Flow Documentation

</div>

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Data Flow](#data-flow)
- [Fleet Tracking Module](#fleet-tracking-module)
- [AV Sensor Module](#av-sensor-module)
- [Infrastructure](#infrastructure)
- [Security Considerations](#security-considerations)

---

## Overview

**VisionTrack** is a production-grade platform for real-time vehicle telemetry processing and visualization. It supports two primary use cases:

| Use Case | Description | Data Source |
|----------|-------------|-------------|
| **Fleet Tracking** | Real-time GPS tracking of vehicle fleets | GPS Simulator / Real IoT devices |
| **AV Sensor Visualization** | Autonomous vehicle sensor data replay | nuScenes dataset |

### Key Capabilities

- ⚡ **Sub-second latency** — End-to-end data flow in <500ms
- 📈 **Scalable** — Event-driven architecture handles thousands of vehicles
- 🔄 **Real-time** — WebSocket push, no polling
- 🗄️ **Persistent** — Historical data storage with PostgreSQL
- 🚀 **Fast reads** — Redis caching for instant state retrieval

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                 VISIONTRACK PLATFORM                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘

    DATA SOURCES                           MESSAGE BROKER                    
    ════════════                           ══════════════                    
                                                                             
┌───────────────────┐                 ┌─────────────────────┐                
│   GPS Simulator   │────MQTT────────▶│                     │                
│    (Node.js)      │  vehicle/+/loc  │                     │                
│                   │                 │     Mosquitto       │                
│ • 4 vehicle types │                 │    MQTT Broker      │                
│ • 3s intervals    │                 │      :1883          │                
│ • GPS noise sim   │                 │                     │                
└───────────────────┘                 │  • Pub/Sub model    │                
                                      │  • QoS 0/1/2        │                
┌───────────────────┐                 │  • Wildcard topics  │                
│ nuScenes Replayer │────MQTT────────▶│                     │                
│    (Python)       │  vehicle/gps    │                     │                
│                   │  vehicle/camera │                     │                
│ • 6 cameras       │  vehicle/lidar  │                     │                
│ • LiDAR points    │  vehicle/status │                     │                
│ • 3D annotations  │                 │                     │                
│ • 500ms intervals │                 └──────────┬──────────┘                
└───────────────────┘                            │                           
                                                 │ Subscribe: vehicle/#      
                                                 ▼                           
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              NESTJS BACKEND (:3000)                                  │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                              MQTT CONSUMERS                                  │    │
│  │  ┌─────────────────────┐              ┌─────────────────────┐               │    │
│  │  │  tracking.mqtt.ts   │              │  av-sensor.mqtt.ts  │               │    │
│  │  │                     │              │                     │               │    │
│  │  │ • vehicle/+/location│              │ • vehicle/gps       │               │    │
│  │  │ • Parse & validate  │              │ • vehicle/camera/+  │               │    │
│  │  │ • Route to service  │              │ • vehicle/lidar     │               │    │
│  │  └──────────┬──────────┘              │ • vehicle/status    │               │    │
│  │             │                         │ • vehicle/annotations               │    │
│  │             │                         └──────────┬──────────┘               │    │
│  └─────────────┼────────────────────────────────────┼───────────────────────────┘    │
│                │                                    │                                │
│                ▼                                    ▼                                │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                              SERVICE LAYER                                   │    │
│  │  ┌─────────────────────┐              ┌─────────────────────┐               │    │
│  │  │ tracking.service.ts │              │ av-sensor.service.ts│               │    │
│  │  │                     │              │                     │               │    │
│  │  │ • Stop detection    │              │ • Camera processing │               │    │
│  │  │ • Speed validation  │              │ • LiDAR transform   │               │    │
│  │  │ • History storage   │              │ • Annotation merge  │               │    │
│  │  │ • Redis caching     │              │ • State caching     │               │    │
│  │  └──────────┬──────────┘              └──────────┬──────────┘               │    │
│  └─────────────┼────────────────────────────────────┼───────────────────────────┘    │
│                │                                    │                                │
│                ▼                                    ▼                                │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                            WEBSOCKET GATEWAYS                                │    │
│  │  ┌─────────────────────┐              ┌─────────────────────┐               │    │
│  │  │ tracking.gateway.ts │              │ av-sensor.gateway.ts│               │    │
│  │  │   (default ns)      │              │   (/av namespace)   │               │    │
│  │  │                     │              │                     │               │    │
│  │  │ • vehicle:update    │              │ • av:gps            │               │    │
│  │  │ • vehicle:stopped   │              │ • av:camera         │               │    │
│  │  │                     │              │ • av:lidar          │               │    │
│  │  │                     │              │ • av:annotations    │               │    │
│  │  └──────────┬──────────┘              └──────────┬──────────┘               │    │
│  └─────────────┼────────────────────────────────────┼───────────────────────────┘    │
│                │                                    │                                │
└────────────────┼────────────────────────────────────┼────────────────────────────────┘
                 │                                    │                                 
                 │         Socket.IO WebSocket        │                                 
                 ▼                                    ▼                                 
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            NEXT.JS FRONTEND (:3001)                                  │
│                                                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │     Fleet Map       │  │   AV Sensor View    │  │     Analytics       │          │
│  │     (/)             │  │     (/av)           │  │    (/analytics)     │          │
│  │                     │  │                     │  │                     │          │
│  │ • Leaflet.js map    │  │ • 6-camera grid     │  │ • Speed charts      │          │
│  │ • Live markers      │  │ • LiDAR canvas      │  │ • Stop events       │          │
│  │ • Vehicle list      │  │ • 3D bounding boxes │  │ • Fleet statistics  │          │
│  │ • Status indicators │  │ • GPS mini-map      │  │ • Time filters      │          │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘          │
│                                                                                      │
│  ┌─────────────────────┐                                                            │
│  │   History Playback  │                                                            │
│  │     (/history)      │                                                            │
│  │                     │                                                            │
│  │ • Trajectory replay │                                                            │
│  │ • Timeline controls │                                                            │
│  │ • Polyline path     │                                                            │
│  └─────────────────────┘                                                            │
└─────────────────────────────────────────────────────────────────────────────────────┘

    DATA STORES
    ═══════════

┌───────────────────┐              ┌───────────────────┐
│      Redis        │              │    PostgreSQL     │
│      :6379        │              │      :5432        │
│                   │              │                   │
│ • Latest state    │              │ • Vehicle records │
│ • Session data    │              │ • Tracking history│
│ • Fast reads      │              │ • Audit logs      │
│ • TTL support     │              │ • Prisma ORM      │
└───────────────────┘              └───────────────────┘
```

---

## Data Flow

### End-to-End Latency

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Device  │───▶│   MQTT   │───▶│ Backend  │───▶│WebSocket │───▶│ Frontend │
│          │    │  Broker  │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │               │               │               │
     │    <10ms      │    <5ms       │    <50ms      │    <10ms      │
     └───────────────┴───────────────┴───────────────┴───────────────┘
                          Total: <100ms typical
```

### Message Flow Sequence

```
┌─────────┐     ┌──────────┐     ┌─────────┐     ┌───────┐     ┌──────────┐
│Simulator│     │Mosquitto │     │ Backend │     │ Redis │     │ Frontend │
└────┬────┘     └────┬─────┘     └────┬────┘     └───┬───┘     └────┬─────┘
     │               │                │              │               │
     │  MQTT Publish │                │              │               │
     │──────────────▶│                │              │               │
     │               │                │              │               │
     │               │  Forward msg   │              │               │
     │               │───────────────▶│              │               │
     │               │                │              │               │
     │               │                │  Cache       │               │
     │               │                │─────────────▶│               │
     │               │                │              │               │
     │               │                │  WebSocket emit               │
     │               │                │─────────────────────────────▶│
     │               │                │              │               │
     │               │                │              │    Re-render  │
     │               │                │              │    ◀─────────│
     │               │                │              │               │
```

---

## Fleet Tracking Module

### Overview

Real-time GPS tracking for vehicle fleets with stop detection and history playback.

### Data Flow Detail

```
simulator/src/simulator.ts
         │
         │ Every 3 seconds, for each vehicle:
         │ 1. Calculate new position (interpolation + noise)
         │ 2. Determine status (MOVING/STOPPED)
         │ 3. Build JSON payload
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    MQTT Message                              │
│                                                              │
│  Topic: vehicle/VH-001/location                              │
│                                                              │
│  Payload: {                                                  │
│    "vehicleId": "VH-001",                                    │
│    "lat": -7.257472,                                         │
│    "lon": 112.752088,                                        │
│    "speed": 45.2,                                            │
│    "heading": 90,                                            │
│    "status": "MOVING",                                       │
│    "timestamp": 1714210000000                                │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
backend/src/modules/tracking/tracking.mqtt.ts
         │
         │ 1. Subscribe to: vehicle/+/location
         │ 2. Parse JSON payload
         │ 3. Validate required fields
         │ 4. Call tracking.service.processLocation()
         ▼
backend/src/modules/tracking/tracking.service.ts
         │
         │ Business Logic:
         │ ┌──────────────────────────────────────────┐
         │ │  STOP DETECTION ALGORITHM                │
         │ │                                          │
         │ │  IF speed < 5 km/h                       │
         │ │    AND duration > 2 minutes              │
         │ │  THEN status = "STOPPED"                 │
         │ │       emit "vehicle:stopped" event       │
         │ └──────────────────────────────────────────┘
         │
         ├──────▶ Redis: SET vehicle:VH-001:latest {...}
         │
         ├──────▶ PostgreSQL: INSERT INTO tracking_history
         │
         ▼
backend/src/modules/tracking/tracking.gateway.ts
         │
         │ Socket.IO emit to all connected clients:
         │ Event: "vehicle:update"
         │ Payload: { vehicleId, lat, lon, speed, ... }
         ▼
frontend/hooks/useFleetSocket.ts
         │
         │ 1. Listen for "vehicle:update" events
         │ 2. Update React state (Map of vehicles)
         │ 3. Trigger re-render
         ▼
frontend/components/FleetMapInner.tsx
         │
         │ Leaflet.js updates marker position
         │ Marker smoothly animates to new location
         ▼
    🚗 Vehicle moves on map!
```

### Vehicle Types

| Type | Behavior | Stop Frequency | Speed Range |
|------|----------|----------------|-------------|
| **CITY** | Urban driving | High (traffic lights) | 0-60 km/h |
| **HIGHWAY** | Long distance | Low | 80-120 km/h |
| **DELIVERY** | Stop & go | Very high | 0-40 km/h |
| **PATROL** | Random patrol | Medium | 20-80 km/h |

### Stop Detection Algorithm

```typescript
// Pseudocode
const STOP_SPEED_THRESHOLD = 5;      // km/h
const STOP_DURATION_THRESHOLD = 120; // seconds

function detectStop(vehicle: Vehicle, newPosition: Position) {
  if (newPosition.speed < STOP_SPEED_THRESHOLD) {
    if (!vehicle.stopStartTime) {
      vehicle.stopStartTime = Date.now();
    }
    
    const stopDuration = (Date.now() - vehicle.stopStartTime) / 1000;
    
    if (stopDuration >= STOP_DURATION_THRESHOLD) {
      return { status: 'STOPPED', duration: stopDuration };
    }
  } else {
    vehicle.stopStartTime = null;
  }
  
  return { status: 'MOVING' };
}
```

---

## AV Sensor Module

### Overview

Visualization platform for autonomous vehicle sensor data from the **nuScenes** dataset — a large-scale dataset for autonomous driving research from Motional (formerly nuTonomy).

### nuScenes Dataset

| Component | Description | Data Format |
|-----------|-------------|-------------|
| **Ego Pose** | Vehicle position & orientation | 4x4 transformation matrix |
| **6 Cameras** | Surround-view camera images | 1600x900 JPEG |
| **LiDAR** | 32-beam Velodyne point cloud | N x 5 array (x, y, z, intensity, ring) |
| **5 Radars** | Long/short range radar | Point cloud with velocity |
| **3D Annotations** | Object bounding boxes | 7-DOF boxes with class labels |

### Sensor Configuration

```
                    ┌─────────────────┐
                    │   CAM_FRONT     │
                    │   (1600x900)    │
                    └────────┬────────┘
                             │
    ┌───────────────┐        │        ┌───────────────┐
    │ CAM_FRONT_LEFT│        │        │CAM_FRONT_RIGHT│
    │   (1600x900)  │        │        │   (1600x900)  │
    └───────┬───────┘        │        └───────┬───────┘
            │                │                │
            │      ┌─────────┴─────────┐      │
            │      │                   │      │
            │      │   ┌───────────┐   │      │
            │      │   │  LiDAR    │   │      │
            │      │   │  (roof)   │   │      │
            │      │   └───────────┘   │      │
            │      │                   │      │
            │      │  ┌─────────────┐  │      │
            │      │  │  VEHICLE    │  │      │
            │      │  │  (ego)      │  │      │
            │      │  └─────────────┘  │      │
            │      │                   │      │
            │      └───────────────────┘      │
            │                │                │
    ┌───────┴───────┐        │        ┌───────┴───────┐
    │ CAM_BACK_LEFT │        │        │CAM_BACK_RIGHT │
    │   (1600x900)  │        │        │   (1600x900)  │
    └───────────────┘        │        └───────────────┘
                             │
                    ┌────────┴────────┐
                    │    CAM_BACK     │
                    │   (1600x900)    │
                    └─────────────────┘
```

### Data Flow Detail

```
replayer/nuscenes_replayer.py
         │
         │ For each frame (~500ms interval):
         │ 1. Load ego pose from ego_pose.json
         │ 2. Load all 6 camera images
         │ 3. Load LiDAR point cloud (.bin file)
         │ 4. Load 3D annotations
         │ 5. Publish to MQTT topics
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    MQTT Messages                             │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Topic: vehicle/gps                                   │    │
│  │ Payload: {                                           │    │
│  │   lat, lon, altitude, heading, speed_kph,           │    │
│  │   frame, scene, location                             │    │
│  │ }                                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Topic: vehicle/camera/CAM_FRONT                      │    │
│  │ Payload: {                                           │    │
│  │   camera: "CAM_FRONT",                               │    │
│  │   image: "data:image/jpeg;base64,/9j/4AAQ...",      │    │
│  │   timestamp, frame                                   │    │
│  │ }                                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│  (× 6 cameras: FRONT, FRONT_LEFT, FRONT_RIGHT,              │
│                BACK, BACK_LEFT, BACK_RIGHT)                  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Topic: vehicle/lidar                                 │    │
│  │ Payload: {                                           │    │
│  │   points: [[x, y, z, intensity], ...],              │    │
│  │   num_points: 34688,                                 │    │
│  │   timestamp, frame                                   │    │
│  │ }                                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Topic: vehicle/annotations                           │    │
│  │ Payload: {                                           │    │
│  │   boxes: [{                                          │    │
│  │     center: [x, y, z],                               │    │
│  │     size: [w, l, h],                                 │    │
│  │     rotation: [qw, qx, qy, qz],                      │    │
│  │     label: "car",                                    │    │
│  │     score: 0.95                                      │    │
│  │   }, ...],                                           │    │
│  │   frame                                              │    │
│  │ }                                                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
backend/src/modules/av-sensor/av-sensor.mqtt.ts
         │
         │ Subscribe to multiple topics:
         │ • vehicle/gps
         │ • vehicle/camera/+  (wildcard for all 6 cameras)
         │ • vehicle/lidar
         │ • vehicle/status
         │ • vehicle/annotations
         │
         │ Route to appropriate handlers
         ▼
backend/src/modules/av-sensor/av-sensor.service.ts
         │
         │ For each data type:
         │
         │ GPS:
         │ ├── Validate coordinates
         │ ├── Cache to Redis (av:gps)
         │ └── Emit av:gps event
         │
         │ Camera:
         │ ├── Validate base64 image
         │ ├── Add channel identifier
         │ ├── Cache to Redis (av:camera:{channel})
         │ └── Emit av:camera event
         │
         │ LiDAR:
         │ ├── Validate point array
         │ ├── Cache to Redis (av:lidar)
         │ └── Emit av:lidar event
         │
         │ Annotations:
         │ ├── Validate box format
         │ ├── Cache to Redis (av:annotations)
         │ └── Emit av:annotations event
         ▼
backend/src/modules/av-sensor/av-sensor.gateway.ts
         │
         │ Socket.IO namespace: /av
         │
         │ Events emitted:
         │ • av:gps        → GPS position update
         │ • av:camera     → Camera frame update
         │ • av:lidar      → LiDAR point cloud
         │ • av:status     → Replay status
         │ • av:annotations → 3D bounding boxes
         ▼
frontend/hooks/useAvSensorSocket.ts
         │
         │ Connect to /av namespace
         │ Listen for all av:* events
         │ Update React state for each sensor type
         ▼
frontend/app/av/page.tsx
         │
         │ Render dashboard components:
         │
         ├──▶ CameraGrid.tsx
         │    • 2×3 grid layout
         │    • Real-time image updates
         │    • Camera labels
         │
         ├──▶ LidarView.tsx
         │    • HTML5 Canvas rendering
         │    • Bird's eye view projection
         │    • Color-coded by height/intensity
         │    • 3D bounding box overlay
         │
         ├──▶ StatusPanel.tsx
         │    • GPS coordinates display
         │    • Speed, heading info
         │    • Scene/frame counter
         │
         └──▶ AvMiniMap.tsx
              • Leaflet mini map
              • Vehicle position marker
              • Heading indicator
```

### LiDAR Visualization

```
Point Cloud Rendering (Bird's Eye View)
═══════════════════════════════════════

Input: points = [[x, y, z, intensity], ...]

┌─────────────────────────────────────┐
│           CANVAS (800×800)           │
│                                      │
│    (-40m)         (0)        (+40m)  │
│       ┌───────────┬───────────┐      │
│       │     ·  ·  │  ·  ·     │      │
│       │  ·    ·   │   ·    ·  │      │
│  -40m │     ████████████      │ -40m │
│       │  ·  █ CAR █  ·  ·     │      │
│       │     ████████████      │      │
│       │  ·    ·   │   ·    ·  │      │
│       │     ·  ·  │  ·  ·     │      │
│       └───────────┴───────────┘      │
│    (+40m)        (0)        (-40m)   │
│                                      │
│  Legend:                             │
│  · = LiDAR point (color by height)   │
│  █ = 3D bounding box projection      │
└─────────────────────────────────────┘

Color Mapping:
  z < -1m  → Blue (ground)
  z = 0m   → Green (road level)
  z > 1m   → Red (obstacles/vehicles)
```

### 3D Bounding Box Format

```typescript
interface BoundingBox3D {
  // Center position in ego vehicle frame (meters)
  center: [number, number, number];  // [x, y, z]
  
  // Box dimensions (meters)
  size: [number, number, number];    // [width, length, height]
  
  // Orientation as quaternion
  rotation: [number, number, number, number];  // [w, x, y, z]
  
  // Object class
  label: 'car' | 'truck' | 'bus' | 'pedestrian' | 'bicycle' | ...;
  
  // Detection confidence (0-1)
  score: number;
}
```

---

## Infrastructure

### Docker Compose Services

```yaml
┌─────────────────────────────────────────────────────────────┐
│                    docker-compose.yml                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   mosquitto     │  │     redis       │  │    postgres     │
│                 │  │                 │  │                 │
│  Port: 1883     │  │  Port: 6379     │  │  Port: 5432     │
│  Protocol: MQTT │  │  Protocol: RESP │  │  Protocol: SQL  │
│                 │  │                 │  │                 │
│  Volume:        │  │  Volume:        │  │  Volume:        │
│  ./mosquitto/   │  │  redis_data     │  │  postgres_data  │
│    config/      │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Service Configuration

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| **Mosquitto** | `eclipse-mosquitto:2` | 1883, 9001 | MQTT broker (TCP + WebSocket) |
| **Redis** | `redis:7-alpine` | 6379 | In-memory cache |
| **PostgreSQL** | `postgres:15-alpine` | 5432 | Persistent storage |

### Network Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Docker Network (bridge)                          │
│                                                                          │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐              │
│  │  mosquitto  │◄────▶│   backend   │◄────▶│    redis    │              │
│  │   :1883     │      │   :3000     │      │   :6379     │              │
│  └─────────────┘      └──────┬──────┘      └─────────────┘              │
│                              │                                           │
│                              │                                           │
│                       ┌──────▼──────┐                                    │
│                       │  postgres   │                                    │
│                       │   :5432     │                                    │
│                       └─────────────┘                                    │
│                                                                          │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │     Host Machine     │
                    │                      │
                    │  frontend :3001      │
                    │  simulator (local)   │
                    │  replayer (local)    │
                    └──────────────────────┘
```

### Scaling Considerations

```
                    Load Balancer
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │Backend 1│    │Backend 2│    │Backend 3│
    └────┬────┘    └────┬────┘    └────┬────┘
         │              │              │
         └──────────────┼──────────────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
        ┌───────────┐      ┌───────────┐
        │   Redis   │      │ PostgreSQL│
        │ (Cluster) │      │ (Primary) │
        └───────────┘      └─────┬─────┘
                                 │
                           ┌─────▼─────┐
                           │ PostgreSQL│
                           │ (Replica) │
                           └───────────┘
```

---

## Security Considerations

### Current Implementation (Development)

| Component | Security Level | Notes |
|-----------|---------------|-------|
| MQTT | ⚠️ Anonymous | `allow_anonymous true` in dev |
| Redis | ⚠️ No auth | Local network only |
| PostgreSQL | ✅ Password | Basic user/pass auth |
| WebSocket | ⚠️ Open | No authentication |
| API | ⚠️ Open | No authentication |

### Production Recommendations

#### 1. MQTT Authentication

```conf
# mosquitto.conf (production)
allow_anonymous false
password_file /mosquitto/config/passwords

# Enable TLS
listener 8883
certfile /mosquitto/certs/server.crt
keyfile /mosquitto/certs/server.key
cafile /mosquitto/certs/ca.crt
```

#### 2. Redis Authentication

```bash
# redis.conf
requirepass your_strong_password_here

# Or via command
redis-cli CONFIG SET requirepass "your_password"
```

#### 3. API Authentication

```typescript
// Recommended: JWT-based authentication
@UseGuards(JwtAuthGuard)
@Controller('api/tracking')
export class TrackingController {
  // Protected endpoints
}
```

#### 4. WebSocket Authentication

```typescript
// Socket.IO middleware for auth
@WebSocketGateway()
export class TrackingGateway {
  afterInit(server: Server) {
    server.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (validateToken(token)) {
        next();
      } else {
        next(new Error('Unauthorized'));
      }
    });
  }
}
```

#### 5. Environment Variables

```bash
# Never commit these!
DATABASE_URL=postgresql://user:PASSWORD@host:5432/db
REDIS_PASSWORD=your_redis_password
MQTT_USERNAME=your_mqtt_user
MQTT_PASSWORD=your_mqtt_password
JWT_SECRET=your_jwt_secret
```

### Data Privacy

- GPS data contains sensitive location information
- Camera images may contain personally identifiable information (PII)
- Consider data retention policies and GDPR compliance
- Implement data anonymization for analytics

---

## Quick Reference

### Ports

| Port | Service | Protocol |
|------|---------|----------|
| 1883 | MQTT Broker | MQTT/TCP |
| 9001 | MQTT WebSocket | WS |
| 3000 | Backend API | HTTP/WS |
| 3001 | Frontend | HTTP |
| 5432 | PostgreSQL | TCP |
| 6379 | Redis | TCP |

### MQTT Topics

| Topic Pattern | Publisher | Subscriber |
|---------------|-----------|------------|
| `vehicle/+/location` | Simulator | Backend |
| `vehicle/gps` | Replayer | Backend |
| `vehicle/camera/+` | Replayer | Backend |
| `vehicle/lidar` | Replayer | Backend |
| `vehicle/annotations` | Replayer | Backend |
| `vehicle/status` | Replayer | Backend |

### WebSocket Events

| Namespace | Event | Direction |
|-----------|-------|-----------|
| `/` | `vehicle:update` | Server → Client |
| `/` | `vehicle:stopped` | Server → Client |
| `/av` | `av:gps` | Server → Client |
| `/av` | `av:camera` | Server → Client |
| `/av` | `av:lidar` | Server → Client |
| `/av` | `av:annotations` | Server → Client |
| `/av` | `av:status` | Server → Client |

---

<div align="center">

**📚 For more details, see the component-specific documentation:**

[Backend README](backend/README.md) • [Frontend README](frontend/README.md) • [Replayer README](replayer/README.md)

</div>
