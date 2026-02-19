import { describe, it, expect } from 'vitest';
import {
  computeViewportBounds,
  isObjectVisible,
  getVisibleObjects,
} from '../domain/viewport-culling.ts';
import type { ViewportBounds } from '../domain/viewport-culling.ts';
import type { BoardObject } from '../contracts.ts';

function makeObj(overrides: Partial<BoardObject> & { id: string; type: BoardObject['type'] }): BoardObject {
  return {
    x: 0, y: 0, width: 100, height: 100,
    createdBy: 'test', createdAt: 0, updatedAt: 0,
    ...overrides,
  } as BoardObject;
}

describe('computeViewportBounds', () => {
  it('computes bounds at default camera (origin, scale=1)', () => {
    const bounds = computeViewportBounds({ x: 0, y: 0, scale: 1 }, 1920, 1080);
    expect(bounds.minX).toBe(-200);
    expect(bounds.minY).toBe(-200);
    expect(bounds.maxX).toBe(1920 + 200);
    expect(bounds.maxY).toBe(1080 + 200);
  });

  it('accounts for camera offset (pan)', () => {
    // Camera panned so that world (500, 300) is at screen origin
    const bounds = computeViewportBounds({ x: -500, y: -300, scale: 1 }, 1920, 1080);
    expect(bounds.minX).toBe(500 - 200);
    expect(bounds.minY).toBe(300 - 200);
    expect(bounds.maxX).toBe(500 + 1920 + 200);
    expect(bounds.maxY).toBe(300 + 1080 + 200);
  });

  it('accounts for zoom', () => {
    const bounds = computeViewportBounds({ x: 0, y: 0, scale: 2 }, 1920, 1080);
    // (0 - 0) / 2 - 200 = -200, (1920 - 0) / 2 + 200 = 1160
    expect(bounds.minX).toBe(-200);
    expect(bounds.minY).toBe(-200);
    expect(bounds.maxX).toBe(1920 / 2 + 200);
    expect(bounds.maxY).toBe(1080 / 2 + 200);
  });

  it('uses custom margin', () => {
    const bounds = computeViewportBounds({ x: 0, y: 0, scale: 1 }, 800, 600, 0);
    expect(bounds.minX).toBe(0);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxX).toBe(800);
    expect(bounds.maxY).toBe(600);
  });

  it('handles fractional zoom levels', () => {
    const bounds = computeViewportBounds({ x: 0, y: 0, scale: 0.5 }, 1000, 800, 100);
    expect(bounds.minX).toBe(-100);
    expect(bounds.minY).toBe(-100);
    expect(bounds.maxX).toBe(1000 / 0.5 + 100);
    expect(bounds.maxY).toBe(800 / 0.5 + 100);
  });
});

