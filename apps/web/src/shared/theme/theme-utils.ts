import type { ThemeTokens } from './tokens';

export function v(token: keyof ThemeTokens): string {
  return `var(${token})`;
}
