"""
nuscenes_replayer.py
--------------------
Baca data nuScenes dan publish ke MQTT broker.
Letakkan file ini di: realtime-tracking-system/simulator/

Usage:
  python3 nuscenes_replayer.py
  python3 nuscenes_replayer.py --scene 0 --speed 1.0 --loop
  python3 nuscenes_replayer.py --list-scenes

MQTT Topics yang dipublish:
  vehicle/gps       → {lat, lon, heading, speed, altitude, timestamp}
  vehicle/camera/FRONT         → base64 PNG
  vehicle/camera/FRONT_LEFT    → base64 PNG
  vehicle/camera/FRONT_RIGHT   → base64 PNG
  vehicle/camera/BACK          → base64 PNG
  vehicle/camera/BACK_LEFT     → base64 PNG
  vehicle/camera/BACK_RIGHT    → base64 PNG
  vehicle/lidar     → [[x,y,z,intensity], ...]
  vehicle/status    → {scene_name, frame, total_frames, pct, timestamp}
"""

import argparse
import base64
import json
import math
import os
import time
from pathlib import Path

import numpy as np
import paho.mqtt.client as mqtt
from nuscenes.nuscenes import NuScenes

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DATAROOT      = os.path.join(os.path.dirname(__file__), '..', 'data', 'nuscenes')
MQTT_BROKER   = 'localhost'
MQTT_PORT     = 1883
FRAME_INTERVAL = 0.5   # detik antar frame (nuScenes ~2Hz)

CAMERA_NAMES = [
    'CAM_FRONT',
    'CAM_FRONT_LEFT',
    'CAM_FRONT_RIGHT',
    'CAM_BACK',
    'CAM_BACK_LEFT',
    'CAM_BACK_RIGHT',
]

TOPIC_GPS    = 'vehicle/gps'
TOPIC_LIDAR  = 'vehicle/lidar'
TOPIC_STATUS = 'vehicle/status'
TOPIC_ANNOTATIONS = 'vehicle/annotations'

# Category colors for visualization (simplified categories)
CATEGORY_COLORS = {
    'human': '#ef4444',        # Red for pedestrians
    'vehicle.car': '#3b82f6',  # Blue for cars
    'vehicle.truck': '#8b5cf6', # Purple for trucks
    'vehicle.bus': '#f59e0b',   # Orange for buses
    'vehicle.motorcycle': '#ec4899', # Pink for motorcycles
    'vehicle.bicycle': '#10b981', # Green for bicycles
    'movable_object': '#64748b', # Gray for other objects
}


# ---------------------------------------------------------------------------
# Helper: konversi nuScenes translation ke lat/lon
# nuScenes pakai koordinat meter lokal, kita konversi ke lat/lon approximate
# Boston reference: 42.336849169438615, -71.05785369873047
# Singapore reference: 1.2882100718435421, 103.83744771948242
# ---------------------------------------------------------------------------
def meters_to_latlon(x, y, ref_lat=42.336849, ref_lon=-71.05785):
    """Konversi koordinat meter lokal ke lat/lon approximate."""
    lat = ref_lat + (y / 111320.0)
    lon = ref_lon + (x / (111320.0 * math.cos(math.radians(ref_lat))))
    return lat, lon


def get_heading_from_rotation(rotation):
    """
    Konversi quaternion rotation ke heading derajat (0-360).
    rotation: [w, x, y, z]
    """
    w, x, y, z = rotation
    # Yaw dari quaternion
    siny_cosp = 2 * (w * z + x * y)
    cosy_cosp = 1 - 2 * (y * y + z * z)
    yaw = math.atan2(siny_cosp, cosy_cosp)
    heading = math.degrees(yaw) % 360
    return heading


def estimate_speed(pose_curr, pose_prev, dt=0.5):
    """Estimasi kecepatan dari dua ego_pose berturutan."""
    if pose_prev is None:
        return 0.0
    dx = pose_curr['translation'][0] - pose_prev['translation'][0]
    dy = pose_curr['translation'][1] - pose_prev['translation'][1]
    dist = math.sqrt(dx*dx + dy*dy)
    speed_ms = dist / dt
    speed_kph = speed_ms * 3.6
    return round(speed_kph, 2)


