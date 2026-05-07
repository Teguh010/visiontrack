/**
 * GPS Fleet Simulator — Enhanced
 * ──────────────────────────────────────────────────────────────────
 * Simulates 4 vehicles dengan state machine yang lebih realistis:
 *
 *  DRIVING → bergerak normal (30-70 km/h)
 *  IDLE    → mesin nyala tapi diam di tempat (<5 km/h, ~15-30 detik)
 *  STOPPED → parkir / mati mesin (>2 menit)
 *
 * Vehicle "personalities":
 *  VH-001 → City Driver    — sering berhenti di lampu merah (IDLE frequent)
 *  VH-002 → Highway Driver — jarang berhenti, kecepatan tinggi
 *  VH-003 → Delivery       — sering STOPPED (bongkar muat)
 *  VH-004 → Patrol         → IDLE panjang, rute kecil
 *
 * MQTT Topic : vehicle/{vehicleId}/location
 * MQTT Broker: mqtt://localhost:1883
 */

import mqtt, { MqttClient } from "mqtt";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Waypoint {
  lat: number;
  lon: number;
}

type DriveState = "DRIVING" | "IDLE" | "STOPPED";

interface VehiclePayload {
  vehicleId: string;
  vehicleType: string;          // CITY | HIGHWAY | DELIVERY | PATROL
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  driveState: DriveState;
  /** Derived from driveState for backend compatibility */
  status: "MOVING" | "STOPPED";
  timestamp: number;
}

interface VehiclePersonality {
  /** Probability of going IDLE at each waypoint */
  idleProbability: number;
  /** Probability of going STOPPED at each waypoint */
  stopProbability: number;
  /** IDLE duration in ticks (1 tick = 3s) */
  idleDurationTicks: [number, number]; // [min, max]
  /** STOP duration in ticks */
  stopDurationTicks: [number, number];
  /** Speed multiplier (1.0 = normal) */
  speedMultiplier: number;
  /** Max speed override (km/h) */
  maxSpeed: number;
}

interface VehicleState {
  id: string;
  name: string;
  type: string;
  route: Waypoint[];
  personality: VehiclePersonality;
  // motion
  currentWaypointIndex: number;
  interpolationStep: number;
  // state machine
  driveState: DriveState;
  stateCountdown: number; // ticks remaining in current non-driving state
}

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle Personalities
// ─────────────────────────────────────────────────────────────────────────────

