// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SignInPage } from '../SignInPage.tsx';
import { ThemeProvider } from '../../../../shared/theme/ThemeContext.tsx';

// Mock useAuth so SignInPage can render without Firebase
vi.mock('../useAuth.ts', () => ({
  useAuth: () => ({
    signIn: vi.fn(),
    signOut: vi.fn(),
    user: null,
    loading: false,
  }),
}));

afterEach(() => {
  cleanup();
});

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('SignInPage', () => {
  it('renders "CollabBoard" heading', () => {
    renderWithTheme(<SignInPage />);
    const heading = screen.getByRole('heading', { name: /collabboard/i });
    expect(heading).toBeDefined();
  });

  it('renders sign-in button with themed styling using var() references or primary color', () => {
    renderWithTheme(<SignInPage />);
    const button = screen.getByRole('button', { name: /sign in/i });
    expect(button).toBeDefined();

    // After redesign, the sign-in button should use themed styling —
    // either a var() reference in inline styles or the primary brand color
    const style = button.getAttribute('style') ?? '';
    const hasCssVar = style.includes('var(--cb-');
    const hasPrimaryColor = style.includes('#1976D2') || style.includes('1976d2');
    const hasThemedClass = button.className.length > 0;
    expect(hasCssVar || hasPrimaryColor || hasThemedClass).toBe(true);
  });

  it('renders ThemeToggle component', () => {
    renderWithTheme(<SignInPage />);
    // ThemeToggle renders a button with aria-label "Switch to dark mode" or "Switch to light mode"
    const toggles = screen.queryAllByLabelText(/switch to .* mode/i);
    expect(toggles.length).toBeGreaterThan(0);
  });

  it('has a gradient background on the page container', () => {
    const { container } = renderWithTheme(<SignInPage />);
    // The outermost wrapper should have a linear-gradient in its inline style
    const outerDiv = container.firstElementChild as HTMLElement;
    const style = outerDiv?.getAttribute('style') ?? '';
    expect(style).toContain('linear-gradient');
  });

  it('has a card container with shadow and border-radius', () => {
    const { container } = renderWithTheme(<SignInPage />);
    // Look for an element with both box-shadow and border-radius in styles
    const allDivs = container.querySelectorAll('div');
    let foundCard = false;
    for (const div of allDivs) {
      const style = div.getAttribute('style') ?? '';
      if (style.includes('box-shadow') && style.includes('border-radius')) {
        foundCard = true;
        break;
      }
    }
    expect(foundCard).toBe(true);
  });
});
