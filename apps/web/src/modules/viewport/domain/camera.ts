import type { Camera, Vec2 } from '../contracts.ts';
import { ZOOM_MIN, ZOOM_MAX } from '../contracts.ts';

export function clampScale(scale: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale));
}

export function screenToWorld(camera: Camera, screen: Vec2): Vec2 {
  return {
    x: (screen.x - camera.x) / camera.scale,
    y: (screen.y - camera.y) / camera.scale,
  };
}

export function worldToScreen(camera: Camera, world: Vec2): Vec2 {
  return {
    x: world.x * camera.scale + camera.x,
    y: world.y * camera.scale + camera.y,
  };
}

export function zoomAt(camera: Camera, screenPoint: Vec2, factor: number): Camera {
  const worldPoint = screenToWorld(camera, screenPoint);
  const newScale = clampScale(camera.scale * factor);
  return {
    x: screenPoint.x - worldPoint.x * newScale,
    y: screenPoint.y - worldPoint.y * newScale,
    scale: newScale,
  };
}

export function panBy(camera: Camera, delta: Vec2): Camera {
  return {
    x: camera.x + delta.x,
    y: camera.y + delta.y,
    scale: camera.scale,
  };
}

export function hitTest(
  worldPoint: Vec2,
  rect: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    worldPoint.x >= rect.x &&
    worldPoint.x <= rect.x + rect.width &&
    worldPoint.y >= rect.y &&
    worldPoint.y <= rect.y + rect.height
  );
}
