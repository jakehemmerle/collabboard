import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { DARK_TOKENS, LIGHT_TOKENS, type ThemeMode, type ThemeTokens } from './tokens';
import { ThemeContext } from './theme-context';

const STORAGE_KEY = 'cb-theme';

function applyTokens(tokens: ThemeTokens) {
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(tokens)) {
    root.style.setProperty(prop, value);
  }
}

function getInitialMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);

  useEffect(() => {
    const tokens = mode === 'dark' ? DARK_TOKENS : LIGHT_TOKENS;
    applyTokens(tokens);
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const resolveToken = useCallback((token: keyof ThemeTokens): string => {
    return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, resolveToken }}>
      {children}
    </ThemeContext.Provider>
  );
}
