import type { BoardObject } from '../contracts.ts';

const objects = new Map<string, BoardObject>();

export function addObject(obj: BoardObject): void { objects.set(obj.id, obj); }
export function setObject(obj: BoardObject): void { objects.set(obj.id, obj); }
export function updateObject(id: string, patch: Partial<BoardObject>): void {
  const existing = objects.get(id);
  if (!existing) return;
  objects.set(id, { ...existing, ...patch, updatedAt: Date.now() } as BoardObject);
}
export function moveObject(id: string, x: number, y: number): void {
  updateObject(id, { x, y });
}
export function removeObject(id: string): void { objects.delete(id); }
export function getObject(id: string): BoardObject | undefined { return objects.get(id); }
export function getAllObjects(): BoardObject[] { return [...objects.values()]; }
export function clear(): void { objects.clear(); }
export function hydrateFromSnapshot(objs: BoardObject[]): void {
  objects.clear();
  for (const obj of objs) {
    objects.set(obj.id, obj);
  }
}
