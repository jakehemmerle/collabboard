import type { Camera } from '../contracts.ts';

interface ZoomControlsProps {
  camera: Camera;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onFitContent: () => void;
}

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 16,
  right: 16,
  zIndex: 10,
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '4px',
};

const buttonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,
};

const percentStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#666',
  padding: '2px 0',
  userSelect: 'none',
};

const dividerStyle: React.CSSProperties = {
  width: 24,
  height: 1,
  background: '#ddd',
  margin: '2px 0',
};

export function ZoomControls({ camera, onZoomIn, onZoomOut, onResetView, onFitContent }: ZoomControlsProps) {
  return (
    <div style={containerStyle}>
      <button style={buttonStyle} onClick={onZoomIn} title="Zoom in">
        +
      </button>
      <span style={percentStyle}>{Math.round(camera.scale * 100)}%</span>
      <button style={buttonStyle} onClick={onZoomOut} title="Zoom out">
        −
      </button>
      <div style={dividerStyle} />
      <button style={buttonStyle} onClick={onFitContent} title="Fit all content">
        ⊡
      </button>
      <button style={buttonStyle} onClick={onResetView} title="Reset view">
        ↺
      </button>
    </div>
  );
}
