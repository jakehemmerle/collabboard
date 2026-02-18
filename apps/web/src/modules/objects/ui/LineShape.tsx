import React from 'react';
import { Group, Line } from 'react-konva';
import type Konva from 'konva';
import type { LineObject } from '../contracts.ts';

interface LineShapeProps {
  obj: LineObject;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
}

export const LineShape = React.memo(function LineShape({
  obj,
  isSelected,
  onSelect,
  onDragMove,
  onDragEnd,
}: LineShapeProps) {
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

  const points = [0, 0, obj.x2 - obj.x, obj.y2 - obj.y];

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
      {/* Selection highlight */}
      {isSelected && (
        <Line
          points={points}
          stroke="#2196F3"
          strokeWidth={obj.strokeWidth + 4}
          dash={[6, 3]}
          listening={false}
        />
      )}

      {/* Visible line */}
      <Line
        points={points}
        stroke={obj.stroke}
        strokeWidth={obj.strokeWidth}
      />

      {/* Invisible hit area for easier clicking */}
      <Line
        points={points}
        stroke="transparent"
        strokeWidth={20}
        hitStrokeWidth={20}
      />
    </Group>
  );
});
