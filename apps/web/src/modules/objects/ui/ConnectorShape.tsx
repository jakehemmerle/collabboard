import React from 'react';
import { Group, Arrow, Line } from 'react-konva';
import type Konva from 'konva';
import type { ConnectorObject, BoardObject } from '../contracts.ts';
import { computeConnectorEndpoints } from '../domain/connector-routing.ts';

interface ConnectorShapeProps {
  obj: ConnectorObject;
  source?: BoardObject;
  target?: BoardObject;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
}

export const ConnectorShape = React.memo(function ConnectorShape({
  obj,
  source,
  target,
  isSelected,
  onSelect,
}: ConnectorShapeProps) {

  // Both endpoints missing — render nothing
  if (!source && !target) {
    return null;
  }

  let points: number[];

  if (source && target) {
    // Both endpoints exist — use proper routing
    const { start, end } = computeConnectorEndpoints(source, target);
    points = [start.x, start.y, end.x, end.y];
  } else {
    // One endpoint is missing (deleted) — draw a faded partial line
    const existing = (source ?? target)!;
    const centerX = existing.x + existing.width / 2;
    const centerY = existing.y + existing.height / 2;
    // Use the connector's stored position as a fallback for the missing end
    const fallbackX = obj.x + obj.width / 2;
    const fallbackY = obj.y + obj.height / 2;

    if (source) {
      points = [centerX, centerY, fallbackX, fallbackY];
    } else {
      points = [fallbackX, fallbackY, centerX, centerY];
    }

    const ShapeComponent = obj.style === 'arrow' ? Arrow : Line;

    return (
      <Group onClick={onSelect} onTap={onSelect}>
        {isSelected && (
          <Line
            points={points}
            stroke="#2196F3"
            strokeWidth={obj.strokeWidth + 4}
            dash={[6, 3]}
            opacity={0.4}
            listening={false}
          />
        )}
        <ShapeComponent
          points={points}
          stroke={obj.stroke}
          strokeWidth={obj.strokeWidth}
          opacity={0.3}
          {...(obj.style === 'arrow' ? { pointerLength: 10, pointerWidth: 10 } : {})}
        />
        <Line
          points={points}
          stroke="transparent"
          strokeWidth={20}
          hitStrokeWidth={20}
        />
      </Group>
    );
  }

  const ShapeComponent = obj.style === 'arrow' ? Arrow : Line;

  return (
    <Group onClick={onSelect} onTap={onSelect}>
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

      {/* Visible connector */}
      <ShapeComponent
        points={points}
        stroke={obj.stroke}
        strokeWidth={obj.strokeWidth}
        {...(obj.style === 'arrow' ? { pointerLength: 10, pointerWidth: 10 } : {})}
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
