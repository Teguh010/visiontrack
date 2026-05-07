# Real-Time Fleet Tracking System: Architecture & Data Flow

This document provides an overview of the architecture and technical details of the Real-Time Fleet Tracking System, explaining how real-time data flows from the device (Simulator) to visualization in the Frontend (Dashboard).

---

## 1. Project Overview (Big Picture)

This project is a production-scale real-time fleet tracking system. It is designed to ingest telemetry data (location, speed, status) from many vehicles simultaneously, process it rapidly, and display it live on a map dashboard.

The system architecture consists of 5 main components:
1. **GPS Simulator (Node.js):** Acts as the "Device/IoT GPS" installed in vehicles. Generates realistic fake location data and sends it to the broker.
2. **MQTT Broker (Eclipse Mosquitto):** Serves as the message broker that receives data from devices and forwards it to the backend using the lightweight MQTT protocol for IoT.
3. **Backend Server (NestJS):** The brain of the system. Receives data from the MQTT broker, runs business logic (e.g., stop detection), stores data in the database, and forwards it to the frontend.
4. **Database & Cache (PostgreSQL & Redis):**
   - **Redis:** Stores the latest vehicle positions in memory (cache) for fast reads.
   - **PostgreSQL:** Stores historical tracking data for later review.
5. **Frontend Dashboard (Next.js & Leaflet):** Web-based user interface that displays an interactive map and live vehicle movement without page refresh.

---

## 2. Real-Time Data Flow

This section explains how a single location data point moves from a vehicle to the user's dashboard, typically in under 1 second.

### Phase 1: Data Generation on Device (Simulator)
- **Related file:** `simulator/src/simulator.ts`
- **Concept:** The simulator has 4 vehicle types (CITY, HIGHWAY, DELIVERY, PATROL), each with unique behavior (e.g., city cars stop more often, trucks on highways stop less).
- **Technical Process:**
  1. Every 3 seconds, the simulator calculates new GPS coordinates for each vehicle using mathematical interpolation and adds fake GPS noise for realism.
  2. The simulator creates a JSON data packet (vehicle ID, lat, lon, speed, status).
  3. Using the `mqtt` library, the simulator publishes this JSON message to the MQTT Broker on a specific **Topic**: `vehicle/{vehicleId}/location` (e.g., `vehicle/VH-001/location`).

### Phase 2: Delivery via MQTT Broker (Mosquitto)
- **Concept:** Mosquitto runs on port `1883`. It acts like a post office, receiving packets from Phase 1 and determining who is subscribed to receive them.
- Since the Backend is subscribed to this topic, the broker immediately forwards the message to the Backend.

### Phase 3: Processing in Backend Server (NestJS)
- **Related files:** `tracking.mqtt.ts`, `tracking.service.ts`, `tracking.gateway.ts`
- **Technical Process:**
  1. **MQTT Consumer (`tracking.mqtt.ts`):** The backend continuously listens to the wildcard topic `vehicle/+/location`. When a message arrives, it parses the JSON and validates the format.
  2. **Business Logic (`tracking.service.ts`):**
     - **Stop Detection Algorithm:** Checks if vehicle speed < 5 km/h for more than 2 minutes. If so, status is set to `STOPPED`, otherwise `MOVING`.
     - **Caching to Redis:** The processed position is immediately saved to Redis for fast access.
     - **Storing History:** Asynchronously, the position is also inserted into PostgreSQL for historical tracking.
  3. **WebSocket Gateway (`tracking.gateway.ts`):** After processing and storing, the service emits a `vehicle:update` event via **Socket.IO** (port `3000`) to all connected frontend clients.

