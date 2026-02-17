import { BrowserRouter, Routes, Route } from 'react-router';
import { RequireAuth } from '../modules/auth/ui/RequireAuth.tsx';
import { BoardPage } from './pages/BoardPage.tsx';
import { HomePage } from './pages/HomePage.tsx';

export function AppRouter() {
  return (
    <BrowserRouter>
      <RequireAuth>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/board/:id" element={<BoardPage />} />
        </Routes>
      </RequireAuth>
    </BrowserRouter>
  );
}