def encode_image(image_path):
    """Load gambar dan encode ke base64."""
    try:
        with open(image_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    except Exception:
        return None


def load_lidar_points(lidar_path, max_points=500):
    """
    Load LiDAR point cloud dari file .pcd.bin nuScenes.
    Format: float32 array [x, y, z, intensity, ring_index]
    Return: list of [x, y, z, intensity] — sampled max_points
    """
    try:
        points = np.fromfile(lidar_path, dtype=np.float32)
        points = points.reshape(-1, 5)  # nuScenes format: x,y,z,intensity,ring
        # Sample untuk tidak overload MQTT
        if len(points) > max_points:
            idx = np.random.choice(len(points), max_points, replace=False)
            points = points[idx]
        result = []
        for p in points:
            result.append([
                round(float(p[0]), 2),
                round(float(p[1]), 2),
                round(float(p[2]), 2),
                round(float(p[3]), 3),
            ])
        return result
    except Exception as e:
        print(f"[replayer] Warning: gagal load lidar: {e}")
        return []


# ---------------------------------------------------------------------------
# MQTT callbacks
# ---------------------------------------------------------------------------
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"[replayer] ✅ Terhubung ke MQTT broker {MQTT_BROKER}:{MQTT_PORT}")
    else:
        print(f"[replayer] ❌ Gagal connect MQTT, rc={rc}")


def on_disconnect(client, userdata, rc, properties=None, reasonCode=None):
    print(f"[replayer] Disconnected dari MQTT broker")


def get_simplified_category(category_name):
    """Simplify category name for visualization."""
    if category_name.startswith('human'):
        return 'human'
    elif category_name.startswith('vehicle.car'):
        return 'vehicle.car'
    elif category_name.startswith('vehicle.truck'):
        return 'vehicle.truck'
    elif category_name.startswith('vehicle.bus'):
        return 'vehicle.bus'
    elif category_name.startswith('vehicle.motorcycle'):
        return 'vehicle.motorcycle'
    elif category_name.startswith('vehicle.bicycle'):
        return 'vehicle.bicycle'
    else:
        return 'movable_object'


def quaternion_to_yaw(rotation):
    """Convert quaternion [w,x,y,z] to yaw angle in degrees."""
    w, x, y, z = rotation
    siny_cosp = 2 * (w * z + x * y)
    cosy_cosp = 1 - 2 * (y * y + z * z)
    yaw = math.atan2(siny_cosp, cosy_cosp)
    return math.degrees(yaw)


