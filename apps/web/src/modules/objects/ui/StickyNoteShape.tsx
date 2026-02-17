import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { StickyNote } from '../contracts.ts';
import { STICKY_COLORS } from '../contracts.ts';

interface StickyNoteShapeProps {
  obj: StickyNote;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  onDblClick: () => void;
}

export const StickyNoteShape = React.memo(function StickyNoteShape({
  obj,
  isSelected,
  onSelect,
  onDragEnd,
  onDblClick,
}: StickyNoteShapeProps) {
  const fill = STICKY_COLORS[obj.color] ?? STICKY_COLORS.yellow;

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
      onDragEnd={handleDragEnd}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
    >
      {/* Shadow rect */}
      <Rect
        width={obj.width}
        height={obj.height}
        fill={fill}
        cornerRadius={8}
        shadowColor="#000"
        shadowBlur={8}
        shadowOffsetX={2}
        shadowOffsetY={2}
        shadowOpacity={0.15}
      />

      {/* Selection border */}
      {isSelected && (
        <Rect
          width={obj.width}
          height={obj.height}
          stroke="#2196F3"
          strokeWidth={2}
          dash={[6, 3]}
          cornerRadius={8}
          listening={false}
        />
      )}

      {/* Text content */}
      <Text
        x={12}
        y={12}
        width={obj.width - 24}
        height={obj.height - 24}
        text={obj.text}
        fontSize={14}
        fontFamily="sans-serif"
        fill="#333"
        wrap="word"
        listening={false}
      />
    </Group>
  );
});
