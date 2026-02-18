import type { BoardObject } from '../contracts.ts';

/**
 * Find objects whose center falls within the given bounds.
 * Excludes objects of type 'frame' and 'connector' to avoid nesting frames/connectors.
 */
export function findObjectsInBounds(
  objects: BoardObject[],
  bounds: { x: number; y: number; width: number; height: number },
): BoardObject[] {
  return objects.filter((obj) => {
    if (obj.type === 'frame' || obj.type === 'connector') return false;
    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;
    return (
      centerX >= bounds.x &&
      centerX <= bounds.x + bounds.width &&
      centerY >= bounds.y &&
      centerY <= bounds.y + bounds.height
    );
  });
}

/**
 * Compute the smallest bounding rect that contains all child objects,
 * with padding around the edges.
 */
export function computeFrameAutoSize(
  childObjects: BoardObject[],
  padding = 40,
): { x: number; y: number; width: number; height: number } | null {
  if (childObjects.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const obj of childObjects) {
    minX = Math.min(minX, obj.x);
    minY = Math.min(minY, obj.y);
    maxX = Math.max(maxX, obj.x + obj.width);
    maxY = Math.max(maxY, obj.y + obj.height);
  }

  return {
    x: minX - padding,
    y: minY - padding - 30, // extra space for title
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2 + 30,
  };
}
