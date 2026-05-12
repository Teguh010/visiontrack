/**
 * Shared LiDAR canvas utilities — height coloring, categories, multi-view projection,
 * and point filtering (testable without React).
 */

import type { AvAnnotation, LidarPoint } from "@/types/av-sensor";

/** Height zones for point coloring (labels optional for legends) */
export const HEIGHT_ZONES: ReadonlyArray<{
  max: number;
  color: string;
  label?: string;
}> = [
  { max: -1.5, color: "#1e3a5f", label: "Below Ground" },
  { max: -0.3, color: "#2d4a3e", label: "Ground Level" },
  { max: 0.3, color: "#3d5a4e", label: "Low Objects" },
  { max: 1.0, color: "#8b7355", label: "Medium" },
  { max: 2.0, color: "#c9a227", label: "Vehicle Height" },
  { max: 4.0, color: "#e85d04", label: "Tall Objects" },
  { max: Number.POSITIVE_INFINITY, color: "#9d0208", label: "Very Tall" },
];

export const CATEGORY_CONFIG: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  human: { icon: "👤", color: "#ef4444", label: "Pedestrian" },
  "vehicle.car": { icon: "🚗", color: "#3b82f6", label: "Car" },
  "vehicle.truck": { icon: "🚛", color: "#8b5cf6", label: "Truck" },
  "vehicle.bus": { icon: "🚌", color: "#6366f1", label: "Bus" },
  "vehicle.motorcycle": { icon: "🏍️", color: "#ec4899", label: "Motorcycle" },
  "vehicle.bicycle": { icon: "🚲", color: "#14b8a6", label: "Bicycle" },
  "vehicle.construction": { icon: "🚜", color: "#f59e0b", label: "Construction" },
  movable_object: { icon: "📦", color: "#78716c", label: "Object" },
  static_object: { icon: "🏗️", color: "#64748b", label: "Static" },
};

export function getHeightColor(z: number): string {
  for (const zone of HEIGHT_ZONES) {
    if (z < zone.max) return zone.color;
  }
  return HEIGHT_ZONES[HEIGHT_ZONES.length - 1].color;
}

export function getCategoryConfig(category: string): {
  icon: string;
  color: string;
  label: string;
} {
  if (CATEGORY_CONFIG[category]) return CATEGORY_CONFIG[category];
  for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
    if (
      category.includes(key) ||
      key.includes(category.split(".")[0] ?? "")
    ) {
      return config;
    }
  }
  return { icon: "❓", color: "#9ca3af", label: category };
}

export type LidarMultiViewAngle =
  | "top"
  | "front"
  | "rear"
  | "left"
  | "right";

export const LIDAR_MULTI_VIEW_DIRECTIONS: Record<
  LidarMultiViewAngle,
  { top: string; bottom: string; left: string; right: string }
> = {
  top: { top: "FRONT", bottom: "REAR", left: "RIGHT", right: "LEFT" },
  front: { top: "UP", bottom: "DOWN", left: "RIGHT", right: "LEFT" },
  rear: { top: "UP", bottom: "DOWN", left: "LEFT", right: "RIGHT" },
  left: { top: "UP", bottom: "DOWN", left: "REAR", right: "FRONT" },
  right: { top: "UP", bottom: "DOWN", left: "FRONT", right: "REAR" },
};

export const LIDAR_MULTI_VIEW_LABELS: Record<LidarMultiViewAngle, string> = {
  top: "Top (Bird's Eye)",
  front: "Front View",
  rear: "Rear View",
  left: "Left Side View",
  right: "Right Side View",
};

const Z_SCALE_SIDE = 1.5;

export function multiViewTransform(
  viewAngle: LidarMultiViewAngle,
  x: number,
  y: number,
  z: number,
  scale: number,
  cx: number,
  cy: number,
): [number, number] {
  switch (viewAngle) {
    case "top":
      return [cx - y * scale, cy - x * scale];
    case "front":
      return [cx - y * scale, cy - z * scale * Z_SCALE_SIDE];
    case "rear":
      return [cx + y * scale, cy - z * scale * Z_SCALE_SIDE];
    case "left":
      return [cx + x * scale, cy - z * scale * Z_SCALE_SIDE];
    case "right":
      return [cx - x * scale, cy - z * scale * Z_SCALE_SIDE];
    default:
      return [cx, cy];
  }
}

export function multiViewBoxTransform(
  viewAngle: LidarMultiViewAngle,
  ann: AvAnnotation,
  scale: number,
): { w: number; h: number; rotation: number } {
  switch (viewAngle) {
    case "top":
      return {
        w: ann.length * scale,
        h: ann.width * scale,
        rotation: -ann.yaw,
      };
    case "front":
    case "rear":
      return {
        w: ann.width * scale,
        h: ann.height * scale * Z_SCALE_SIDE,
        rotation: 0,
      };
    case "left":
    case "right":
      return {
        w: ann.length * scale,
        h: ann.height * scale * Z_SCALE_SIDE,
        rotation: 0,
      };
    default:
      return { w: 0, h: 0, rotation: 0 };
  }
}

/** Euclidean distance in XY from ego */
export function lidarPointRangeXY(p: LidarPoint): number {
  const [x, y] = p;
  return Math.hypot(x, y);
}

/**
 * Points within `range` meters in XY (cheap pre-pass for quad / multi-canvas).
 */
export function filterLidarPointsInRange(
  points: LidarPoint[] | undefined | null,
  range: number,
): LidarPoint[] {
  if (!points?.length) return [];
  const out: LidarPoint[] = [];
  for (const p of points) {
    if (lidarPointRangeXY(p) <= range) out.push(p);
  }
  return out;
}

/**
 * View frustum + range filter. If `alreadyRangeFiltered` is true, `points` are assumed
 * to already satisfy XY distance <= range (skip range check).
 */
export function filterLidarPointsForMultiView(
  points: LidarPoint[],
  viewAngle: LidarMultiViewAngle,
  range: number,
  alreadyRangeFiltered = false,
): LidarPoint[] {
  const out: LidarPoint[] = [];
  for (const p of points) {
    const [x, y] = p;
    if (!alreadyRangeFiltered) {
      if (lidarPointRangeXY(p) > range) continue;
    }
    if (viewAngle === "front" && x < 0) continue;
    if (viewAngle === "rear" && x > 0) continue;
    if (viewAngle === "left" && y < 0) continue;
    if (viewAngle === "right" && y > 0) continue;
    out.push(p);
  }
  return out;
}
