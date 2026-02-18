import { describe, it, expect } from 'vitest';
import {
  clampScale,
  screenToWorld,
  worldToScreen,
  zoomAt,
  panBy,
  hitTest,
} from '../domain/camera.ts';
import { ZOOM_MIN, ZOOM_MAX } from '../contracts.ts';
import type { Camera, Vec2 } from '../contracts.ts';

describe('camera', () => {
  describe('clampScale', () => {
    it('returns scale when within bounds', () => {
      expect(clampScale(1)).toBe(1);
      expect(clampScale(2.5)).toBe(2.5);
    });

    it('clamps below minimum', () => {
      expect(clampScale(0.01)).toBe(ZOOM_MIN);
    });

    it('clamps above maximum', () => {
      expect(clampScale(100)).toBe(ZOOM_MAX);
    });

    it('returns exact boundary values', () => {
      expect(clampScale(ZOOM_MIN)).toBe(ZOOM_MIN);
      expect(clampScale(ZOOM_MAX)).toBe(ZOOM_MAX);
    });
  });

  describe('screenToWorld', () => {
    it('identity at default camera (0,0 scale 1)', () => {
      const camera: Camera = { x: 0, y: 0, scale: 1 };
      expect(screenToWorld(camera, { x: 100, y: 200 })).toEqual({ x: 100, y: 200 });
    });

    it('accounts for camera offset', () => {
      const camera: Camera = { x: 50, y: 100, scale: 1 };
      expect(screenToWorld(camera, { x: 150, y: 200 })).toEqual({ x: 100, y: 100 });
    });

    it('accounts for zoom', () => {
      const camera: Camera = { x: 0, y: 0, scale: 2 };
      expect(screenToWorld(camera, { x: 200, y: 400 })).toEqual({ x: 100, y: 200 });
    });

    it('accounts for offset and zoom together', () => {
      const camera: Camera = { x: 100, y: 50, scale: 0.5 };
      const result = screenToWorld(camera, { x: 200, y: 150 });
      expect(result.x).toBeCloseTo(200);
      expect(result.y).toBeCloseTo(200);
    });
  });

  describe('worldToScreen', () => {
    it('identity at default camera', () => {
      const camera: Camera = { x: 0, y: 0, scale: 1 };
      expect(worldToScreen(camera, { x: 100, y: 200 })).toEqual({ x: 100, y: 200 });
    });

    it('accounts for camera offset', () => {
      const camera: Camera = { x: 50, y: 100, scale: 1 };
      expect(worldToScreen(camera, { x: 100, y: 100 })).toEqual({ x: 150, y: 200 });
    });

    it('accounts for zoom', () => {
      const camera: Camera = { x: 0, y: 0, scale: 2 };
      expect(worldToScreen(camera, { x: 100, y: 200 })).toEqual({ x: 200, y: 400 });
    });

    it('is inverse of screenToWorld', () => {
      const camera: Camera = { x: 30, y: -50, scale: 1.5 };
      const screen: Vec2 = { x: 300, y: 400 };
      const world = screenToWorld(camera, screen);
      const backToScreen = worldToScreen(camera, world);
      expect(backToScreen.x).toBeCloseTo(screen.x);
      expect(backToScreen.y).toBeCloseTo(screen.y);
    });
  });

  describe('zoomAt', () => {
    it('zooms in while keeping the screen point stable', () => {
      const camera: Camera = { x: 0, y: 0, scale: 1 };
      const screenPoint: Vec2 = { x: 400, y: 300 };
      const result = zoomAt(camera, screenPoint, 2);

      expect(result.scale).toBe(2);
      // The world point under the cursor should map to the same screen position
      const worldBefore = screenToWorld(camera, screenPoint);
      const screenAfter = worldToScreen(result, worldBefore);
      expect(screenAfter.x).toBeCloseTo(screenPoint.x);
      expect(screenAfter.y).toBeCloseTo(screenPoint.y);
    });

    it('zooms out', () => {
      const camera: Camera = { x: 0, y: 0, scale: 2 };
      const result = zoomAt(camera, { x: 0, y: 0 }, 0.5);
      expect(result.scale).toBe(1);
    });

    it('clamps scale to max', () => {
      const camera: Camera = { x: 0, y: 0, scale: 4 };
      const result = zoomAt(camera, { x: 0, y: 0 }, 10);
      expect(result.scale).toBe(ZOOM_MAX);
    });

    it('clamps scale to min', () => {
      const camera: Camera = { x: 0, y: 0, scale: 0.2 };
      const result = zoomAt(camera, { x: 0, y: 0 }, 0.01);
      expect(result.scale).toBe(ZOOM_MIN);
    });
  });

  describe('panBy', () => {
    it('adds delta to camera position', () => {
      const camera: Camera = { x: 10, y: 20, scale: 1.5 };
      const result = panBy(camera, { x: 30, y: -10 });
      expect(result).toEqual({ x: 40, y: 10, scale: 1.5 });
    });

    it('preserves scale', () => {
      const camera: Camera = { x: 0, y: 0, scale: 2 };
      const result = panBy(camera, { x: 100, y: 100 });
      expect(result.scale).toBe(2);
    });
  });

  describe('hitTest', () => {
    const rect = { x: 100, y: 100, width: 200, height: 150 };

    it('returns true for a point inside', () => {
      expect(hitTest({ x: 150, y: 150 }, rect)).toBe(true);
    });

    it('returns true for a point on the edge', () => {
      expect(hitTest({ x: 100, y: 100 }, rect)).toBe(true);
      expect(hitTest({ x: 300, y: 250 }, rect)).toBe(true);
    });

    it('returns false for a point outside', () => {
      expect(hitTest({ x: 50, y: 50 }, rect)).toBe(false);
      expect(hitTest({ x: 350, y: 150 }, rect)).toBe(false);
    });
  });
});
