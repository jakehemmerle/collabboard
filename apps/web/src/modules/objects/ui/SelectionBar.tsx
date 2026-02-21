interface SelectionBarProps {
  selectedCount: number;
  onAlignLeft: () => void;
  onAlignCenterH: () => void;
  onAlignRight: () => void;
  onAlignTop: () => void;
  onAlignCenterV: () => void;
  onAlignBottom: () => void;
  onDistributeH: () => void;
  onDistributeV: () => void;
}

export function SelectionBar({
  selectedCount,
  onAlignLeft,
  onAlignCenterH,
  onAlignRight,
  onAlignTop,
  onAlignCenterV,
  onAlignBottom,
  onDistributeH,
  onDistributeV,
}: SelectionBarProps) {
  if (selectedCount < 2) return null;

  return (
    <div style={barStyle}>
      <span style={countStyle}>{selectedCount} selected</span>
      <div style={dividerStyle} />
      <button onClick={onAlignLeft} style={iconBtnStyle} title="Align left">\u2BF7</button>
      <button onClick={onAlignRight} style={iconBtnStyle} title="Align right">\u2BF8</button>
      <button onClick={onAlignCenterH} style={iconBtnStyle} title="Align center">\u22A1</button>
      <button onClick={onAlignTop} style={iconBtnStyle} title="Align top">\u22A4</button>
      <button onClick={onAlignBottom} style={iconBtnStyle} title="Align bottom">\u22A5</button>
      <button onClick={onAlignCenterV} style={iconBtnStyle} title="Align middle">\u229E</button>
      {selectedCount >= 3 && (
        <>
          <div style={dividerStyle} />
          <button onClick={onDistributeH} style={iconBtnStyle} title="Distribute horizontally">\u2194</button>
          <button onClick={onDistributeV} style={iconBtnStyle} title="Distribute vertically">\u2195</button>
        </>
      )}
    </div>
  );
}

const barStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

const countStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#666',
};

const iconBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: 14,
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 24,
  backgroundColor: '#ddd',
  margin: '0 4px',
};
