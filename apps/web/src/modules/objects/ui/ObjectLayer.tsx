import { Layer } from 'react-konva';
import { useObjects } from './useObjects.ts';
import { StickyNoteShape } from './StickyNoteShape.tsx';
import { RectangleShape } from './RectangleShape.tsx';
import type { Camera } from '../../viewport/contracts.ts';

interface ObjectLayerProps {
  camera: Camera;
}

export function ObjectLayer({ camera: _camera }: ObjectLayerProps) {
  const { objects, selectedId, moveObject, selectObject } = useObjects();

  return (
    <Layer>
      {objects.map((obj) => {
        if (obj.type === 'sticky') {
          return (
            <StickyNoteShape
              key={obj.id}
              obj={obj}
              isSelected={obj.id === selectedId}
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
              isSelected={obj.id === selectedId}
              onSelect={() => selectObject(obj.id)}
              onDragEnd={(x, y) => moveObject(obj.id, x, y)}
            />
          );
        }

        return null;
      })}
    </Layer>
  );
}
