import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { TextObject } from '../contracts.ts';

interface TextShapeProps {
  obj: TextObject;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onDblClick: () => void;
}

export const TextShape = React.memo(function TextShape({
  obj,
  isSelected,
  onSelect,
  onDragMove,
  onDragEnd,
  onDblClick,
}: TextShapeProps) {
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
      onDblClick={onDblClick}
      onDblTap={onDblClick}
    >
      <Text
        text={obj.text}
        fontSize={obj.fontSize}
        fontFamily={obj.fontFamily}
        fill={obj.fill}
        width={obj.width}
        wrap="word"
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
