import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { viewportModule, viewportEvents } from '../index.ts';
import type { ViewportApi } from '../contracts.ts';
import { INITIAL_CAMERA, ZOOM_STEP, ZOOM_MIN, ZOOM_MAX } from '../contracts.ts';
import type { Camera } from '../contracts.ts';

const MOCK_ENV = {
  firebaseApiKey: '',
  firebaseAuthDomain: '',
  firebaseProjectId: '',
  firebaseDatabaseUrl: '',
  firebaseStorageBucket: '',
  firebaseMessagingSenderId: '',
  firebaseAppId: '',
  useEmulators: false,
};

// Mock window for zoomIn/zoomOut which use window.innerWidth/innerHeight
const fakeWindow = { innerWidth: 1920, innerHeight: 1080 };
Object.assign(globalThis, { window: fakeWindow });

describe('integration: viewportModule API lifecycle', () => {
  let api: ViewportApi;

  beforeEach(async () => {
    api = await viewportModule.init({ env: MOCK_ENV });
    fakeWindow.innerWidth = 1920;
    fakeWindow.innerHeight = 1080;
  });

  afterEach(async () => {
    await viewportModule.dispose();
  });

  describe('init → setCamera → getCamera round-trip', () => {
    it('returns INITIAL_CAMERA after init', () => {
      const cam = api.getCamera();
      expect(cam).toEqual(INITIAL_CAMERA);
    });

    it('setCamera → getCamera returns the set value', () => {
      api.setCamera({ x: 100, y: -50, scale: 2 });
      expect(api.getCamera()).toEqual({ x: 100, y: -50, scale: 2 });
    });

    it('setCamera clamps scale to valid range', () => {
      api.setCamera({ x: 0, y: 0, scale: 0.001 });
      expect(api.getCamera().scale).toBe(ZOOM_MIN);

      api.setCamera({ x: 0, y: 0, scale: 999 });
      expect(api.getCamera().scale).toBe(ZOOM_MAX);
    });

    it('getCamera returns a copy, not a reference', () => {
      const cam1 = api.getCamera();
      cam1.x = 9999;
      const cam2 = api.getCamera();
      expect(cam2.x).toBe(INITIAL_CAMERA.x);
    });
  });

  describe('panBy + zoomAt composing correctly', () => {
    it('panBy updates camera position, preserves scale', () => {
      api.panBy({ x: 100, y: -50 });
      const cam = api.getCamera();
      expect(cam.x).toBe(100);
      expect(cam.y).toBe(-50);
      expect(cam.scale).toBe(1);
    });

    it('multiple panBy calls accumulate', () => {
      api.panBy({ x: 100, y: 0 });
      api.panBy({ x: 50, y: 200 });
      const cam = api.getCamera();
      expect(cam.x).toBe(150);
      expect(cam.y).toBe(200);
    });

    it('zoomAt changes scale and adjusts position', () => {
      api.zoomAt({ x: 960, y: 540 }, 2);
      const cam = api.getCamera();
      expect(cam.scale).toBe(2);
      // The world point under (960, 540) should be stable
    });

    it('panBy then zoomAt compose: world point under cursor stays stable', () => {
      api.panBy({ x: 200, y: 100 });
      const screenPoint = { x: 500, y: 300 };
      const worldBefore = api.screenToWorld(screenPoint);

      api.zoomAt(screenPoint, 1.5);

      const screenAfter = api.worldToScreen(worldBefore);
      expect(screenAfter.x).toBeCloseTo(screenPoint.x);
      expect(screenAfter.y).toBeCloseTo(screenPoint.y);
    });

    it('zoomAt then panBy preserves scale', () => {
      api.zoomAt({ x: 0, y: 0 }, 3);
      api.panBy({ x: 100, y: 100 });
      expect(api.getCamera().scale).toBe(3);
    });
  });

  describe('fitContent computing correct camera for various layouts', () => {
    it('returns default camera for empty object list', () => {
      api.fitContent([], 1920, 1080);
      const cam = api.getCamera();
      expect(cam).toEqual({ x: 0, y: 0, scale: 1 });
    });

    it('centers a single object', () => {
      const objects = [{ x: 100, y: 100, width: 200, height: 150 }];
      api.fitContent(objects, 1920, 1080);

      // Object center is (200, 175). After fitContent, that world point
      // should map to the screen center (960, 540).
      const screenCenter = api.worldToScreen({ x: 200, y: 175 });
      expect(screenCenter.x).toBeCloseTo(960);
      expect(screenCenter.y).toBeCloseTo(540);
    });

    it('fits a spread-out layout within the viewport', () => {
      const objects = [
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 2000, y: 1000, width: 100, height: 100 },
      ];
      api.fitContent(objects, 1920, 1080);
      const cam = api.getCamera();

      // Scale should be less than 1 since objects span 2100x1100 + padding
      expect(cam.scale).toBeLessThan(1);
      expect(cam.scale).toBeGreaterThan(0);
    });

    it('does not exceed scale cap of 2 for tiny layouts', () => {
      // A tiny single object in a large viewport — scale would want to be huge
      const objects = [{ x: 0, y: 0, width: 10, height: 10 }];
      api.fitContent(objects, 1920, 1080);
      const cam = api.getCamera();
      expect(cam.scale).toBeLessThanOrEqual(2);
    });

    it('clamps scale to at least ZOOM_MIN', () => {
      // Extremely spread out objects
      const objects = [
        { x: 0, y: 0, width: 1, height: 1 },
        { x: 1000000, y: 1000000, width: 1, height: 1 },
      ];
      api.fitContent(objects, 100, 100);
      const cam = api.getCamera();
      expect(cam.scale).toBeGreaterThanOrEqual(ZOOM_MIN);
    });
  });

  describe('EventBus cameraChanged fires on every mutation', () => {
    it('fires on setCamera', () => {
      const events: Camera[] = [];
      const unsub = viewportEvents.on('cameraChanged', (c) => events.push({ ...c }));

      api.setCamera({ x: 10, y: 20, scale: 1.5 });

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ x: 10, y: 20, scale: 1.5 });
      unsub();
    });

    it('fires on panBy', () => {
      const events: Camera[] = [];
      const unsub = viewportEvents.on('cameraChanged', (c) => events.push({ ...c }));

      api.panBy({ x: 50, y: -30 });

      expect(events).toHaveLength(1);
      expect(events[0].x).toBe(50);
      expect(events[0].y).toBe(-30);
      unsub();
    });

    it('fires on zoomAt', () => {
      const events: Camera[] = [];
      const unsub = viewportEvents.on('cameraChanged', (c) => events.push({ ...c }));

      api.zoomAt({ x: 100, y: 100 }, 2);

      expect(events).toHaveLength(1);
      expect(events[0].scale).toBe(2);
      unsub();
    });

    it('fires on zoomIn', () => {
      const events: Camera[] = [];
      const unsub = viewportEvents.on('cameraChanged', (c) => events.push({ ...c }));

      api.zoomIn();

      expect(events).toHaveLength(1);
      expect(events[0].scale).toBe(ZOOM_STEP);
      unsub();
    });

    it('fires on zoomOut', () => {
      const events: Camera[] = [];
      const unsub = viewportEvents.on('cameraChanged', (c) => events.push({ ...c }));

      api.zoomOut();

      expect(events).toHaveLength(1);
      expect(events[0].scale).toBeCloseTo(1 / ZOOM_STEP);
      unsub();
    });

    it('fires on fitContent', () => {
      const events: Camera[] = [];
      const unsub = viewportEvents.on('cameraChanged', (c) => events.push({ ...c }));

      api.fitContent([{ x: 0, y: 0, width: 100, height: 100 }], 1920, 1080);

      expect(events).toHaveLength(1);
      unsub();
    });

    it('accumulates events for multiple operations', () => {
      const events: Camera[] = [];
      const unsub = viewportEvents.on('cameraChanged', (c) => events.push({ ...c }));

      api.panBy({ x: 10, y: 0 });
      api.panBy({ x: 20, y: 0 });
      api.zoomAt({ x: 0, y: 0 }, 1.5);
      api.setCamera({ x: 0, y: 0, scale: 1 });

      expect(events).toHaveLength(4);
      unsub();
    });

    it('unsubscribe stops receiving events', () => {
      const events: Camera[] = [];
      const unsub = viewportEvents.on('cameraChanged', (c) => events.push({ ...c }));

      api.panBy({ x: 10, y: 0 });
      expect(events).toHaveLength(1);

      unsub();
      api.panBy({ x: 20, y: 0 });
      expect(events).toHaveLength(1); // no new event
    });
  });

  describe('screenToWorld / worldToScreen round-trip after pan+zoom', () => {
    it('round-trips at default camera', () => {
      const screen = { x: 500, y: 300 };
      const world = api.screenToWorld(screen);
      const back = api.worldToScreen(world);
      expect(back.x).toBeCloseTo(screen.x);
      expect(back.y).toBeCloseTo(screen.y);
    });

    it('round-trips after panBy', () => {
      api.panBy({ x: -300, y: 150 });
      const screen = { x: 800, y: 600 };
      const world = api.screenToWorld(screen);
      const back = api.worldToScreen(world);
      expect(back.x).toBeCloseTo(screen.x);
      expect(back.y).toBeCloseTo(screen.y);
    });

    it('round-trips after zoomAt', () => {
      api.zoomAt({ x: 960, y: 540 }, 3);
      const screen = { x: 200, y: 100 };
      const world = api.screenToWorld(screen);
      const back = api.worldToScreen(world);
      expect(back.x).toBeCloseTo(screen.x);
      expect(back.y).toBeCloseTo(screen.y);
    });

    it('round-trips after pan + zoom combined', () => {
      api.panBy({ x: 200, y: -100 });
      api.zoomAt({ x: 500, y: 400 }, 2.5);
      api.panBy({ x: -50, y: 80 });

      const screen = { x: 1000, y: 700 };
      const world = api.screenToWorld(screen);
      const back = api.worldToScreen(world);
      expect(back.x).toBeCloseTo(screen.x);
      expect(back.y).toBeCloseTo(screen.y);
    });

    it('world-to-screen-to-world round-trips', () => {
      api.zoomAt({ x: 400, y: 300 }, 0.5);
      api.panBy({ x: 100, y: -200 });

      const world = { x: 350, y: 275 };
      const screen = api.worldToScreen(world);
      const back = api.screenToWorld(screen);
      expect(back.x).toBeCloseTo(world.x);
      expect(back.y).toBeCloseTo(world.y);
    });
  });

  describe('zoomIn / zoomOut (mocked window dimensions)', () => {
    it('zoomIn increases scale by ZOOM_STEP', () => {
      api.zoomIn();
      expect(api.getCamera().scale).toBeCloseTo(ZOOM_STEP);
    });

    it('zoomOut decreases scale by 1/ZOOM_STEP', () => {
      api.zoomOut();
      expect(api.getCamera().scale).toBeCloseTo(1 / ZOOM_STEP);
    });

    it('zoomIn then zoomOut returns to approximately scale 1', () => {
      api.zoomIn();
      api.zoomOut();
      expect(api.getCamera().scale).toBeCloseTo(1, 5);
    });

    it('multiple zoomIn calls compound', () => {
      api.zoomIn();
      api.zoomIn();
      api.zoomIn();
      expect(api.getCamera().scale).toBeCloseTo(ZOOM_STEP ** 3);
    });

    it('zoomIn/zoomOut zoom around screen center', () => {
      const worldCenter = api.screenToWorld({ x: 960, y: 540 });
      api.zoomIn();
      const worldCenterAfter = api.screenToWorld({ x: 960, y: 540 });
      // The world point at screen center should stay the same
      expect(worldCenterAfter.x).toBeCloseTo(worldCenter.x);
      expect(worldCenterAfter.y).toBeCloseTo(worldCenter.y);
    });

    it('zoomIn clamps at ZOOM_MAX', () => {
      api.setCamera({ x: 0, y: 0, scale: ZOOM_MAX });
      api.zoomIn();
      expect(api.getCamera().scale).toBe(ZOOM_MAX);
    });

    it('zoomOut clamps at ZOOM_MIN', () => {
      api.setCamera({ x: 0, y: 0, scale: ZOOM_MIN });
      api.zoomOut();
      expect(api.getCamera().scale).toBe(ZOOM_MIN);
    });

    it('uses mocked window dimensions for center point', () => {
      // At default camera (0,0,1), zoomIn at center (960,540)
      // should produce the same result as zoomAt({x:960,y:540}, ZOOM_STEP)
      const apiForManual = api;
      apiForManual.setCamera({ ...INITIAL_CAMERA });

      // Get expected result from manual zoomAt
      apiForManual.zoomAt({ x: 960, y: 540 }, ZOOM_STEP);
      const expected = apiForManual.getCamera();

      // Reset and use zoomIn
      apiForManual.setCamera({ ...INITIAL_CAMERA });
      apiForManual.zoomIn();
      const actual = apiForManual.getCamera();

      expect(actual.x).toBeCloseTo(expected.x);
      expect(actual.y).toBeCloseTo(expected.y);
      expect(actual.scale).toBeCloseTo(expected.scale);
    });
  });
});
