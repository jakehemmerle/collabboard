import { describe, it, expect } from 'vitest';
import { getBoundingBox, computeResize, computeRotation } from '../domain/geometry.ts';
import type { BoardObject } from '../contracts.ts';

function makeObj(
  overrides: Partial<BoardObject> & { x: number; y: number; width: number; height: number },
): BoardObject {
  return {
    id: 'test-' + Math.random().toString(36).slice(2),
    type: 'rectangle',
    fill: '#ccc',
    stroke: '#999',
    strokeWidth: 1,
    createdBy: 'test',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  } as BoardObject;
}

describe('getBoundingBox', () => {
  it('returns null for empty array', () => {
    expect(getBoundingBox([])).toBeNull();
  });

  it('returns the object own bounds for a single object', () => {
    const obj = makeObj({ x: 10, y: 20, width: 100, height: 50 });
    expect(getBoundingBox([obj])).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    });
  });

  it('computes correct bounds for multiple objects', () => {
    const a = makeObj({ x: 10, y: 20, width: 100, height: 50 });
    const b = makeObj({ x: 50, y: 10, width: 200, height: 300 });
    // union: minX=10, minY=10, maxX=250, maxY=310
    expect(getBoundingBox([a, b])).toEqual({
      x: 10,
      y: 10,
      width: 240,
      height: 300,
    });
  });

  it('works with objects at negative coordinates', () => {
    const a = makeObj({ x: -50, y: -30, width: 40, height: 20 });
    const b = makeObj({ x: 10, y: 5, width: 60, height: 25 });
    // union: minX=-50, minY=-30, maxX=70, maxY=30
    expect(getBoundingBox([a, b])).toEqual({
      x: -50,
      y: -30,
      width: 120,
      height: 60,
    });
  });
});

describe('computeResize', () => {
  const original = { x: 100, y: 100, width: 200, height: 200 };

  describe('handle: nw', () => {
    it('moves x/y inward and shrinks width/height when dragged toward center', () => {
      const result = computeResize('nw', 50, 50, original);
      expect(result).toEqual({ x: 150, y: 150, width: 150, height: 150 });
    });

    it('moves x/y outward and grows width/height when dragged away from center', () => {
      const result = computeResize('nw', -50, -50, original);
      expect(result).toEqual({ x: 50, y: 50, width: 250, height: 250 });
    });
  });

  describe('handle: n', () => {
    it('only changes y and height', () => {
      const result = computeResize('n', 0, 50, original);
      expect(result).toEqual({ x: 100, y: 150, width: 200, height: 150 });
    });

    it('ignores dx', () => {
      const result = computeResize('n', 999, 50, original);
      expect(result).toEqual({ x: 100, y: 150, width: 200, height: 150 });
    });
  });

  describe('handle: ne', () => {
    it('moves y inward, grows width, and shrinks height', () => {
      const result = computeResize('ne', 50, 50, original);
      expect(result).toEqual({ x: 100, y: 150, width: 250, height: 150 });
    });
  });

  describe('handle: e', () => {
    it('only changes width', () => {
      const result = computeResize('e', 50, 0, original);
      expect(result).toEqual({ x: 100, y: 100, width: 250, height: 200 });
    });

    it('ignores dy', () => {
      const result = computeResize('e', 50, 999, original);
      expect(result).toEqual({ x: 100, y: 100, width: 250, height: 200 });
    });
  });

  describe('handle: se', () => {
    it('grows width and height, x/y unchanged', () => {
      const result = computeResize('se', 50, 50, original);
      expect(result).toEqual({ x: 100, y: 100, width: 250, height: 250 });
    });
  });

  describe('handle: s', () => {
    it('only changes height', () => {
      const result = computeResize('s', 0, 50, original);
      expect(result).toEqual({ x: 100, y: 100, width: 200, height: 250 });
    });

    it('ignores dx', () => {
      const result = computeResize('s', 999, 50, original);
      expect(result).toEqual({ x: 100, y: 100, width: 200, height: 250 });
    });
  });

  describe('handle: sw', () => {
    it('moves x inward, shrinks width, grows height', () => {
      const result = computeResize('sw', 50, 50, original);
      expect(result).toEqual({ x: 150, y: 100, width: 150, height: 250 });
    });
  });

  describe('handle: w', () => {
    it('only changes x and width', () => {
      const result = computeResize('w', 50, 0, original);
      expect(result).toEqual({ x: 150, y: 100, width: 150, height: 200 });
    });

    it('ignores dy', () => {
      const result = computeResize('w', 50, 999, original);
      expect(result).toEqual({ x: 150, y: 100, width: 150, height: 200 });
    });
  });

  describe('min size enforcement', () => {
    it('clamps width to 20 when nw drag would make it too small', () => {
      // dx=190 would give width = 200 - 190 = 10, which is < 20
      const result = computeResize('nw', 190, 0, original);
      expect(result.width).toBe(20);
      // x should be pinned so right edge stays at original.x + original.width - MIN_SIZE
      expect(result.x).toBe(100 + 200 - 20);
    });

    it('clamps height to 20 when nw drag would make it too small', () => {
      const result = computeResize('nw', 0, 190, original);
      expect(result.height).toBe(20);
      expect(result.y).toBe(100 + 200 - 20);
    });

    it('clamps width to 20 when w drag would make it too small', () => {
      const result = computeResize('w', 190, 0, original);
      expect(result.width).toBe(20);
      expect(result.x).toBe(100 + 200 - 20);
    });

    it('clamps height to 20 when n drag would make it too small', () => {
      const result = computeResize('n', 0, 190, original);
      expect(result.height).toBe(20);
      expect(result.y).toBe(100 + 200 - 20);
    });

    it('clamps width to 20 for e handle with large negative dx', () => {
      const result = computeResize('e', -190, 0, original);
      expect(result.width).toBe(20);
      // e handle does not move x
      expect(result.x).toBe(100);
    });

    it('clamps height to 20 for s handle with large negative dy', () => {
      const result = computeResize('s', 0, -190, original);
      expect(result.height).toBe(20);
      expect(result.y).toBe(100);
    });

    it('clamps both width and height for se handle', () => {
      const result = computeResize('se', -190, -190, original);
      expect(result.width).toBe(20);
      expect(result.height).toBe(20);
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });

    it('clamps both width and height for nw handle', () => {
      const result = computeResize('nw', 190, 190, original);
      expect(result.width).toBe(20);
      expect(result.height).toBe(20);
      expect(result.x).toBe(280);
      expect(result.y).toBe(280);
    });
  });
});

describe('computeRotation', () => {
  const center = { x: 100, y: 100 };

  it('returns 0 degrees when mouse is directly above center', () => {
    // Above center: mousePos.x = center.x, mousePos.y < center.y
    const angle = computeRotation(center, { x: 100, y: 50 });
    expect(angle).toBeCloseTo(0, 5);
  });

  it('returns 90 degrees when mouse is to the right of center', () => {
    const angle = computeRotation(center, { x: 150, y: 100 });
    expect(angle).toBeCloseTo(90, 5);
  });

  it('returns 180 degrees when mouse is directly below center', () => {
    const angle = computeRotation(center, { x: 100, y: 150 });
    expect(angle).toBeCloseTo(180, 5);
  });

  it('returns -90 (equivalently 270) degrees when mouse is to the left of center', () => {
    const angle = computeRotation(center, { x: 50, y: 100 });
    // atan2(0, -50) = pi, so (pi * 180 / pi) + 90 = 270
    expect(angle).toBeCloseTo(270, 5);
  });
});
