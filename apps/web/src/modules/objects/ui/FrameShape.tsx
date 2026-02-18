import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { FrameObject } from '../contracts.ts';

interface FrameShapeProps {
  obj: FrameObject;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onDblClick?: () => void;
}

export const FrameShape = React.memo(function FrameShape({
  obj,
  isSelected,
  onSelect,
  onDragMove,
  onDragEnd,
  onDblClick,
}: FrameShapeProps) {
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
      rotation={obj.rotation ?? 0}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <Rect
        width={obj.width}
        height={obj.height}
        fill={obj.fill}
        stroke="#BDBDBD"
        strokeWidth={1}
        dash={[8, 4]}
        cornerRadius={4}
      />

      <Text
        x={8}
        y={8}
        text={obj.title}
        fontSize={14}
        fontFamily="sans-serif"
        fill="#757575"
        listening={false}
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
