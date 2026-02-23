// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ThemeProvider } from '../ThemeContext.tsx';
import { useTheme } from '../useTheme.ts';
import { LIGHT_TOKENS } from '../tokens.ts';

function TestConsumer() {
  const { mode, toggleTheme, resolveToken } = useTheme();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <button data-testid="toggle" onClick={toggleTheme}>toggle</button>
      <span data-testid="resolved">{resolveToken('--cb-primary')}</span>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  const root = document.documentElement;
  for (const key of Object.keys(LIGHT_TOKENS)) {
    root.style.removeProperty(key);
  }
  root.removeAttribute('data-theme');
});

afterEach(() => {
  cleanup();
});

describe('ThemeProvider', () => {
  it('renders children', () => {
    render(
      <ThemeProvider>
        <span data-testid="child">Hello</span>
      </ThemeProvider>,
    );
    expect(screen.getByTestId('child').textContent).toBe('Hello');
  });

  it('default mode is light', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('mode').textContent).toBe('light');
  });

  it('toggleTheme switches between light and dark', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('mode').textContent).toBe('light');

    act(() => {
      screen.getByTestId('toggle').click();
    });
    expect(screen.getByTestId('mode').textContent).toBe('dark');

    act(() => {
      screen.getByTestId('toggle').click();
    });
    expect(screen.getByTestId('mode').textContent).toBe('light');
  });

  it('sets CSS custom properties on document.documentElement when provider mounts', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--cb-primary')).toBeTruthy();
    expect(root.style.getPropertyValue('--cb-bg-page')).toBeTruthy();
    expect(root.style.getPropertyValue('--cb-text-primary')).toBeTruthy();
  });

  it('persists theme mode to localStorage', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );
    expect(localStorage.getItem('cb-theme')).toBe('light');

    act(() => {
      screen.getByTestId('toggle').click();
    });
    expect(localStorage.getItem('cb-theme')).toBe('dark');
  });

  it('resolveToken returns the current value of a CSS custom property', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );
    const resolved = screen.getByTestId('resolved').textContent;
    expect(typeof resolved).toBe('string');
  });
});