# ---------------------------------------------------------------------------
# Main replayer
# ---------------------------------------------------------------------------
class NuScenesReplayer:
    def __init__(self, dataroot, broker, port, speed, loop, no_camera, no_lidar):
        self.dataroot  = dataroot
        self.broker    = broker
        self.port      = port
        self.speed     = speed
        self.loop      = loop
        self.no_camera = no_camera
        self.no_lidar  = no_lidar

        print("[replayer] Loading nuScenes dataset...")
        self.nusc = NuScenes(
            version='v1.0-mini',
            dataroot=dataroot,
            verbose=False
        )
        print(f"[replayer] Loaded {len(self.nusc.scene)} scenes")

        # Setup MQTT
        self.client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2,
            client_id="nuscenes-replayer"
        )
        self.client.on_connect    = on_connect
        self.client.on_disconnect = on_disconnect

        # Build lookup tables for annotations
        self._build_annotation_lookups()

    def _build_annotation_lookups(self):
        """Build lookup tables for categories and attributes."""
        # Category lookup: token -> name
        self.category_lookup = {}
        for cat in self.nusc.category:
            self.category_lookup[cat['token']] = cat['name']
        
        # Attribute lookup: token -> name
        self.attribute_lookup = {}
        for attr in self.nusc.attribute:
            self.attribute_lookup[attr['token']] = attr['name']
        
        # Instance lookup: token -> category_token
        self.instance_lookup = {}
        for inst in self.nusc.instance:
            self.instance_lookup[inst['token']] = inst['category_token']
        
        print(f"[replayer] Built lookups: {len(self.category_lookup)} categories, "
              f"{len(self.attribute_lookup)} attributes, {len(self.instance_lookup)} instances")

    def get_annotations_for_sample(self, sample_token, ego_pose):
        """Get all annotations for a sample, transformed to ego-centric coordinates."""
        sample = self.nusc.get('sample', sample_token)
        annotations = []
        
        ego_x, ego_y, ego_z = ego_pose['translation']
        ego_yaw = get_heading_from_rotation(ego_pose['rotation'])
        ego_yaw_rad = math.radians(ego_yaw)
        
        for ann_token in sample['anns']:
            ann = self.nusc.get('sample_annotation', ann_token)
            
            # Get category
            instance_token = ann['instance_token']
            category_token = self.instance_lookup.get(instance_token, '')
            category_name = self.category_lookup.get(category_token, 'unknown')
            simplified_cat = get_simplified_category(category_name)
            
            # Get attributes
            attributes = []
            for attr_token in ann['attribute_tokens']:
                attr_name = self.attribute_lookup.get(attr_token, '')
                if attr_name:
                    attributes.append(attr_name)
            
            # Get position (global coordinates)
            gx, gy, gz = ann['translation']
            
            # Transform to ego-centric coordinates
            # Translate to ego origin
            dx = gx - ego_x
            dy = gy - ego_y
            dz = gz - ego_z
            
            # Rotate to ego frame (ego heading becomes +X)
            cos_yaw = math.cos(-ego_yaw_rad)
            sin_yaw = math.sin(-ego_yaw_rad)
            local_x = dx * cos_yaw - dy * sin_yaw
            local_y = dx * sin_yaw + dy * cos_yaw
            local_z = dz
            
            # Skip objects too far away (beyond 50m)
            distance = math.sqrt(local_x**2 + local_y**2)
            if distance > 50:
                continue
            
            # Get size and rotation
            width, length, height = ann['size']
            ann_yaw = quaternion_to_yaw(ann['rotation'])
            # Relative rotation to ego
            relative_yaw = ann_yaw - ego_yaw
            
            # Get color for category
            color = CATEGORY_COLORS.get(simplified_cat, '#64748b')
            
            annotations.append({
                'id': ann_token[:8],  # Short ID
                'category': simplified_cat,
                'category_full': category_name,
                'attributes': attributes,
                'x': round(local_x, 2),
                'y': round(local_y, 2),
                'z': round(local_z, 2),
                'width': round(width, 2),
                'length': round(length, 2),
                'height': round(height, 2),
                'yaw': round(relative_yaw, 1),
                'distance': round(distance, 1),
                'color': color,
                'num_lidar_pts': ann['num_lidar_pts'],
            })
        
        # Sort by distance
        annotations.sort(key=lambda a: a['distance'])
        return annotations

    def list_scenes(self):
        """Print semua scene yang tersedia."""
        print("\nAvailable scenes:")
        print("-" * 60)
        for i, scene in enumerate(self.nusc.scene):
            print(f"  [{i}] {scene['name']} — {scene['nbr_samples']} samples — {scene['description'][:50]}")
        print()

    def get_samples_in_scene(self, scene_idx):
        """Ambil semua sample dalam scene secara berurutan."""
        scene = self.nusc.scene[scene_idx]
        samples = []
        sample_token = scene['first_sample_token']
        while sample_token:
            sample = self.nusc.get('sample', sample_token)
            samples.append(sample)
            sample_token = sample['next']
        return samples

    def replay_scene(self, scene_idx):
        """Replay satu scene — publish semua data ke MQTT."""
        scene = self.nusc.scene[scene_idx]
        samples = self.get_samples_in_scene(scene_idx)
        total = len(samples)

        # Deteksi lokasi untuk konversi koordinat
        log = self.nusc.get('log', scene['log_token'])
        location = log['location']
        if 'singapore' in location.lower():
            ref_lat, ref_lon = 1.2882, 103.8374
        else:
            ref_lat, ref_lon = 42.3368, -71.0579

        print(f"\n[replayer] Scene [{scene_idx}]: {scene['name']}")
        print(f"[replayer] Location: {location}")
        print(f"[replayer] Total frames: {total}")
        print(f"[replayer] Speed: {self.speed}x")
        print(f"[replayer] Topics: {TOPIC_GPS}, vehicle/camera/*, {TOPIC_LIDAR}, {TOPIC_ANNOTATIONS}")
        print("[replayer] Tekan Ctrl+C untuk berhenti\n")

        interval = FRAME_INTERVAL / self.speed
        prev_pose = None

        for frame_idx, sample in enumerate(samples):
            t_start = time.time()
            ts = int(sample['timestamp'] / 1000)  # microsecond → millisecond

            # ---- Ego pose (GPS) ----
            lidar_data = self.nusc.get('sample_data', sample['data']['LIDAR_TOP'])
            ego_pose   = self.nusc.get('ego_pose', lidar_data['ego_pose_token'])
            x, y, z    = ego_pose['translation']
            lat, lon   = meters_to_latlon(x, y, ref_lat, ref_lon)
            heading    = get_heading_from_rotation(ego_pose['rotation'])
            speed_kph  = estimate_speed(ego_pose, prev_pose, FRAME_INTERVAL)
            prev_pose  = ego_pose

            gps_payload = json.dumps({
                "lat":       round(lat, 7),
                "lon":       round(lon, 7),
                "altitude":  round(z, 2),
                "heading":   round(heading, 2),
                "speed_kph": speed_kph,
                "timestamp": ts,
                "frame":     frame_idx,
                "scene":     scene['name'],
                "location":  location,
                # Raw coordinates in meters (for nuScenes map rendering)
                "x":         round(x, 2),
                "y":         round(y, 2),
            })
            self.client.publish(TOPIC_GPS, gps_payload, qos=0)

            # ---- Camera frames ----
            if not self.no_camera:
                for cam_name in CAMERA_NAMES:
                    if cam_name in sample['data']:
                        cam_data  = self.nusc.get('sample_data', sample['data'][cam_name])
                        cam_path  = os.path.join(self.dataroot, cam_data['filename'])
                        cam_b64   = encode_image(cam_path)
                        if cam_b64:
                            topic = f"vehicle/camera/{cam_name}"
                            payload = json.dumps({
                                "camera":    cam_name,
                                "image":     cam_b64,
                                "timestamp": ts,
                                "frame":     frame_idx,
                            })
                            self.client.publish(topic, payload, qos=0)

            # ---- LiDAR ----
            if not self.no_lidar:
                lidar_path = os.path.join(self.dataroot, lidar_data['filename'])
                points = load_lidar_points(lidar_path, max_points=300)
                if points:
                    lidar_payload = json.dumps({
                        "points":    points,
                        "timestamp": ts,
                        "frame":     frame_idx,
                    })
                    self.client.publish(TOPIC_LIDAR, lidar_payload, qos=0)

            # ---- Annotations (3D Bounding Boxes) ----
            annotations = self.get_annotations_for_sample(sample['token'], ego_pose)
            if annotations:
                ann_payload = json.dumps({
                    "annotations": annotations,
                    "timestamp": ts,
                    "frame": frame_idx,
                    "count": len(annotations),
                })
                self.client.publish(TOPIC_ANNOTATIONS, ann_payload, qos=0)

            # ---- Status ----
            status_payload = json.dumps({
                "scene":     scene['name'],
                "frame":     frame_idx,
                "total":     total,
                "pct":       round(frame_idx / total * 100, 1),
                "timestamp": ts,
                "status":    "playing",
            })
            self.client.publish(TOPIC_STATUS, status_payload, qos=0)

            # Progress log
            if frame_idx % 5 == 0:
                print(f"  frame {frame_idx:03d}/{total} | "
                      f"lat={lat:.5f} lon={lon:.5f} | "
                      f"speed={speed_kph} km/h | "
                      f"heading={heading:.1f}° | "
                      f"objects={len(annotations)}")

            # Timing
            elapsed = time.time() - t_start
            sleep_t = max(0, interval - elapsed)
            time.sleep(sleep_t)

        # Selesai
        self.client.publish(TOPIC_STATUS, json.dumps({
            "scene":  scene['name'],
            "frame":  total,
            "total":  total,
            "pct":    100.0,
            "status": "finished",
        }), qos=1)
        print(f"\n[replayer] Scene {scene['name']} selesai ({total} frames)")

    def run(self, scene_idx):
        """Connect MQTT dan mulai replay."""
        self.client.connect(self.broker, self.port, keepalive=60)
        self.client.loop_start()
        time.sleep(1)

        try:
            while True:
                self.replay_scene(scene_idx)
                if not self.loop:
                    break
                print(f"[replayer] --loop aktif, mengulang dari awal...\n")
        except KeyboardInterrupt:
            print("\n[replayer] Dihentikan oleh user.")
        finally:
            self.client.loop_stop()
            self.client.disconnect()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="nuScenes → MQTT replayer")
    parser.add_argument("--dataroot",   default=DATAROOT,      help="Path ke folder nuScenes")
    parser.add_argument("--broker",     default=MQTT_BROKER,   help="MQTT broker host")
    parser.add_argument("--port",       default=MQTT_PORT,     type=int)
    parser.add_argument("--scene",      default=0,             type=int, help="Index scene (0-9)")
    parser.add_argument("--speed",      default=1.0,           type=float, help="Kecepatan replay (1.0=normal, 2.0=2x)")
    parser.add_argument("--loop",       action="store_true",   help="Loop terus menerus")
    parser.add_argument("--no-camera",  action="store_true",   dest="no_camera", help="Skip camera frames")
    parser.add_argument("--no-lidar",   action="store_true",   dest="no_lidar",  help="Skip lidar data")
    parser.add_argument("--list-scenes",action="store_true",   dest="list_scenes", help="List semua scene")
    args = parser.parse_args()

    replayer = NuScenesReplayer(
        dataroot  = args.dataroot,
        broker    = args.broker,
        port      = args.port,
        speed     = args.speed,
        loop      = args.loop,
        no_camera = args.no_camera,
        no_lidar  = args.no_lidar,
    )

    if args.list_scenes:
        replayer.list_scenes()
    else:
        replayer.run(args.scene)