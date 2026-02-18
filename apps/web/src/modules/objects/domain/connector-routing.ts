import type { BoardObject } from '../contracts.ts';

interface Point {
  x: number;
  y: number;
}

/**
 * Compute the intersection of a ray from `inside` toward `outside`
 * with the axis-aligned bounding box defined by (bx, by, bw, bh).
 * Returns the edge intersection point.
 */
function intersectRayWithRect(
  inside: Point,
  outside: Point,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): Point {
  const dx = outside.x - inside.x;
  const dy = outside.y - inside.y;

  if (dx === 0 && dy === 0) return { x: inside.x, y: inside.y };

  // Compute parametric t for each edge
  const tValues: number[] = [];

  if (dx !== 0) {
    // Left edge
    const tLeft = (bx - inside.x) / dx;
    const yAtLeft = inside.y + tLeft * dy;
    if (tLeft > 0 && yAtLeft >= by && yAtLeft <= by + bh) tValues.push(tLeft);

    // Right edge
    const tRight = (bx + bw - inside.x) / dx;
    const yAtRight = inside.y + tRight * dy;
    if (tRight > 0 && yAtRight >= by && yAtRight <= by + bh) tValues.push(tRight);
  }

  if (dy !== 0) {
    // Top edge
    const tTop = (by - inside.y) / dy;
    const xAtTop = inside.x + tTop * dx;
    if (tTop > 0 && xAtTop >= bx && xAtTop <= bx + bw) tValues.push(tTop);

    // Bottom edge
    const tBottom = (by + bh - inside.y) / dy;
    const xAtBottom = inside.x + tBottom * dx;
    if (tBottom > 0 && xAtBottom >= bx && xAtBottom <= bx + bw) tValues.push(tBottom);
  }

  if (tValues.length === 0) {
    return { x: inside.x, y: inside.y };
  }

  // Take smallest positive t (closest edge crossing)
  const t = Math.min(...tValues);
  return {
    x: inside.x + t * dx,
    y: inside.y + t * dy,
  };
}

/**
 * Compute the start and end points for a connector between two objects.
 * Returns center-to-center line intersected with each object's bounding box.
 */
export function computeConnectorEndpoints(
  source: BoardObject,
  target: BoardObject,
): { start: Point; end: Point } {
  const sourceCenter: Point = {
    x: source.x + source.width / 2,
    y: source.y + source.height / 2,
  };
  const targetCenter: Point = {
    x: target.x + target.width / 2,
    y: target.y + target.height / 2,
  };

  const start = intersectRayWithRect(
    sourceCenter,
    targetCenter,
    source.x,
    source.y,
    source.width,
    source.height,
  );

  const end = intersectRayWithRect(
    targetCenter,
    sourceCenter,
    target.x,
    target.y,
    target.width,
    target.height,
  );

  return { start, end };
}
