import { Providers } from './providers.tsx';
import { AppRouter } from './router.tsx';

export function App() {
  return (
    <Providers>
      <AppRouter />
    </Providers>
  );
}
