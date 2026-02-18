import React, { useRef } from 'react';
import { Circle, Line, Rect } from 'react-konva';
import type { BoundingBox, ResizeHandle } from '../domain/geometry.ts';
import { computeResize, computeRotation } from '../domain/geometry.ts';

interface TransformHandlesProps {
  bounds: BoundingBox;
  onResize: (newBounds: BoundingBox) => void;
  onResizeEnd: (newBounds: BoundingBox) => void;
  onRotate?: (rotation: number) => void;
  onRotateEnd?: (rotation: number) => void;
}

const HANDLE_SIZE = 8;
const ROTATION_HANDLE_OFFSET = 25;
const ROTATION_HANDLE_RADIUS = 5;

const HANDLES: {
  key: ResizeHandle;
  getX: (b: BoundingBox) => number;
  getY: (b: BoundingBox) => number;
}[] = [
  { key: 'nw', getX: (b) => b.x, getY: (b) => b.y },
  { key: 'n', getX: (b) => b.x + b.width / 2, getY: (b) => b.y },
  { key: 'ne', getX: (b) => b.x + b.width, getY: (b) => b.y },
  { key: 'e', getX: (b) => b.x + b.width, getY: (b) => b.y + b.height / 2 },
  { key: 'se', getX: (b) => b.x + b.width, getY: (b) => b.y + b.height },
  { key: 's', getX: (b) => b.x + b.width / 2, getY: (b) => b.y + b.height },
  { key: 'sw', getX: (b) => b.x, getY: (b) => b.y + b.height },
  { key: 'w', getX: (b) => b.x, getY: (b) => b.y + b.height / 2 },
];

export const TransformHandles = React.memo(function TransformHandles({
  bounds,
  onResize,
  onResizeEnd,
  onRotate,
  onRotateEnd,
}: TransformHandlesProps) {
  const originalBoundsRef = useRef<BoundingBox | null>(null);

  const centerX = bounds.x + bounds.width / 2;
  const rotateHandleY = bounds.y - ROTATION_HANDLE_OFFSET;

  return (
    <>
      {/* Selection bounding box */}
      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        stroke="#2196F3"
        strokeWidth={1}
        dash={[4, 4]}
        listening={false}
      />

      {/* Resize handles */}
      {HANDLES.map((h) => {
        const hx = h.getX(bounds);
        const hy = h.getY(bounds);
        return (
          <Rect
            key={h.key}
            x={hx - HANDLE_SIZE / 2}
            y={hy - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#fff"
            stroke="#2196F3"
            strokeWidth={1}
            draggable
            onDragStart={() => {
              originalBoundsRef.current = bounds;
            }}
            onDragMove={(e) => {
              const node = e.target;
              const dx = node.x() - (hx - HANDLE_SIZE / 2);
              const dy = node.y() - (hy - HANDLE_SIZE / 2);
              const newBounds = computeResize(
                h.key,
                dx,
                dy,
                originalBoundsRef.current!,
              );
              onResize(newBounds);
            }}
            onDragEnd={(e) => {
              const node = e.target;
              const dx = node.x() - (hx - HANDLE_SIZE / 2);
              const dy = node.y() - (hy - HANDLE_SIZE / 2);
              const newBounds = computeResize(
                h.key,
                dx,
                dy,
                originalBoundsRef.current!,
              );
              node.x(hx - HANDLE_SIZE / 2);
              node.y(hy - HANDLE_SIZE / 2);
              onResizeEnd(newBounds);
            }}
          />
        );
      })}

      {/* Rotation connector line */}
      <Line
        points={[centerX, bounds.y, centerX, rotateHandleY]}
        stroke="#2196F3"
        strokeWidth={1}
        listening={false}
      />

      {/* Rotation handle (circle above top-center) */}
      <Circle
        x={centerX}
        y={rotateHandleY}
        radius={ROTATION_HANDLE_RADIUS}
        fill="#fff"
        stroke="#2196F3"
        strokeWidth={1}
        draggable
        onDragMove={(e) => {
          if (!onRotate) return;
          const node = e.target;
          const center = { x: centerX, y: bounds.y + bounds.height / 2 };
          const mousePos = { x: node.x(), y: node.y() };
          const rotation = computeRotation(center, mousePos);
          onRotate(rotation);
        }}
        onDragEnd={(e) => {
          const node = e.target;
          const center = { x: centerX, y: bounds.y + bounds.height / 2 };
          const mousePos = { x: node.x(), y: node.y() };
          const rotation = computeRotation(center, mousePos);
          // Reset handle to original position
          node.x(centerX);
          node.y(rotateHandleY);
          if (onRotateEnd) onRotateEnd(rotation);
        }}
      />
    </>
  );
});
