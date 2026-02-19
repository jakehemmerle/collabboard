import type { Camera } from '../../viewport/contracts.ts';
import type { BoardObject, ConnectorObject } from '../contracts.ts';

export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Convert screen corners to world coords and expand by margin to prevent pop-in during pan.
 */
export function computeViewportBounds(
  camera: Camera,
  screenWidth: number,
  screenHeight: number,
  margin = 200,
): ViewportBounds {
  // Screen-to-world: (screen - offset) / scale
  const minX = (0 - camera.x) / camera.scale - margin;
  const minY = (0 - camera.y) / camera.scale - margin;
  const maxX = (screenWidth - camera.x) / camera.scale + margin;
  const maxY = (screenHeight - camera.y) / camera.scale + margin;

  return { minX, minY, maxX, maxY };
}

/**
 * Compute the axis-aligned bounding box for a rotated rectangle.
 * The rotation pivot is the object's center: (x + w/2, y + h/2).
 */
function rotatedAABB(
  x: number, y: number, w: number, h: number, rotationDeg: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const halfW = w / 2;
  const halfH = h / 2;
  const rotHalfW = halfW * cos + halfH * sin;
  const rotHalfH = halfW * sin + halfH * cos;
  const cx = x + halfW;
  const cy = y + halfH;
  return { minX: cx - rotHalfW, minY: cy - rotHalfH, maxX: cx + rotHalfW, maxY: cy + rotHalfH };
}

/**
 * AABB overlap test — returns true if any part of the object overlaps the bounds.
 * Lines need special handling: their visual extent is min(x,x2)..max(x,x2),
 * not x..x+width, because x2 can be less than x.
 * Rotated objects use the expanded axis-aligned bounding box.
 */
export function isObjectVisible(obj: BoardObject, bounds: ViewportBounds): boolean {
  let objMinX: number;
  let objMaxX: number;
  let objMinY: number;
  let objMaxY: number;

  if (obj.type === 'line') {
    const line = obj as import('../contracts.ts').LineObject;
    objMinX = Math.min(obj.x, line.x2);
    objMaxX = Math.max(obj.x, line.x2);
    objMinY = Math.min(obj.y, line.y2);
    objMaxY = Math.max(obj.y, line.y2);
  } else if (obj.rotation) {
    const r = rotatedAABB(obj.x, obj.y, obj.width, obj.height, obj.rotation);
    objMinX = r.minX;
    objMaxX = r.maxX;
    objMinY = r.minY;
    objMaxY = r.maxY;
  } else {
    objMinX = obj.x;
    objMaxX = obj.x + obj.width;
    objMinY = obj.y;
    objMaxY = obj.y + obj.height;
  }

  return (
    objMaxX >= bounds.minX &&
    objMinX <= bounds.maxX &&
    objMaxY >= bounds.minY &&
    objMinY <= bounds.maxY
  );
}

/**
 * Two-pass filter:
 * 1. Filter non-connector objects by AABB overlap, build set of visible IDs
 * 2. Include connectors whose source OR target is in the visible set
 */
export function getVisibleObjects(objects: BoardObject[], bounds: ViewportBounds): BoardObject[] {
  const visibleIds = new Set<string>();
  const nonConnectors: BoardObject[] = [];
  const connectors: ConnectorObject[] = [];

  for (const obj of objects) {
    if (obj.type === 'connector') {
      connectors.push(obj as ConnectorObject);
    } else {
      if (isObjectVisible(obj, bounds)) {
        visibleIds.add(obj.id);
        nonConnectors.push(obj);
      }
    }
  }

  const visibleConnectors = connectors.filter(
    (c) => visibleIds.has(c.sourceId) || visibleIds.has(c.targetId),
  );

  return [...nonConnectors, ...visibleConnectors];
}
