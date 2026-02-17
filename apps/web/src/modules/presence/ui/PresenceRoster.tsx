import { usePresence } from './usePresence.ts';

const rosterStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: '8px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  fontFamily: 'sans-serif',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  zIndex: 10,
  maxHeight: 300,
  overflowY: 'auto' as const,
};

const headerStyle: React.CSSProperties = {
  fontWeight: 600,
  color: '#555',
  marginBottom: 2,
};

const userRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

function dotStyle(color: string): React.CSSProperties {
  return {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: color,
    flexShrink: 0,
  };
}

const nameStyle: React.CSSProperties = {
  color: '#333',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 140,
};

export function PresenceRoster() {
  const users = usePresence();

  if (users.length === 0) return null;

  return (
    <div style={rosterStyle}>
      <div style={headerStyle}>Online ({users.length})</div>
      {users.map((u) => (
        <div key={u.uid} style={userRowStyle}>
          <div style={dotStyle(u.color)} />
          <span style={nameStyle}>{u.displayName || 'Anonymous'}</span>
        </div>
      ))}
    </div>
  );
}
