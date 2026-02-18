import type { BoardObject } from '../contracts.ts';

export function getSelectionBoxBounds(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  return {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  };
}

export function isObjectInBounds(
  obj: { x: number; y: number; width: number; height: number },
  bounds: { x: number; y: number; width: number; height: number },
): boolean {
  const centerX = obj.x + obj.width / 2;
  const centerY = obj.y + obj.height / 2;
  return (
    centerX >= bounds.x &&
    centerX <= bounds.x + bounds.width &&
    centerY >= bounds.y &&
    centerY <= bounds.y + bounds.height
  );
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getBoundingBox(objects: BoardObject[]): BoundingBox | null {
  if (objects.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const obj of objects) {
    minX = Math.min(minX, obj.x);
    minY = Math.min(minY, obj.y);
    maxX = Math.max(maxX, obj.x + obj.width);
    maxY = Math.max(maxY, obj.y + obj.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const MIN_SIZE = 20;

export function computeResize(
  handle: ResizeHandle,
  dx: number,
  dy: number,
  original: BoundingBox,
): BoundingBox {
  let { x, y, width, height } = original;

  switch (handle) {
    case 'nw':
      x += dx;
      y += dy;
      width -= dx;
      height -= dy;
      break;
    case 'n':
      y += dy;
      height -= dy;
      break;
    case 'ne':
      y += dy;
      width += dx;
      height -= dy;
      break;
    case 'e':
      width += dx;
      break;
    case 'se':
      width += dx;
      height += dy;
      break;
    case 's':
      height += dy;
      break;
    case 'sw':
      x += dx;
      width -= dx;
      height += dy;
      break;
    case 'w':
      x += dx;
      width -= dx;
      break;
  }

  // Enforce min size
  if (width < MIN_SIZE) {
    if (handle.includes('w')) {
      x = original.x + original.width - MIN_SIZE;
    }
    width = MIN_SIZE;
  }
  if (height < MIN_SIZE) {
    if (handle.includes('n')) {
      y = original.y + original.height - MIN_SIZE;
    }
    height = MIN_SIZE;
  }

  return { x, y, width, height };
}

export function computeRotation(
  center: { x: number; y: number },
  mousePos: { x: number; y: number },
): number {
  const angle = Math.atan2(mousePos.y - center.y, mousePos.x - center.x);
  // Convert to degrees and add 90 so that "up" = 0 degrees
  return ((angle * 180) / Math.PI + 90);
}
