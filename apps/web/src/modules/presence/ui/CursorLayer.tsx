import React from 'react';
import { Group, Line, Rect, Text, Layer } from 'react-konva';
import { useCursors } from './useCursors.ts';

const CURSOR_SIZE = 16;
const LABEL_OFFSET_X = 12;
const LABEL_OFFSET_Y = 16;
const LABEL_PADDING = 4;
const LABEL_FONT_SIZE = 11;

function RemoteCursor({
  x,
  y,
  color,
  displayName,
}: {
  x: number;
  y: number;
  color: string;
  displayName: string;
}) {
  // Triangle pointing top-left (classic cursor arrow)
  const points = [0, 0, 0, CURSOR_SIZE, CURSOR_SIZE * 0.7, CURSOR_SIZE * 0.7];

  const labelWidth = Math.max(displayName.length * 7, 30);

  return (
    <Group x={x} y={y} listening={false}>
      <Line points={points} fill={color} closed stroke={color} strokeWidth={1} />
      <Rect
        x={LABEL_OFFSET_X}
        y={LABEL_OFFSET_Y}
        width={labelWidth + LABEL_PADDING * 2}
        height={LABEL_FONT_SIZE + LABEL_PADDING * 2}
        fill={color}
        cornerRadius={3}
      />
      <Text
        x={LABEL_OFFSET_X + LABEL_PADDING}
        y={LABEL_OFFSET_Y + LABEL_PADDING}
        text={displayName}
        fontSize={LABEL_FONT_SIZE}
        fontFamily="sans-serif"
        fill="#fff"
      />
    </Group>
  );
}

const MemoizedCursor = React.memo(RemoteCursor);

export function CursorLayer() {
  const cursors = useCursors();

  return (
    <Layer listening={false}>
      {cursors.map((cursor) => (
        <MemoizedCursor
          key={cursor.uid}
          x={cursor.x}
          y={cursor.y}
          color={cursor.color}
          displayName={cursor.displayName}
        />
      ))}
    </Layer>
  );
}
