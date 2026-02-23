import type { Camera } from '../contracts.ts';
import { v } from '../../../shared/theme/theme-utils.ts';

interface ZoomControlsProps {
  camera: Camera;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
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
  background: v('--cb-bg-surface'),
  border: `1px solid ${v('--cb-border-default')}`,
  borderRadius: 8,
  boxShadow: v('--cb-shadow-sm'),
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
  color: v('--cb-text-primary'),
};

const disabledButtonStyle: React.CSSProperties = {
  opacity: 0.4,
  cursor: 'not-allowed',
};

const percentStyle: React.CSSProperties = {
  fontSize: 11,
  color: v('--cb-text-secondary'),
  padding: '2px 0',
  userSelect: 'none',
};

const dividerStyle: React.CSSProperties = {
  width: 24,
  height: 1,
  background: v('--cb-border-default'),
  margin: '2px 0',
};

export function ZoomControls({
  camera,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onResetView,
  onFitContent,
}: ZoomControlsProps) {
  return (
    <div style={containerStyle}>
      <button
        style={{ ...buttonStyle, ...(canUndo ? {} : disabledButtonStyle) }}
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Cmd/Ctrl+Z)"
      >
        ↶
      </button>
      <button
        style={{ ...buttonStyle, ...(canRedo ? {} : disabledButtonStyle) }}
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Cmd/Ctrl+Shift+Z)"
      >
        ↷
      </button>
      <div style={dividerStyle} />
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