describe('isObjectVisible', () => {
  const bounds: ViewportBounds = { minX: 0, minY: 0, maxX: 1000, maxY: 800 };

  it('returns true for object fully inside', () => {
    const obj = makeObj({ id: '1', type: 'rectangle', x: 100, y: 100, width: 200, height: 200 });
    expect(isObjectVisible(obj, bounds)).toBe(true);
  });

  it('returns true for object partially overlapping left edge', () => {
    const obj = makeObj({ id: '1', type: 'rectangle', x: -50, y: 100, width: 200, height: 200 });
    expect(isObjectVisible(obj, bounds)).toBe(true);
  });

  it('returns true for object partially overlapping right edge', () => {
    const obj = makeObj({ id: '1', type: 'rectangle', x: 900, y: 100, width: 200, height: 200 });
    expect(isObjectVisible(obj, bounds)).toBe(true);
  });

  it('returns true for object partially overlapping top edge', () => {
    const obj = makeObj({ id: '1', type: 'rectangle', x: 100, y: -50, width: 200, height: 200 });
    expect(isObjectVisible(obj, bounds)).toBe(true);
  });

  it('returns true for object partially overlapping bottom edge', () => {
    const obj = makeObj({ id: '1', type: 'rectangle', x: 100, y: 700, width: 200, height: 200 });
    expect(isObjectVisible(obj, bounds)).toBe(true);
  });

  it('returns false for object fully to the left', () => {
    const obj = makeObj({ id: '1', type: 'rectangle', x: -300, y: 100, width: 200, height: 200 });
    expect(isObjectVisible(obj, bounds)).toBe(false);
  });

  it('returns false for object fully to the right', () => {
    const obj = makeObj({ id: '1', type: 'rectangle', x: 1100, y: 100, width: 200, height: 200 });
    expect(isObjectVisible(obj, bounds)).toBe(false);
  });

  it('returns false for object fully above', () => {
    const obj = makeObj({ id: '1', type: 'rectangle', x: 100, y: -300, width: 200, height: 200 });
    expect(isObjectVisible(obj, bounds)).toBe(false);
  });

  it('returns false for object fully below', () => {
    const obj = makeObj({ id: '1', type: 'rectangle', x: 100, y: 900, width: 200, height: 200 });
    expect(isObjectVisible(obj, bounds)).toBe(false);
  });

  it('returns true for large frame partially on screen', () => {
    // Frame extends from -500 to +1500 — much larger than viewport
    const obj = makeObj({ id: '1', type: 'frame', x: -500, y: -500, width: 2000, height: 2000 });
    expect(isObjectVisible(obj, bounds)).toBe(true);
  });

  it('handles zero-size objects at boundary', () => {
    const obj = makeObj({ id: '1', type: 'rectangle', x: 0, y: 0, width: 0, height: 0 });
    expect(isObjectVisible(obj, bounds)).toBe(true);
  });

  it('handles line drawn backward (x2 < x) correctly', () => {
    // Line from (500, 400) to (100, 100) — extends left/up from origin
    const obj = makeObj({ id: '1', type: 'line', x: 500, y: 400, width: 400, height: 300, x2: 100, y2: 100, stroke: '#000', strokeWidth: 2 } as unknown as Partial<BoardObject> & { id: string; type: 'line' });
    // Viewport [150, 0] to [400, 300] — line passes through it
    const narrowBounds: ViewportBounds = { minX: 150, minY: 0, maxX: 400, maxY: 300 };
    expect(isObjectVisible(obj, narrowBounds)).toBe(true);
  });

  it('culls backward line fully outside viewport', () => {
    const obj = makeObj({ id: '1', type: 'line', x: 500, y: 400, width: 400, height: 300, x2: 100, y2: 100, stroke: '#000', strokeWidth: 2 } as unknown as Partial<BoardObject> & { id: string; type: 'line' });
    // Viewport entirely to the right of the line
    const farBounds: ViewportBounds = { minX: 600, minY: 0, maxX: 900, maxY: 300 };
    expect(isObjectVisible(obj, farBounds)).toBe(false);
  });

  it('handles negative coordinates', () => {
    const negBounds: ViewportBounds = { minX: -500, minY: -500, maxX: 500, maxY: 500 };
    const obj = makeObj({ id: '1', type: 'rectangle', x: -400, y: -400, width: 100, height: 100 });
    expect(isObjectVisible(obj, negBounds)).toBe(true);
  });

  it('expands AABB for rotated object that would otherwise be culled', () => {
    // Tall narrow rect at (990, 350) with width=20, height=300.
    // Unrotated: x range [990, 1010], y range [350, 650] — just barely inside bounds.maxX=1000.
    // Rotate 90°: the 300px height becomes the horizontal extent.
    // Rotated AABB center = (1000, 500), half-extents = (150, 10).
    // Rotated x range: [850, 1150] — still overlaps viewport.
    const bounds90: ViewportBounds = { minX: 0, minY: 0, maxX: 1000, maxY: 800 };
    const rotatedObj = makeObj({ id: '1', type: 'rectangle', x: 990, y: 350, width: 20, height: 300, rotation: 90 });
    expect(isObjectVisible(rotatedObj, bounds90)).toBe(true);
  });

  it('culls rotated object fully outside expanded AABB', () => {
    // Object at (1200, 350) with width=20, height=300, rotated 90°.
    // Center = (1210, 500), rotated half-extents = (150, 10).
    // x range: [1060, 1360] — fully right of bounds.maxX=1000.
    const bounds90: ViewportBounds = { minX: 0, minY: 0, maxX: 1000, maxY: 800 };
    const farObj = makeObj({ id: '1', type: 'rectangle', x: 1200, y: 350, width: 20, height: 300, rotation: 90 });
    expect(isObjectVisible(farObj, bounds90)).toBe(false);
  });

  it('45-degree rotation expands AABB enough to stay visible', () => {
    // 200x100 rect at (850, 350). Unrotated: x range [850, 1050] — overlaps.
    // At 45°: center=(950, 400), half-extents become ~(106, 106).
    // x range: ~[844, 1056] — still overlaps viewport maxX=1000.
    const bounds45: ViewportBounds = { minX: 0, minY: 0, maxX: 900, maxY: 800 };
    // Unrotated: x range [850, 1050] — objMinX=850 < 900, so it overlaps anyway.
    // Move it further right so unrotated would be culled but rotated is not.
    // Object at (910, 350), w=200, h=100. Unrotated: [910, 1110] — minX=910 > maxX=900, CULLED.
    // Rotated 45°: center=(1010, 400), halfW = 100*cos45 + 50*sin45 = ~106.
    // x range: [904, 1116] — minX=904 > 900, still culled. Need tighter example.
    // Object at (895, 350), w=200, h=100. Unrotated: [895, 1095] — minX=895 < 900, visible.
    // Need an example where unrotated is culled but rotated is not.
    // obj at (905, 350), w=20, h=300. Unrotated: [905, 925] — minX=905 > 900, CULLED.
    // Rotated 45°: center=(915, 500), halfW = 10*cos45 + 150*sin45 = ~113.
    // x range: [802, 1028] — minX=802 < 900, VISIBLE!
    const obj45 = makeObj({ id: '1', type: 'rectangle', x: 905, y: 350, width: 20, height: 300, rotation: 45 });
    expect(isObjectVisible(obj45, bounds45)).toBe(true);

    // Verify unrotated version would be culled
    const unrotated = makeObj({ id: '2', type: 'rectangle', x: 905, y: 350, width: 20, height: 300 });
    expect(isObjectVisible(unrotated, bounds45)).toBe(false);
  });
});

