import React from 'react';
import { Rect } from 'react-konva';
import { getSelectionBoxBounds } from '../domain/geometry.ts';

interface SelectionBoxProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  visible: boolean;
}

export const SelectionBox = React.memo(function SelectionBox({
  startX,
  startY,
  endX,
  endY,
  visible,
}: SelectionBoxProps) {
  const { x, y, width, height } = getSelectionBoxBounds(startX, startY, endX, endY);

  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="rgba(33, 150, 243, 0.1)"
      stroke="#2196F3"
      strokeWidth={1}
      dash={[4, 4]}
      listening={false}
      visible={visible}
    />
  );
});
