import { describe, it, expect } from 'vitest';
import { v } from '../theme-utils.ts';

describe('v() helper', () => {
  it("returns 'var(--cb-bg-surface)' for '--cb-bg-surface'", () => {
    expect(v('--cb-bg-surface')).toBe('var(--cb-bg-surface)');
  });

  it("returns 'var(--cb-primary)' for '--cb-primary'", () => {
    expect(v('--cb-primary')).toBe('var(--cb-primary)');
  });

  it("returns 'var(--cb-shadow-lg)' for '--cb-shadow-lg'", () => {
    expect(v('--cb-shadow-lg')).toBe('var(--cb-shadow-lg)');
  });

  it('works for any token string', () => {
    expect(v('--cb-text-primary')).toBe('var(--cb-text-primary)');
    expect(v('--cb-grid-dot')).toBe('var(--cb-grid-dot)');
    expect(v('--cb-error')).toBe('var(--cb-error)');
  });
});
