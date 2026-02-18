import { Layer } from 'react-konva';
import { useObjects } from './useObjects.ts';
import { StickyNoteShape } from './StickyNoteShape.tsx';
import { RectangleShape } from './RectangleShape.tsx';
import { CircleShape } from './CircleShape.tsx';
import { LineShape } from './LineShape.tsx';
import { TextShape } from './TextShape.tsx';
import { ConnectorShape } from './ConnectorShape.tsx';
import { FrameShape } from './FrameShape.tsx';
import type { Camera } from '../../viewport/contracts.ts';

interface ObjectLayerProps {
  camera: Camera;
}

export function ObjectLayer({ camera: _camera }: ObjectLayerProps) {
  const { objects, selectedIds, moveObject, selectObject } = useObjects();

  // Separate frames and connectors for z-order: frames behind, connectors behind regular objects
  const frames = objects.filter((o) => o.type === 'frame');
  const connectors = objects.filter((o) => o.type === 'connector');
  const regularObjects = objects.filter((o) => o.type !== 'frame' && o.type !== 'connector');

  return (
    <Layer>
      {/* Frames render first (behind everything) */}
      {frames.map((obj) => {
        if (obj.type !== 'frame') return null;
        return (
          <FrameShape
            key={obj.id}
            obj={obj}
            isSelected={selectedIds.includes(obj.id)}
            onSelect={() => selectObject(obj.id)}
            onDragEnd={(x, y) => moveObject(obj.id, x, y)}
          />
        );
      })}

      {/* Connectors render below regular objects */}
      {connectors.map((obj) => {
        if (obj.type !== 'connector') return null;
        return (
          <ConnectorShape
            key={obj.id}
            obj={obj}
            source={objects.find((o) => o.id === obj.sourceId)}
            target={objects.find((o) => o.id === obj.targetId)}
            isSelected={selectedIds.includes(obj.id)}
            onSelect={() => selectObject(obj.id)}
          />
        );
      })}

      {/* Regular objects on top */}
      {regularObjects.map((obj) => {
        if (obj.type === 'sticky') {
          return (
            <StickyNoteShape
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={() => selectObject(obj.id)}
              onDragEnd={(x, y) => moveObject(obj.id, x, y)}
              onDblClick={() => {}}
            />
          );
        }

        if (obj.type === 'rectangle') {
          return (
            <RectangleShape
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={() => selectObject(obj.id)}
              onDragEnd={(x, y) => moveObject(obj.id, x, y)}
            />
          );
        }

        if (obj.type === 'circle') {
          return (
            <CircleShape
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={() => selectObject(obj.id)}
              onDragEnd={(x, y) => moveObject(obj.id, x, y)}
            />
          );
        }

        if (obj.type === 'line') {
          return (
            <LineShape
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={() => selectObject(obj.id)}
              onDragEnd={(x, y) => moveObject(obj.id, x, y)}
            />
          );
        }

        if (obj.type === 'text') {
          return (
            <TextShape
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={() => selectObject(obj.id)}
              onDragEnd={(x, y) => moveObject(obj.id, x, y)}
              onDblClick={() => {}}
            />
          );
        }

        return null;
      })}
    </Layer>
  );
}
