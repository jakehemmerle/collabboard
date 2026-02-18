import type { BoardObject } from '../contracts.ts';
import { cloneObject } from './intent-handler.ts';
import * as store from './object-store.ts';

let clipboardData: BoardObject[] = [];

export function copy(objectIds: string[]): void {
  clipboardData = [];
  for (const id of objectIds) {
    const obj = store.getObject(id);
    if (obj) {
      clipboardData.push({ ...obj });
    }
  }
}

export function paste(centerX: number, centerY: number, actorId: string): BoardObject[] {
  if (clipboardData.length === 0) return [];

  // Compute bounding center of clipboard objects
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const obj of clipboardData) {
    minX = Math.min(minX, obj.x);
    minY = Math.min(minY, obj.y);
    maxX = Math.max(maxX, obj.x + obj.width);
    maxY = Math.max(maxY, obj.y + obj.height);
  }
  const clipCenterX = (minX + maxX) / 2;
  const clipCenterY = (minY + maxY) / 2;
  const offsetX = centerX - clipCenterX;
  const offsetY = centerY - clipCenterY;

  const created: BoardObject[] = [];
  for (const source of clipboardData) {
    const clone = cloneObject(source, actorId, offsetX, offsetY);
    store.addObject(clone);
    created.push(clone);
  }

  return created;
}

export function hasClipboardData(): boolean {
  return clipboardData.length > 0;
}

export function clearClipboard(): void {
  clipboardData = [];
}
