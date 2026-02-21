import { Group, Line } from 'react-konva';
import type { SnapGuide } from '../domain/snap-guides.ts';

interface SnapGuidesProps {
  guides: SnapGuide[];
}

export function SnapGuides({ guides }: SnapGuidesProps) {
  if (guides.length === 0) return null;

  return (
    <Group listening={false}>
      {guides.map((guide, i) => {
        if (guide.type === 'vertical') {
          return (
            <Line
              key={`v-${i}`}
              points={[guide.position, guide.from, guide.position, guide.to]}
              stroke="#FF4081"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          );
        }
        return (
          <Line
            key={`h-${i}`}
            points={[guide.from, guide.position, guide.to, guide.position]}
            stroke="#FF4081"
            strokeWidth={1}
            dash={[4, 4]}
            listening={false}
          />
        );
      })}
    </Group>
  );
}
