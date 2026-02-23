import { createContext } from 'react';
import type { ThemeMode, ThemeTokens } from './tokens';

export interface ThemeContextValue {
  mode: ThemeMode;
  toggleTheme: () => void;
  resolveToken: (token: keyof ThemeTokens) => string;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
