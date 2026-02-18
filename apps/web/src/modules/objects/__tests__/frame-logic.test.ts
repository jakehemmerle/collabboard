import { describe, it, expect } from 'vitest';
import { findObjectsInBounds, computeFrameAutoSize } from '../domain/frame-logic.ts';
import type { BoardObject } from '../contracts.ts';

function makeObj(
  x: number,
  y: number,
  w: number,
  h: number,
  type: string = 'rectangle',
): BoardObject {
  return {
    id: `obj-${x}-${y}`,
    type,
    x,
    y,
    width: w,
    height: h,
    fill: '',
    stroke: '',
    strokeWidth: 1,
    createdBy: 'test',
    createdAt: 0,
    updatedAt: 0,
  } as BoardObject;
}

describe('findObjectsInBounds', () => {
  it('finds objects whose center is inside bounds', () => {
    const objects = [
      makeObj(50, 50, 20, 20),  // center (60, 60) — inside
      makeObj(90, 90, 20, 20),  // center (100, 100) — inside
    ];
    const bounds = { x: 0, y: 0, width: 200, height: 200 };

    const result = findObjectsInBounds(objects, bounds);
    expect(result).toHaveLength(2);
  });

  it('excludes objects whose center is outside bounds', () => {
    const inside = makeObj(10, 10, 20, 20);    // center (20, 20)
    const outside = makeObj(500, 500, 20, 20);  // center (510, 510)
    const bounds = { x: 0, y: 0, width: 100, height: 100 };

    const result = findObjectsInBounds([inside, outside], bounds);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(inside);
  });

  it('excludes objects of type frame and connector', () => {
    const rect = makeObj(10, 10, 20, 20, 'rectangle');
    const frame = makeObj(10, 10, 20, 20, 'frame');
    const connector = makeObj(10, 10, 20, 20, 'connector');
    const bounds = { x: 0, y: 0, width: 200, height: 200 };

    const result = findObjectsInBounds([rect, frame, connector], bounds);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(rect);
  });

  it('returns empty array for empty objects array', () => {
    const bounds = { x: 0, y: 0, width: 200, height: 200 };
    const result = findObjectsInBounds([], bounds);
    expect(result).toHaveLength(0);
  });
});

describe('computeFrameAutoSize', () => {
  it('returns null for empty array', () => {
    const result = computeFrameAutoSize([]);
    expect(result).toBeNull();
  });

  it('single object returns padded bounds (default padding=40, extra 30 for title)', () => {
    const obj = makeObj(100, 100, 50, 50);
    const result = computeFrameAutoSize([obj]);

    expect(result).not.toBeNull();
    // x: 100 - 40 = 60
    expect(result!.x).toBe(60);
    // y: 100 - 40 - 30 = 30  (extra 30 for title)
    expect(result!.y).toBe(30);
    // width: (150 - 100) + 80 = 130  (50 + 2*40)
    expect(result!.width).toBe(130);
    // height: (150 - 100) + 80 + 30 = 160  (50 + 2*40 + 30)
    expect(result!.height).toBe(160);
  });

  it('multiple objects returns combined padded bounds', () => {
    const obj1 = makeObj(100, 100, 50, 50);   // extends to (150, 150)
    const obj2 = makeObj(200, 200, 60, 60);   // extends to (260, 260)
    const result = computeFrameAutoSize([obj1, obj2]);

    expect(result).not.toBeNull();
    // minX=100, minY=100, maxX=260, maxY=260
    expect(result!.x).toBe(60);   // 100 - 40
    expect(result!.y).toBe(30);   // 100 - 40 - 30
    expect(result!.width).toBe(240);  // (260 - 100) + 80
    expect(result!.height).toBe(270); // (260 - 100) + 80 + 30
  });

  it('custom padding', () => {
    const obj = makeObj(50, 50, 100, 100);
    const result = computeFrameAutoSize([obj], 20);

    expect(result).not.toBeNull();
    // x: 50 - 20 = 30
    expect(result!.x).toBe(30);
    // y: 50 - 20 - 30 = 0
    expect(result!.y).toBe(0);
    // width: (150 - 50) + 40 = 140
    expect(result!.width).toBe(140);
    // height: (150 - 50) + 40 + 30 = 170
    expect(result!.height).toBe(170);
  });
});
