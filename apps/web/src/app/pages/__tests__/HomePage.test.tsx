// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HomePage } from '../HomePage.tsx';
import { ThemeProvider } from '../../../shared/theme/ThemeContext.tsx';

// Mock react-router
vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock useAuth to provide a fake user
vi.mock('../../../modules/auth/ui/useAuth.ts', () => ({
  useAuth: () => ({
    signIn: vi.fn(),
    signOut: vi.fn(),
    user: { displayName: 'Test User', email: 'test@example.com', uid: 'test-uid' },
    loading: false,
  }),
}));

// Mock module registry
vi.mock('../../module-registry.ts', () => ({
  getModuleApi: () => ({
    createBoard: vi.fn().mockResolvedValue({ boardId: 'test-board' }),
  }),
}));

afterEach(() => {
  cleanup();
});

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('HomePage', () => {
  it('renders a nav bar with "CollabBoard" text', () => {
    renderWithTheme(<HomePage />);
    // Should find "CollabBoard" text in a nav bar area (not just as a centered h1)
    const navText = screen.getByText(/collabboard/i);
    expect(navText).toBeDefined();

    // The text should be inside a nav-like container (header, nav, or div acting as nav bar)
    const parent = navText.closest('nav, header, [role="banner"]');
    expect(parent).not.toBeNull();
  });

  it('shows user display name in nav bar', () => {
    renderWithTheme(<HomePage />);
    const userNames = screen.getAllByText(/Test User/);
    expect(userNames.length).toBeGreaterThan(0);
  });

  it('renders a create board card (not just a plain button)', () => {
    renderWithTheme(<HomePage />);
    // Look for a card-like element that contains create board text
    const createTexts = screen.getAllByText(/create new board/i);
    expect(createTexts.length).toBeGreaterThan(0);

    // Walk up from "Create New Board" text to find the card container
    // It should be a styled element with box-shadow and border-radius (card styling)
    let el: HTMLElement | null = createTexts[0] as HTMLElement;
    let foundCard = false;
    while (el) {
      const style = el.getAttribute('style') ?? '';
      if (style.includes('box-shadow') && style.includes('border-radius')) {
        foundCard = true;
        break;
      }
      el = el.parentElement;
    }
    expect(foundCard).toBe(true);
  });

  it('renders ThemeToggle component', () => {
    renderWithTheme(<HomePage />);
    // ThemeToggle renders a button with aria-label "Switch to dark mode" or "Switch to light mode"
    const toggles = screen.queryAllByLabelText(/switch to .* mode/i);
    expect(toggles.length).toBeGreaterThan(0);
  });

  it('shows "Welcome back" message', () => {
    renderWithTheme(<HomePage />);
    const welcomes = screen.getAllByText(/welcome back/i);
    expect(welcomes.length).toBeGreaterThan(0);
  });

  it('create board card has hover interaction elements', () => {
    renderWithTheme(<HomePage />);
    // After redesign, the create board card should have interactive styling
    const createTexts = screen.getAllByText(/create new board/i);

    // Walk up to find the clickable card with cursor styling
    let el: HTMLElement | null = createTexts[0] as HTMLElement;
    let hasCursor = false;
    while (el) {
      const style = el.getAttribute('style') ?? '';
      if (style.includes('cursor')) {
        hasCursor = true;
        break;
      }
      el = el.parentElement;
    }
    expect(hasCursor).toBe(true);
  });
});
