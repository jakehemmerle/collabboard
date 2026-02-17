import { useParams } from 'react-router';
import { Stage, Layer, Rect, Text } from 'react-konva';
import { useEffect, useState } from 'react';

export function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Stage width={dimensions.width} height={dimensions.height}>
        <Layer>
          <Rect x={20} y={20} width={200} height={100} fill="#f0f0f0" stroke="#ccc" strokeWidth={1} cornerRadius={4} />
          <Text x={30} y={50} text={`Board: ${id}`} fontSize={16} fill="#333" />
        </Layer>
      </Stage>
    </div>
  );
}
