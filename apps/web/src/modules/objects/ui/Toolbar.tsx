import type { StickyColor } from '../contracts.ts';
import { STICKY_COLORS } from '../contracts.ts';

interface ToolbarProps {
  selectedType: 'sticky' | 'rectangle' | null;
  selectedColor: string | null;
  onCreateSticky: () => void;
  onCreateRectangle: () => void;
  onChangeColor: (color: string) => void;
  onDelete: () => void;
}

const RECT_COLORS = ['#E0E0E0', '#EF9A9A', '#CE93D8', '#90CAF9', '#A5D6A7', '#FFE082'];

export function Toolbar({
  selectedType,
  selectedColor,
  onCreateSticky,
  onCreateRectangle,
  onChangeColor,
  onDelete,
}: ToolbarProps) {
  return (
    <div style={toolbarStyle}>
      <button onClick={onCreateSticky} style={btnStyle} title="Add Sticky Note">
        📝 Sticky
      </button>
      <button onClick={onCreateRectangle} style={btnStyle} title="Add Rectangle">
        ▭ Rectangle
      </button>

      {selectedType && (
        <>
          <div style={dividerStyle} />
          {selectedType === 'sticky'
            ? (Object.entries(STICKY_COLORS) as [StickyColor, string][]).map(([name, hex]) => (
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
              ))
            : RECT_COLORS.map((hex) => (
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
              ))}
          <div style={dividerStyle} />
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