### Phase 4: Visualization in Frontend (Next.js)
- **Related files:** `useFleetSocket.ts`, `FleetMapInner.tsx`
- **Concept:** The frontend maintains a persistent WebSocket connection to the backend. The server pushes new data as soon as it arrives.
- **Technical Process:**
  1. **Socket Listener (`useFleetSocket.ts`):** This React hook listens for `vehicle:update` events from the backend.
  2. **Update State:** When new data arrives, the hook updates the vehicle state in React.
  3. **Re-render Map (`FleetMapInner.tsx`):** React automatically re-renders the map component, and Leaflet.js moves the vehicle marker instantly.

---

## Summary Diagram

```
[ Simulator ] --(MQTT: Port 1883, every 3s)--> [ Mosquitto Broker ]
                                                        |
                                                        v
[ Redis ] <--(Fastest Cache)-- [ Backend Server (NestJS) ] --(History Storage)--> [ PostgreSQL ]
                                                        |
                                                        | (Broadcast Event: "vehicle:update")
                                                        v
                                         (WebSocket via Socket.IO: Port 3000)
                                                        |
                                                        v
                                       [ Frontend Dashboard (Next.js) ]
                                          (Map marker moves instantly)
```

This event-driven architecture (MQTT + WebSocket) is highly scalable and ensures that the delay from vehicle movement to screen update is only milliseconds.

---

## 3. AV Sensor Dashboard — Autonomous Vehicle Data Visualization

Besides fleet tracking, the system also supports visualization of autonomous vehicle sensor data from the **nuScenes** dataset.

### Concept

nuScenes is a real-world dataset from autonomous vehicles in Boston and Singapore. It contains:
- **Ego Pose (GPS):** Vehicle position in local meter coordinates
- **6 Cameras:** Front, Front-Left, Front-Right, Back, Back-Left, Back-Right
- **LiDAR:** Point cloud from the roof-mounted LiDAR sensor
- **Radar:** Data from 5 radar sensors (not visualized currently)

### AV Sensor Data Flow

```
nuScenes files (disk)
        ↓
Python Replayer — reads files, sends every ~500ms
        ↓  
MQTT Broker (Mosquitto) — message queue
        ↓
NestJS Backend (AvSensorModule) — receive, process, forward
        ↓
WebSocket (Socket.IO, namespace: /av) — real-time to browser
        ↓
Next.js Dashboard (/av) — visualization
```

### MQTT Topics (AV Sensor)

| Topic | Description | Payload |
|-------|-------------|---------|
| `vehicle/gps` | Ego vehicle position | `{lat, lon, altitude, heading, speed_kph, frame, scene, location}` |
| `vehicle/camera/CAM_*` | Camera frame (6 channels) | `{camera, image (base64), timestamp, frame}` |
| `vehicle/lidar` | LiDAR point cloud | `{points [[x,y,z,intensity]...], timestamp, frame}` |
| `vehicle/status` | Replay status | `{scene, frame, total, pct, status}` |

### Backend Components (AvSensorModule)

- **`av-sensor.mqtt.ts`:** Subscribes to AV sensor topics, validates payloads
- **`av-sensor.service.ts`:** Transforms data, caches to Redis, emits to WebSocket
- **`av-sensor.gateway.ts`:** WebSocket gateway at `/av` namespace
- **`av-sensor.controller.ts`:** REST endpoint for initial state

### Frontend Components

- **`/app/av/page.tsx`:** Main AV Sensor dashboard
- **`CameraGrid.tsx`:** 6-camera grid (2x3)
- **`LidarView.tsx`:** LiDAR point cloud visualization (canvas)
- **`StatusPanel.tsx`:** GPS info and replay status
- **`AvMiniMap.tsx`:** Mini map with vehicle position

### How to Run

```bash
# 1. Install replayer dependencies
cd replayer
pip install -r requirements.txt

# 2. Start MQTT broker
docker-compose up -d mosquitto

# 3. Start backend
cd backend && npm run start:dev

# 4. Start frontend
cd frontend && npm run dev

# 5. Start replayer
cd replayer
python nuscenes_replayer.py --scene 0 --loop
```

---

Dashboard AV available at: `http://localhost:3001/av`
