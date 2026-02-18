import { describe, it, expect } from 'vitest';
import { computeConnectorEndpoints } from '../domain/connector-routing.ts';
import type { BoardObject } from '../contracts.ts';

function makeObj(x: number, y: number, w: number, h: number): BoardObject {
  return {
    id: 'test',
    type: 'rectangle',
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

describe('computeConnectorEndpoints', () => {
  it('horizontal: source left, target right — start on right edge, end on left edge', () => {
    const source = makeObj(0, 0, 100, 100);   // center (50, 50)
    const target = makeObj(300, 0, 100, 100);  // center (350, 50)

    const { start, end } = computeConnectorEndpoints(source, target);

    // Start should be on source's right edge (x=100)
    expect(start.x).toBeCloseTo(100);
    expect(start.y).toBeCloseTo(50);

    // End should be on target's left edge (x=300)
    expect(end.x).toBeCloseTo(300);
    expect(end.y).toBeCloseTo(50);
  });

  it('vertical: source top, target bottom — start on bottom edge, end on top edge', () => {
    const source = makeObj(0, 0, 100, 100);   // center (50, 50)
    const target = makeObj(0, 300, 100, 100);  // center (50, 350)

    const { start, end } = computeConnectorEndpoints(source, target);

    // Start should be on source's bottom edge (y=100)
    expect(start.x).toBeCloseTo(50);
    expect(start.y).toBeCloseTo(100);

    // End should be on target's top edge (y=300)
    expect(end.x).toBeCloseTo(50);
    expect(end.y).toBeCloseTo(300);
  });

  it('diagonal: endpoints land on appropriate edges', () => {
    const source = makeObj(0, 0, 100, 100);     // center (50, 50)
    const target = makeObj(200, 200, 100, 100);  // center (250, 250)

    const { start, end } = computeConnectorEndpoints(source, target);

    // Ray goes from (50,50) toward (250,250) — 45 degrees.
    // Should exit source at its right edge (x=100) and bottom edge (y=100) simultaneously.
    expect(start.x).toBeCloseTo(100);
    expect(start.y).toBeCloseTo(100);

    // End should be on target's left/top corner area (x=200, y=200)
    expect(end.x).toBeCloseTo(200);
    expect(end.y).toBeCloseTo(200);
  });

  it('overlapping objects — returns valid points', () => {
    const source = makeObj(0, 0, 200, 200);   // center (100, 100)
    const target = makeObj(50, 50, 200, 200);  // center (150, 150)

    const { start, end } = computeConnectorEndpoints(source, target);

    // Both points should be finite numbers (not NaN/Infinity)
    expect(Number.isFinite(start.x)).toBe(true);
    expect(Number.isFinite(start.y)).toBe(true);
    expect(Number.isFinite(end.x)).toBe(true);
    expect(Number.isFinite(end.y)).toBe(true);
  });

  it('same-position objects — does not crash, returns centers', () => {
    const source = makeObj(100, 100, 50, 50); // center (125, 125)
    const target = makeObj(100, 100, 50, 50); // center (125, 125)

    const { start, end } = computeConnectorEndpoints(source, target);

    // When centers are identical, dx=0 and dy=0, so the function returns centers
    expect(start.x).toBeCloseTo(125);
    expect(start.y).toBeCloseTo(125);
    expect(end.x).toBeCloseTo(125);
    expect(end.y).toBeCloseTo(125);
  });
});
