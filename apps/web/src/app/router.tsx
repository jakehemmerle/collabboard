import { BrowserRouter, Routes, Route } from 'react-router';
import { BoardPage } from './pages/BoardPage.tsx';
import { HomePage } from './pages/HomePage.tsx';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/board/:id" element={<BoardPage />} />
      </Routes>
    </BrowserRouter>
  );
}
