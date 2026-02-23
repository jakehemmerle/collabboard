import { usePresence } from './usePresence.ts';
import { v } from '../../../shared/theme/theme-utils.ts';

const rosterStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  background: v('--cb-bg-surface'),
  border: `1px solid ${v('--cb-border-default')}`,
  borderRadius: 8,
  padding: '8px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  fontFamily: 'sans-serif',
  boxShadow: v('--cb-shadow-sm'),
  zIndex: 10,
  maxHeight: 300,
  overflowY: 'auto' as const,
};

const headerStyle: React.CSSProperties = {
  fontWeight: 600,
  color: v('--cb-text-secondary'),
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
  color: v('--cb-text-primary'),
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
