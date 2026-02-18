import React from 'react';
import { Group, Rect } from 'react-konva';
import type Konva from 'konva';
import type { RectangleObject } from '../contracts.ts';

interface RectangleShapeProps {
  obj: RectangleObject;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
}

export const RectangleShape = React.memo(function RectangleShape({
  obj,
  isSelected,
  onSelect,
  onDragMove,
  onDragEnd,
}: RectangleShapeProps) {
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
      <Rect
        width={obj.width}
        height={obj.height}
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
