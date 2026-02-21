import { useState, useMemo, useCallback } from 'react';
import type { BoardObject } from '../../objects/contracts.ts';
import { STICKY_COLORS } from '../../objects/contracts.ts';
import type { Camera } from '../contracts.ts';

interface MinimapProps {
  objects: BoardObject[];
  camera: Camera;
  viewportWidth: number;
  viewportHeight: number;
  onNavigate: (worldX: number, worldY: number) => void;
}

const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 120;
const PADDING = 50;

export function Minimap({ objects, camera, viewportWidth, viewportHeight, onNavigate }: MinimapProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Compute world bounding box from non-connector objects
  const worldBounds = useMemo(() => {
    const nonConnectors = objects.filter((o) => o.type !== 'connector');
    if (nonConnectors.length === 0) {
      return { minX: -500, minY: -500, maxX: 500, maxY: 500 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const obj of nonConnectors) {
      minX = Math.min(minX, obj.x);
      minY = Math.min(minY, obj.y);
      maxX = Math.max(maxX, obj.x + obj.width);
      maxY = Math.max(maxY, obj.y + obj.height);
    }
    // Include the current viewport in bounds so it's always visible
    const vpX = -camera.x / camera.scale;
    const vpY = -camera.y / camera.scale;
    const vpW = viewportWidth / camera.scale;
    const vpH = viewportHeight / camera.scale;
    minX = Math.min(minX, vpX);
    minY = Math.min(minY, vpY);
    maxX = Math.max(maxX, vpX + vpW);
    maxY = Math.max(maxY, vpY + vpH);

    return {
      minX: minX - PADDING,
      minY: minY - PADDING,
      maxX: maxX + PADDING,
      maxY: maxY + PADDING,
    };
  }, [objects, camera, viewportWidth, viewportHeight]);

  const worldWidth = worldBounds.maxX - worldBounds.minX;
  const worldHeight = worldBounds.maxY - worldBounds.minY;
  const minimapScale = Math.min(MINIMAP_WIDTH / worldWidth, MINIMAP_HEIGHT / worldHeight);

  const worldToMinimap = useCallback(
    (wx: number, wy: number) => ({
      mx: (wx - worldBounds.minX) * minimapScale,
      my: (wy - worldBounds.minY) * minimapScale,
    }),
    [worldBounds, minimapScale],
  );

  // Viewport indicator in world coords
  const vpWorldX = -camera.x / camera.scale;
  const vpWorldY = -camera.y / camera.scale;
  const vpWorldW = viewportWidth / camera.scale;
  const vpWorldH = viewportHeight / camera.scale;
  const vpMinimap = worldToMinimap(vpWorldX, vpWorldY);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // Convert minimap coords to world coords (center viewport on click point)
      const worldX = mx / minimapScale + worldBounds.minX;
      const worldY = my / minimapScale + worldBounds.minY;
      onNavigate(worldX, worldY);
    },
    [minimapScale, worldBounds, onNavigate],
  );

  if (collapsed) {
    return (
      <div style={collapsedContainerStyle}>
        <button onClick={() => setCollapsed(false)} style={toggleButtonStyle}>
          Map
        </button>
      </div>
    );
  }

  const nonConnectors = objects.filter((o) => o.type !== 'connector');

  return (
    <div style={containerStyle}>
      <button
        onClick={() => setCollapsed(true)}
        style={collapseButtonStyle}
        title="Collapse minimap"
      >
        x
      </button>
      <div
        style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT, position: 'relative', overflow: 'hidden' }}
        onClick={handleClick}
      >
        {/* Render object dots */}
        {nonConnectors.map((obj) => {
          const { mx, my } = worldToMinimap(obj.x, obj.y);
          const w = Math.max(obj.width * minimapScale, 2);
          const h = Math.max(obj.height * minimapScale, 2);

          let bg: string;
          let border: string | undefined;
          if (obj.type === 'sticky') {
            bg = STICKY_COLORS[obj.color] ?? '#FFF9C4';
          } else if (obj.type === 'rectangle') {
            bg = obj.fill;
          } else if (obj.type === 'circle') {
            bg = obj.fill;
          } else if (obj.type === 'line') {
            bg = obj.stroke;
          } else if (obj.type === 'text') {
            bg = '#999';
          } else if (obj.type === 'frame') {
            bg = 'transparent';
            border = '1px dashed #aaa';
          } else {
            bg = '#ccc';
          }

          const dotStyle: React.CSSProperties = {
            position: 'absolute',
            left: mx,
            top: my,
            width: w,
            height: obj.type === 'line' ? 1 : h,
            background: bg,
            border,
            borderRadius: obj.type === 'circle' ? '50%' : undefined,
            pointerEvents: 'none',
          };

          return <div key={obj.id} style={dotStyle} />;
        })}

        {/* Viewport indicator */}
        <div
          style={{
            position: 'absolute',
            left: vpMinimap.mx,
            top: vpMinimap.my,
            width: vpWorldW * minimapScale,
            height: vpWorldH * minimapScale,
            background: 'rgba(33, 150, 243, 0.15)',
            border: '2px solid rgba(33, 150, 243, 0.6)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 70,
  left: 16,
  zIndex: 10,
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  overflow: 'hidden',
  padding: 4,
};

const collapsedContainerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 70,
  left: 16,
  zIndex: 10,
};

const toggleButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 12,
  color: '#666',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

const collapseButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: 4,
  right: 4,
  zIndex: 1,
  width: 20,
  height: 20,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 12,
  color: '#999',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,
  padding: 0,
};
