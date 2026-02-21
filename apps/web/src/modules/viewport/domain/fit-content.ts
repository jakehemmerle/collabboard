import type { Camera } from '../contracts.ts';

export function computeFitCamera(
  objects: Array<{x: number, y: number, width: number, height: number}>,
  viewportWidth: number,
  viewportHeight: number,
  padding = 80,
): Camera {
  if (objects.length === 0) return { x: 0, y: 0, scale: 1 };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const obj of objects) {
    minX = Math.min(minX, obj.x);
    minY = Math.min(minY, obj.y);
    maxX = Math.max(maxX, obj.x + obj.width);
    maxY = Math.max(maxY, obj.y + obj.height);
  }

  const bbWidth = maxX - minX;
  const bbHeight = maxY - minY;
  const bbCenterX = minX + bbWidth / 2;
  const bbCenterY = minY + bbHeight / 2;

  const scale = Math.min(
    Math.max(
      Math.min(
        viewportWidth / (bbWidth + padding * 2),
        viewportHeight / (bbHeight + padding * 2),
      ),
      0.1,
    ),
    2,
  );

  return {
    x: viewportWidth / 2 - bbCenterX * scale,
    y: viewportHeight / 2 - bbCenterY * scale,
    scale,
  };
}
