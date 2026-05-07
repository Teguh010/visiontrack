# nuScenes Replayer

Python script that reads nuScenes autonomous vehicle dataset and streams sensor data via MQTT in real-time.

## Features

- **GPS/Ego Pose**: Vehicle position, heading, speed from ego_pose data
- **6 Camera Views**: Front, Front-Left, Front-Right, Back, Back-Left, Back-Right
- **LiDAR Point Cloud**: Top-mounted LiDAR data (sampled for performance)
- **Replay Status**: Scene info, progress, frame count

## Installation

```bash
cd replayer
pip install -r requirements.txt
```

## Dataset Setup

Download the nuScenes mini dataset (or full dataset) and place it in `data/nuscenes/`:

```
data/nuscenes/
├── samples/
├── sweeps/
├── v1.0-mini/
│   ├── ego_pose.json
│   ├── sample.json
│   ├── sample_data.json
│   ├── scene.json
│   └── ...
└── maps/
```

## Usage

```bash
# List available scenes
python nuscenes_replayer.py --list-scenes

# Replay scene 0 at normal speed
python nuscenes_replayer.py --scene 0

# Replay at 2x speed with looping
python nuscenes_replayer.py --scene 0 --speed 2.0 --loop

# Skip camera data (lighter bandwidth)
python nuscenes_replayer.py --scene 0 --no-camera

# Skip LiDAR data
python nuscenes_replayer.py --scene 0 --no-lidar
```

## MQTT Topics

| Topic | Description | Payload |
|-------|-------------|---------|
| `vehicle/gps` | Ego vehicle position | `{lat, lon, altitude, heading, speed_kph, timestamp, frame, scene, location}` |
| `vehicle/camera/CAM_*` | Camera frames | `{camera, image (base64), timestamp, frame}` |
| `vehicle/lidar` | LiDAR point cloud | `{points [[x,y,z,intensity]...], timestamp, frame}` |
| `vehicle/status` | Replay status | `{scene, frame, total, pct, status}` |

## Architecture

```
nuScenes files (disk)
        ↓
Python Replayer — read files, publish every ~500ms
        ↓
MQTT Broker (Mosquitto) — message queue
        ↓
NestJS Backend — receive, forward via WebSocket
        ↓
Next.js Dashboard — visualize in browser
```

## Configuration

- `MQTT_BROKER`: localhost (default)
- `MQTT_PORT`: 1883 (default)
- `FRAME_INTERVAL`: 0.5 seconds (nuScenes runs at ~2Hz)

## Camera Channels

- `CAM_FRONT` - Forward-facing main camera
- `CAM_FRONT_LEFT` - Front-left angle
- `CAM_FRONT_RIGHT` - Front-right angle
- `CAM_BACK` - Rear-facing camera
- `CAM_BACK_LEFT` - Back-left angle
- `CAM_BACK_RIGHT` - Back-right angle

## Coordinate Conversion

nuScenes uses local meter coordinates. The replayer converts to approximate lat/lon using:
- **Boston**: 42.336849, -71.057854 (reference point)
- **Singapore**: 1.288210, 103.837448 (reference point)
