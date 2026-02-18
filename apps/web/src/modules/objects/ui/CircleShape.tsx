import React from 'react';
import { Circle, Group, Rect } from 'react-konva';
import type Konva from 'konva';
import type { CircleObject } from '../contracts.ts';

interface CircleShapeProps {
  obj: CircleObject;
  isSelected: boolean;
  onSelect: () => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
}

export const CircleShape = React.memo(function CircleShape({
  obj,
  isSelected,
  onSelect,
  onDragMove,
  onDragEnd,
}: CircleShapeProps) {
  const radius = Math.min(obj.width, obj.height) / 2;

  function handleDragMove(e: Konva.KonvaEventObject<DragEvent>) {
    if (onDragMove) {
      const node = e.target;
      onDragMove(node.x(), node.y());
    }
  }

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    onDragEnd(node.x(), node.y());
  }

  return (
    <Group
      x={obj.x}
      y={obj.y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <Circle
        x={obj.width / 2}
        y={obj.height / 2}
        radius={radius}
        fill={obj.fill}
        stroke={obj.stroke}
        strokeWidth={obj.strokeWidth}
      />

      {/* Selection border */}
      {isSelected && (
        <Rect
          width={obj.width}
          height={obj.height}
          stroke="#2196F3"
          strokeWidth={2}
          dash={[6, 3]}
          listening={false}
        />
      )}
    </Group>
  );
});