describe('getVisibleObjects', () => {
  const bounds: ViewportBounds = { minX: 0, minY: 0, maxX: 1000, maxY: 800 };

  it('filters regular objects by visibility', () => {
    const objects: BoardObject[] = [
      makeObj({ id: 'visible', type: 'rectangle', x: 100, y: 100, width: 200, height: 200 }),
      makeObj({ id: 'hidden', type: 'rectangle', x: 2000, y: 2000, width: 200, height: 200 }),
    ];
    const result = getVisibleObjects(objects, bounds);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('visible');
  });

  it('includes connectors when source is visible', () => {
    const objects: BoardObject[] = [
      makeObj({ id: 'src', type: 'rectangle', x: 100, y: 100, width: 100, height: 100 }),
      makeObj({ id: 'tgt', type: 'rectangle', x: 2000, y: 2000, width: 100, height: 100 }),
      makeObj({ id: 'conn', type: 'connector', sourceId: 'src', targetId: 'tgt', stroke: '#000', strokeWidth: 2, style: 'arrow' } as unknown as Partial<BoardObject> & { id: string; type: 'connector' }),
    ];
    const result = getVisibleObjects(objects, bounds);
    expect(result.map((o) => o.id).sort()).toEqual(['conn', 'src']);
  });

  it('includes connectors when target is visible', () => {
    const objects: BoardObject[] = [
      makeObj({ id: 'src', type: 'rectangle', x: 2000, y: 2000, width: 100, height: 100 }),
      makeObj({ id: 'tgt', type: 'rectangle', x: 100, y: 100, width: 100, height: 100 }),
      makeObj({ id: 'conn', type: 'connector', sourceId: 'src', targetId: 'tgt', stroke: '#000', strokeWidth: 2, style: 'arrow' } as unknown as Partial<BoardObject> & { id: string; type: 'connector' }),
    ];
    const result = getVisibleObjects(objects, bounds);
    expect(result.map((o) => o.id).sort()).toEqual(['conn', 'tgt']);
  });

  it('excludes connectors when both source and target are hidden', () => {
    const objects: BoardObject[] = [
      makeObj({ id: 'src', type: 'rectangle', x: 2000, y: 2000, width: 100, height: 100 }),
      makeObj({ id: 'tgt', type: 'rectangle', x: 3000, y: 3000, width: 100, height: 100 }),
      makeObj({ id: 'conn', type: 'connector', sourceId: 'src', targetId: 'tgt', stroke: '#000', strokeWidth: 2, style: 'arrow' } as unknown as Partial<BoardObject> & { id: string; type: 'connector' }),
    ];
    const result = getVisibleObjects(objects, bounds);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(getVisibleObjects([], bounds)).toHaveLength(0);
  });

  it('handles mix of all object types', () => {
    const objects: BoardObject[] = [
      makeObj({ id: 'sticky1', type: 'sticky', x: 100, y: 100, width: 200, height: 150, text: '', color: 'yellow' } as unknown as Partial<BoardObject> & { id: string; type: 'sticky' }),
      makeObj({ id: 'rect1', type: 'rectangle', x: 5000, y: 5000, width: 200, height: 150 }),
      makeObj({ id: 'frame1', type: 'frame', x: 50, y: 50, width: 400, height: 300, title: 'F', fill: '#eee', children: [] } as unknown as Partial<BoardObject> & { id: string; type: 'frame' }),
    ];
    const result = getVisibleObjects(objects, bounds);
    expect(result).toHaveLength(2);
    expect(result.map((o) => o.id).sort()).toEqual(['frame1', 'sticky1']);
  });

  it('filters 500 objects in under 5ms', () => {
    const objects: BoardObject[] = [];
    for (let i = 0; i < 500; i++) {
      objects.push(makeObj({
        id: `obj-${i}`,
        type: 'rectangle',
        x: i * 10,
        y: i * 10,
        width: 100,
        height: 100,
      }));
    }
    const start = performance.now();
    const result = getVisibleObjects(objects, bounds);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(500);
  });
});
