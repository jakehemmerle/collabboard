import React, { useMemo } from 'react';
import { Layer, Circle } from 'react-konva';
import type { Camera } from '../contracts.ts';
import { GRID_STEP } from '../contracts.ts';

interface BackgroundGridProps {
  camera: Camera;
  width: number;
  height: number;
}

export const BackgroundGrid = React.memo(function BackgroundGrid({
  camera,
  width,
  height,
}: BackgroundGridProps) {
  const dots = useMemo(() => {
    // Adaptive spacing: double at low zoom, quadruple at very low zoom
    let step = GRID_STEP;
    if (camera.scale < 0.25) {
      step = GRID_STEP * 4;
    } else if (camera.scale < 0.5) {
      step = GRID_STEP * 2;
    }

    // Compute visible world-space rectangle
    const worldLeft = (0 - camera.x) / camera.scale;
    const worldTop = (0 - camera.y) / camera.scale;
    const worldRight = (width - camera.x) / camera.scale;
    const worldBottom = (height - camera.y) / camera.scale;

    // Snap to step boundaries
    const startX = Math.floor(worldLeft / step) * step;
    const startY = Math.floor(worldTop / step) * step;

    const radius = 1.5 / camera.scale;
    const result: React.ReactNode[] = [];

    for (let x = startX; x <= worldRight; x += step) {
      for (let y = startY; y <= worldBottom; y += step) {
        result.push(
          <Circle
            key={`${x},${y}`}
            x={x}
            y={y}
            radius={radius}
            fill="#ccc"
            listening={false}
            perfectDrawEnabled={false}
          />,
        );
      }
    }

    return result;
  }, [camera.x, camera.y, camera.scale, width, height]);

  return <Layer listening={false}>{dots}</Layer>;
});
