import type { BoardObject } from '../contracts.ts';

export interface PositionUpdate {
  id: string;
  x: number;
  y: number;
}

export function alignLeft(objects: BoardObject[]): PositionUpdate[] {
  if (objects.length < 2) return [];
  const minX = Math.min(...objects.map(o => o.x));
  return objects.map(o => ({ id: o.id, x: minX, y: o.y }));
}

export function alignRight(objects: BoardObject[]): PositionUpdate[] {
  if (objects.length < 2) return [];
  const maxRight = Math.max(...objects.map(o => o.x + o.width));
  return objects.map(o => ({ id: o.id, x: maxRight - o.width, y: o.y }));
}

export function alignCenterH(objects: BoardObject[]): PositionUpdate[] {
  if (objects.length < 2) return [];
  const minX = Math.min(...objects.map(o => o.x));
  const maxRight = Math.max(...objects.map(o => o.x + o.width));
  const centerX = (minX + maxRight) / 2;
  return objects.map(o => ({ id: o.id, x: centerX - o.width / 2, y: o.y }));
}

export function alignTop(objects: BoardObject[]): PositionUpdate[] {
  if (objects.length < 2) return [];
  const minY = Math.min(...objects.map(o => o.y));
  return objects.map(o => ({ id: o.id, x: o.x, y: minY }));
}

export function alignBottom(objects: BoardObject[]): PositionUpdate[] {
  if (objects.length < 2) return [];
  const maxBottom = Math.max(...objects.map(o => o.y + o.height));
  return objects.map(o => ({ id: o.id, x: o.x, y: maxBottom - o.height }));
}

export function alignCenterV(objects: BoardObject[]): PositionUpdate[] {
  if (objects.length < 2) return [];
  const minY = Math.min(...objects.map(o => o.y));
  const maxBottom = Math.max(...objects.map(o => o.y + o.height));
  const centerY = (minY + maxBottom) / 2;
  return objects.map(o => ({ id: o.id, x: o.x, y: centerY - o.height / 2 }));
}

export function distributeH(objects: BoardObject[]): PositionUpdate[] {
  if (objects.length < 3) return [];
  const sorted = [...objects].sort((a, b) => a.x - b.x);
  const totalWidth = sorted.reduce((sum, o) => sum + o.width, 0);
  const minX = sorted[0].x;
  const maxRight = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width;
  const totalSpace = maxRight - minX - totalWidth;
  const gap = totalSpace / (sorted.length - 1);

  let currentX = minX;
  return sorted.map(o => {
    const update = { id: o.id, x: currentX, y: o.y };
    currentX += o.width + gap;
    return update;
  });
}

export function distributeV(objects: BoardObject[]): PositionUpdate[] {
  if (objects.length < 3) return [];
  const sorted = [...objects].sort((a, b) => a.y - b.y);
  const totalHeight = sorted.reduce((sum, o) => sum + o.height, 0);
  const minY = sorted[0].y;
  const maxBottom = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height;
  const totalSpace = maxBottom - minY - totalHeight;
  const gap = totalSpace / (sorted.length - 1);

  let currentY = minY;
  return sorted.map(o => {
    const update = { id: o.id, x: o.x, y: currentY };
    currentY += o.height + gap;
    return update;
  });
}
