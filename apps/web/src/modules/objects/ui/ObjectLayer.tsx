import { Layer } from 'react-konva';
import { useObjects } from './useObjects.ts';
import { StickyNoteShape } from './StickyNoteShape.tsx';
import { RectangleShape } from './RectangleShape.tsx';
import { CircleShape } from './CircleShape.tsx';
import { LineShape } from './LineShape.tsx';
import { TextShape } from './TextShape.tsx';
import type { Camera } from '../../viewport/contracts.ts';

interface ObjectLayerProps {
  camera: Camera;
}

export function ObjectLayer({ camera: _camera }: ObjectLayerProps) {
  const { objects, selectedIds, moveObject, selectObject } = useObjects();

  return (
    <Layer>
      {objects.map((obj) => {
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
