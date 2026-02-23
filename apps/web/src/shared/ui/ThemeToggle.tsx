import { useState } from 'react';
import { useTheme } from '../theme/useTheme';
import { v } from '../theme/theme-utils';

export function ThemeToggle() {
  const { mode, toggleTheme } = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={toggleTheme}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
      style={{
        background: hovered ? v('--cb-bg-surface-raised') : 'transparent',
        border: `1px solid ${v('--cb-border-default')}`,
        borderRadius: 8,
        cursor: 'pointer',
        padding: '6px 8px',
        fontSize: 18,
        lineHeight: 1,
        color: v('--cb-text-secondary'),
        transition: 'background 0.15s, border-color 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {mode === 'light' ? '\u{1F319}' : '\u{2600}\u{FE0F}'}
    </button>
  );
}
