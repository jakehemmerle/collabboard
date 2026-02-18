import type { BoardObjectType, StickyColor } from '../contracts.ts';
import { STICKY_COLORS } from '../contracts.ts';

interface ToolbarProps {
  selectedType: BoardObjectType | null;
  selectedColor: string | null;
  onCreateSticky: () => void;
  onCreateRectangle: () => void;
  onCreateCircle: () => void;
  onCreateLine: () => void;
  onCreateText: () => void;
  onCreateConnector: () => void;
  onCreateFrame: () => void;
  connectorMode?: boolean;
  onChangeColor: (color: string) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

const CONNECTOR_COLORS = ['#616161', '#D32F2F', '#1565C0', '#2E7D32', '#F57F17', '#4A148C'];
const FRAME_COLORS = ['rgba(200,200,200,0.1)', 'rgba(239,154,154,0.15)', 'rgba(206,147,216,0.15)', 'rgba(144,202,249,0.15)', 'rgba(165,214,167,0.15)', 'rgba(255,224,130,0.15)'];
const SHAPE_COLORS = ['#E0E0E0', '#EF9A9A', '#CE93D8', '#90CAF9', '#A5D6A7', '#FFE082'];
const LINE_COLORS = ['#616161', '#D32F2F', '#1565C0', '#2E7D32', '#F57F17', '#4A148C'];
const TEXT_COLORS = ['#333333', '#D32F2F', '#1565C0', '#2E7D32', '#F57F17', '#4A148C'];

function getColorPalette(type: BoardObjectType): { colors: (string | [StickyColor, string])[]; mode: 'name' | 'hex' } {
  if (type === 'sticky') {
    return { colors: Object.entries(STICKY_COLORS) as [StickyColor, string][], mode: 'name' };
  }
  if (type === 'line') return { colors: LINE_COLORS, mode: 'hex' };
  if (type === 'connector') return { colors: CONNECTOR_COLORS, mode: 'hex' };
  if (type === 'text') return { colors: TEXT_COLORS, mode: 'hex' };
  if (type === 'frame') return { colors: FRAME_COLORS, mode: 'hex' };
  return { colors: SHAPE_COLORS, mode: 'hex' };
}

export function Toolbar({
  selectedType,
  selectedColor,
  onCreateSticky,
  onCreateRectangle,
  onCreateCircle,
  onCreateLine,
  onCreateText,
  onCreateConnector,
  onCreateFrame,
  connectorMode,
  onChangeColor,
  onDelete,
  onDuplicate,
}: ToolbarProps) {
  return (
    <div style={toolbarStyle}>
      <button onClick={onCreateSticky} style={btnStyle} title="Add Sticky Note">
        📝 Sticky
      </button>
      <button onClick={onCreateRectangle} style={btnStyle} title="Add Rectangle">
        ▭ Rectangle
      </button>
      <button onClick={onCreateCircle} style={btnStyle} title="Add Circle">
        ○ Circle
      </button>
      <button onClick={onCreateLine} style={btnStyle} title="Add Line">
        ╱ Line
      </button>
      <button onClick={onCreateText} style={btnStyle} title="Add Text">
        T Text
      </button>
      <div style={dividerStyle} />
      <button
        onClick={onCreateConnector}
        style={{ ...btnStyle, ...(connectorMode ? { background: '#E3F2FD', borderColor: '#2196F3' } : {}) }}
        title="Add Connector (click source, then target)"
      >
        ↗ Connector
      </button>
      <button onClick={onCreateFrame} style={btnStyle} title="Add Frame">
        ▢ Frame
      </button>

      {selectedType && (
        <>
          <div style={dividerStyle} />
          {(() => {
            const { colors, mode } = getColorPalette(selectedType);
            if (mode === 'name') {
              return (colors as [StickyColor, string][]).map(([name, hex]) => (
                <button
                  key={name}
                  onClick={() => onChangeColor(name)}
                  style={{
                    ...colorBtnStyle,
                    backgroundColor: hex,
                    outline: selectedColor === name ? '2px solid #2196F3' : 'none',
                    outlineOffset: 1,
                  }}
                  title={name}
                />
              ));
            }
            return (colors as string[]).map((hex) => (
              <button
                key={hex}
                onClick={() => onChangeColor(hex)}
                style={{
                  ...colorBtnStyle,
                  backgroundColor: hex,
                  outline: selectedColor === hex ? '2px solid #2196F3' : 'none',
                  outlineOffset: 1,
                }}
                title={hex}
              />
            ));
          })()}
          <div style={dividerStyle} />
          {onDuplicate && (
            <button onClick={onDuplicate} style={btnStyle} title="Duplicate (Cmd+D)">
              ⧉ Duplicate
            </button>
          )}
          <button onClick={onDelete} style={{ ...btnStyle, color: '#D32F2F' }} title="Delete">
            ✕ Delete
          </button>
        </>
      )}
    </div>
  );
}

const toolbarStyle: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  zIndex: 10,
};

const btnStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: 'none',
  border: '1px solid #ddd',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
};

const colorBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  border: '1px solid #ccc',
  borderRadius: 4,
  cursor: 'pointer',
  padding: 0,
};

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 24,
  backgroundColor: '#ddd',
  margin: '0 4px',
};
