import type { ReactNode } from 'react';
import { ThemeProvider } from '../shared/theme/ThemeContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
