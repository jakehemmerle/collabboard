import { useEffect, useMemo } from 'react';

interface ShortcutHelpProps {
  open: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string;
  description: string;
}

interface Section {
  title: string;
  shortcuts: Shortcut[];
}

export function ShortcutHelp({ open, onClose }: ShortcutHelpProps) {
  const isMac = useMemo(
    () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform),
    [],
  );
  const mod = isMac ? '\u2318' : 'Ctrl';

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const sections: Section[] = [
    {
      title: 'Selection',
      shortcuts: [
        { keys: 'Click', description: 'Select object' },
        { keys: 'Shift + Click', description: 'Toggle object in selection' },
        { keys: `${mod} + A`, description: 'Select all objects' },
        { keys: 'Escape', description: 'Deselect all' },
        { keys: 'Double-click canvas', description: 'Create sticky note' },
      ],
    },
    {
      title: 'Edit',
      shortcuts: [
        { keys: 'Delete / Backspace', description: 'Delete selected objects' },
        { keys: `${mod} + D`, description: 'Duplicate selected' },
        { keys: `${mod} + C`, description: 'Copy selected' },
        { keys: `${mod} + V`, description: 'Paste' },
        { keys: `${mod} + Z`, description: 'Undo' },
        { keys: `${mod} + Shift + Z`, description: 'Redo' },
      ],
    },
    {
      title: 'View',
      shortcuts: [
        { keys: 'Scroll wheel', description: 'Zoom in / out' },
        { keys: 'Click + drag canvas', description: 'Pan the board' },
        { keys: '?', description: 'Show this help' },
      ],
    },
  ];

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={titleStyle}>
          <span>Keyboard Shortcuts</span>
          <button onClick={onClose} style={closeBtnStyle}>
            &times;
          </button>
        </div>
        {sections.map((section) => (
          <div key={section.title}>
            <div style={sectionHeaderStyle}>{section.title}</div>
            {section.shortcuts.map((shortcut) => (
              <div key={shortcut.keys} style={rowStyle}>
                <span style={kbdStyle}>{shortcut.keys}</span>
                <span>{shortcut.description}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 24,
  maxWidth: 480,
  width: '90%',
  maxHeight: '80vh',
  overflowY: 'auto',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
};

const titleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 16,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 20,
  cursor: 'pointer',
  color: '#999',
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#999',
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginTop: 16,
  marginBottom: 8,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '4px 0',
  fontSize: 14,
};

const kbdStyle: React.CSSProperties = {
  background: '#f5f5f5',
  border: '1px solid #ddd',
  borderRadius: 4,
  padding: '2px 8px',
  fontFamily: 'monospace',
  fontSize: 12,
  color: '#333',
};