const PERSONALITIES: Record<string, VehiclePersonality> = {
  CITY: {
    idleProbability: 0.20,   // 20% chance idle at waypoint (lampu merah)
    stopProbability: 0.05,
    idleDurationTicks: [3, 8],   // 9–24 detik
    stopDurationTicks: [10, 20], // 30–60 detik
    speedMultiplier: 0.7,
    maxSpeed: 50,
  },
  HIGHWAY: {
    idleProbability: 0.03,
    stopProbability: 0.02,
    idleDurationTicks: [2, 4],
    stopDurationTicks: [5, 10],
    speedMultiplier: 1.4,
    maxSpeed: 100,
  },
  DELIVERY: {
    idleProbability: 0.10,
    stopProbability: 0.20,   // 20% chance stop (bongkar muat)
    idleDurationTicks: [2, 5],
    stopDurationTicks: [20, 50], // 60–150 detik
    speedMultiplier: 0.8,
    maxSpeed: 60,
  },
  PATROL: {
    idleProbability: 0.30,   // Sering idle (nunggu)
    stopProbability: 0.10,
    idleDurationTicks: [8, 20],  // 24–60 detik
    stopDurationTicks: [15, 30],
    speedMultiplier: 0.6,
    maxSpeed: 40,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Routes (area Surabaya, Indonesia)
// ─────────────────────────────────────────────────────────────────────────────

const ROUTES: Record<string, Waypoint[]> = {
  "VH-001": [
    // City: Tunjungan → Gubeng → Wonokromo → Darmo → kembali
    { lat: -7.2575, lon: 112.7382 },
    { lat: -7.2614, lon: 112.7521 },
    { lat: -7.2692, lon: 112.7489 },
    { lat: -7.2831, lon: 112.7372 },
    { lat: -7.2975, lon: 112.7351 },
    { lat: -7.3041, lon: 112.7265 },
    { lat: -7.2975, lon: 112.7351 },
    { lat: -7.2831, lon: 112.7372 },
    { lat: -7.2692, lon: 112.7489 },
    { lat: -7.2614, lon: 112.7521 },
  ],
  "VH-002": [
    // Highway: Ring Road Surabaya Timur (jarak panjang antar waypoint)
    { lat: -7.2252, lon: 112.7801 },
    { lat: -7.2150, lon: 112.7920 },
    { lat: -7.2050, lon: 112.8050 },
    { lat: -7.1950, lon: 112.8150 },
    { lat: -7.2050, lon: 112.8050 },
    { lat: -7.2150, lon: 112.7920 },
    { lat: -7.2252, lon: 112.7801 },
    { lat: -7.2381, lon: 112.7651 },
    { lat: -7.2252, lon: 112.7801 },
  ],
  "VH-003": [
    // Delivery: Wiyung → Lakarsantri area (banyak titik berhenti)
    { lat: -7.3125, lon: 112.6841 },
    { lat: -7.3180, lon: 112.6780 },
    { lat: -7.3214, lon: 112.6712 },
    { lat: -7.3250, lon: 112.6650 },
    { lat: -7.3182, lon: 112.6595 },
    { lat: -7.3100, lon: 112.6550 },
    { lat: -7.3058, lon: 112.6491 },
    { lat: -7.3100, lon: 112.6550 },
    { lat: -7.3182, lon: 112.6595 },
    { lat: -7.3214, lon: 112.6712 },
  ],
  "VH-004": [
    // Patrol: Area kecil Surabaya Pusat (bolak-balik)
    { lat: -7.2500, lon: 112.7350 },
    { lat: -7.2530, lon: 112.7400 },
    { lat: -7.2560, lon: 112.7370 },
    { lat: -7.2540, lon: 112.7320 },
    { lat: -7.2510, lon: 112.7300 },
    { lat: -7.2500, lon: 112.7350 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function interpolate(a: Waypoint, b: Waypoint, t: number): Waypoint {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lon: a.lon + (b.lon - a.lon) * t,
  };
}

function calculateHeading(a: Waypoint, b: Waypoint): number {
  const dLon = b.lon - a.lon;
  const dLat = b.lat - a.lat;
  return ((Math.atan2(dLon, dLat) * 180) / Math.PI + 360) % 360;
}

function addGpsNoise(value: number, noise = 0.0002): number {
  return value + (Math.random() - 0.5) * noise;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const STATE_ICONS: Record<DriveState, string> = {
  DRIVING: "🟢",
  IDLE:    "🟡",
  STOPPED: "🔴",
};

// ─────────────────────────────────────────────────────────────────────────────
// State Machine Tick
// ─────────────────────────────────────────────────────────────────────────────

const STEPS_PER_SEGMENT = 10;

function tick(vehicle: VehicleState): VehiclePayload {
  const { route, personality } = vehicle;
  const currentWP = route[vehicle.currentWaypointIndex];
  const nextWP    = route[(vehicle.currentWaypointIndex + 1) % route.length];
  const heading   = calculateHeading(currentWP, nextWP);

  // ── Handle non-driving states ──────────────────────────────────
  if (vehicle.driveState === "STOPPED" || vehicle.driveState === "IDLE") {
    vehicle.stateCountdown--;

    if (vehicle.stateCountdown <= 0) {
      vehicle.driveState = "DRIVING";
      console.log(`  ${STATE_ICONS.DRIVING} ${vehicle.id} resumed DRIVING`);
    }

    // When stopped/idle: tiny GPS jitter only, no movement
    const noiseLevel = vehicle.driveState === "IDLE" ? 0.0001 : 0.00005;
    return {
      vehicleId: vehicle.id,
      vehicleType: vehicle.type,
      lat: addGpsNoise(currentWP.lat, noiseLevel),
      lon: addGpsNoise(currentWP.lon, noiseLevel),
      speed: vehicle.driveState === "IDLE" ? Math.round(Math.random() * 20) / 10 : 0, // IDLE: 0.0–2.0 km/h
      heading,
      driveState: vehicle.driveState,
      status: "STOPPED",
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  // ── DRIVING state — interpolate position ───────────────────────
  const t = vehicle.interpolationStep / STEPS_PER_SEGMENT;
  const pos = interpolate(currentWP, nextWP, t);

  // Speed: sine curve for smooth acceleration/deceleration
  const baseSpeed = 20 + Math.random() * (personality.maxSpeed - 20);
  const speedFactor = Math.sin(Math.PI * t); // 0 at endpoints, 1 at midpoint
  const speed = Math.max(5, Math.min(
    personality.maxSpeed,
    baseSpeed * personality.speedMultiplier * (0.5 + 0.5 * speedFactor)
  ));

  // Advance step
  vehicle.interpolationStep++;

  if (vehicle.interpolationStep >= STEPS_PER_SEGMENT) {
    vehicle.interpolationStep = 0;
    vehicle.currentWaypointIndex = (vehicle.currentWaypointIndex + 1) % route.length;

    // ── State transition at waypoint ──────────────────────────────
    const roll = Math.random();

    if (roll < personality.stopProbability) {
      vehicle.driveState = "STOPPED";
      vehicle.stateCountdown = randInt(...personality.stopDurationTicks);
      console.log(`  ${STATE_ICONS.STOPPED} ${vehicle.id} STOPPED (${vehicle.stateCountdown * 3}s)`);
    } else if (roll < personality.stopProbability + personality.idleProbability) {
      vehicle.driveState = "IDLE";
      vehicle.stateCountdown = randInt(...personality.idleDurationTicks);
      console.log(`  ${STATE_ICONS.IDLE} ${vehicle.id} IDLE (${vehicle.stateCountdown * 3}s)`);
    }
  }

  return {
    vehicleId: vehicle.id,
    vehicleType: vehicle.type,
    lat: addGpsNoise(pos.lat),
    lon: addGpsNoise(pos.lon),
    speed: Math.round(speed * 10) / 10,
    heading: Math.round(heading),
    driveState: "DRIVING",
    status: "MOVING",
    timestamp: Math.floor(Date.now() / 1000),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Initialize Vehicles
// ─────────────────────────────────────────────────────────────────────────────

const VEHICLE_CONFIG: Array<{ id: string; name: string; type: string; personality: VehiclePersonality }> = [
  { id: "VH-001", name: "City Bus 01",      type: "CITY",     personality: PERSONALITIES.CITY     },
  { id: "VH-002", name: "Express Truck 02", type: "HIGHWAY",  personality: PERSONALITIES.HIGHWAY  },
  { id: "VH-003", name: "Delivery Van 03",  type: "DELIVERY", personality: PERSONALITIES.DELIVERY },
  { id: "VH-004", name: "Patrol Car 04",    type: "PATROL",   personality: PERSONALITIES.PATROL   },
];

const vehicles: VehicleState[] = VEHICLE_CONFIG.map(({ id, name, type, personality }) => ({
  id,
  name,
  type,
  route: ROUTES[id],
  personality,
  currentWaypointIndex: 0,
  interpolationStep: 0,
  driveState: "DRIVING",
  stateCountdown: 0,
}));

// ─────────────────────────────────────────────────────────────────────────────
// MQTT Connection & Publish Loop
// ─────────────────────────────────────────────────────────────────────────────

const BROKER_URL        = "mqtt://localhost:1883";
const PUBLISH_INTERVAL  = 3000; // ms

console.log("🚀 Fleet GPS Simulator (Enhanced) starting...");
console.log(`📡 Connecting to MQTT broker: ${BROKER_URL}`);
console.log(`🚗 Vehicles: ${vehicles.map(v => `${v.id}(${v.type})`).join(" | ")}`);
console.log(`⏱  Publish interval: ${PUBLISH_INTERVAL / 1000}s\n`);
console.log("State legend: 🟢 DRIVING  🟡 IDLE  🔴 STOPPED\n");

const client: MqttClient = mqtt.connect(BROKER_URL, {
  clientId: `fleet-simulator-${Date.now()}`,
  clean: true,
  reconnectPeriod: 3000,
});

client.on("connect", () => {
  console.log("✅ Connected to MQTT broker!\n");

  setInterval(() => {
    const ts = new Date().toISOString().substring(11, 19);

    vehicles.forEach((vehicle) => {
      const payload = tick(vehicle);
      const topic   = `vehicle/${vehicle.id}/location`;

      client.publish(topic, JSON.stringify(payload), { qos: 1 });

      const icon = STATE_ICONS[payload.driveState];
      console.log(
        `[${ts}] ${icon} ${vehicle.id}(${vehicle.type.padEnd(8)}) ` +
        `lat:${payload.lat.toFixed(5)} lon:${payload.lon.toFixed(5)} ` +
        `speed:${String(payload.speed).padStart(5)} km/h  ${payload.driveState}`
      );
    });

    console.log("");
  }, PUBLISH_INTERVAL);
});

client.on("error",   (err) => console.error("❌ MQTT Error:", err.message));
client.on("reconnect", () => console.log("🔄 Reconnecting..."));
client.on("offline",   () => console.log("📴 MQTT client offline"));

process.on("SIGINT", () => {
  console.log("\n🛑 Simulator shutting down...");
  client.end(false, {}, () => {
    console.log("✅ Goodbye!");
    process.exit(0);
  });
});
