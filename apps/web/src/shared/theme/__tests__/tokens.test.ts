import { describe, it, expect } from 'vitest';
import { LIGHT_TOKENS, DARK_TOKENS } from '../tokens.ts';

describe('LIGHT_TOKENS', () => {
  it('is exported and is an object', () => {
    expect(LIGHT_TOKENS).toBeDefined();
    expect(typeof LIGHT_TOKENS).toBe('object');
  });

  it('has all expected surface keys', () => {
    expect(LIGHT_TOKENS).toHaveProperty('--cb-bg-page');
    expect(LIGHT_TOKENS).toHaveProperty('--cb-bg-surface');
    expect(LIGHT_TOKENS).toHaveProperty('--cb-bg-surface-raised');
    expect(LIGHT_TOKENS).toHaveProperty('--cb-bg-canvas');
  });

  it('has all expected border keys', () => {
    expect(LIGHT_TOKENS).toHaveProperty('--cb-border-default');
    expect(LIGHT_TOKENS).toHaveProperty('--cb-border-subtle');
    expect(LIGHT_TOKENS).toHaveProperty('--cb-border-strong');
  });

  it('has all expected text keys', () => {
    expect(LIGHT_TOKENS).toHaveProperty('--cb-text-primary');
    expect(LIGHT_TOKENS).toHaveProperty('--cb-text-secondary');
    expect(LIGHT_TOKENS).toHaveProperty('--cb-text-tertiary');
    expect(LIGHT_TOKENS).toHaveProperty('--cb-text-on-primary');
  });

  it('has all expected brand keys', () => {
    expect(LIGHT_TOKENS).toHaveProperty('--cb-primary');
    expect(LIGHT_TOKENS).toHaveProperty('--cb-primary-hover');
    expect(LIGHT_TOKENS).toHaveProperty('--cb-primary-light');
    expect(LIGHT_TOKENS).toHaveProperty('--cb-primary-surface');
  });

  it('has expected primary color value', () => {
    expect(LIGHT_TOKENS['--cb-primary']).toBe('#1976D2');
  });

  it('has expected shadow keys', () => {
    expect(LIGHT_TOKENS).toHaveProperty('--cb-shadow-sm');
    expect(LIGHT_TOKENS).toHaveProperty('--cb-shadow-md');
    expect(LIGHT_TOKENS).toHaveProperty('--cb-shadow-lg');
  });

  it('has expected canvas keys', () => {
    expect(LIGHT_TOKENS).toHaveProperty('--cb-grid-dot');
    expect(LIGHT_TOKENS).toHaveProperty('--cb-selection-border');
  });

  it('has expected input keys', () => {
    expect(LIGHT_TOKENS).toHaveProperty('--cb-input-bg');
    expect(LIGHT_TOKENS).toHaveProperty('--cb-input-border');
    expect(LIGHT_TOKENS).toHaveProperty('--cb-input-disabled-bg');
  });

  it('has all token names starting with --cb-', () => {
    for (const key of Object.keys(LIGHT_TOKENS)) {
      expect(key).toMatch(/^--cb-/);
    }
  });
});

describe('DARK_TOKENS', () => {
  it('is exported and is an object', () => {
    expect(DARK_TOKENS).toBeDefined();
    expect(typeof DARK_TOKENS).toBe('object');
  });

  it('has a dark value for every light token key', () => {
    const lightKeys = Object.keys(LIGHT_TOKENS);
    const darkKeys = Object.keys(DARK_TOKENS);
    for (const key of lightKeys) {
      expect(darkKeys).toContain(key);
    }
  });

  it('has all token names starting with --cb-', () => {
    for (const key of Object.keys(DARK_TOKENS)) {
      expect(key).toMatch(/^--cb-/);
    }
  });

  it('has different bg-page value from light tokens', () => {
    expect(DARK_TOKENS['--cb-bg-page']).not.toBe(LIGHT_TOKENS['--cb-bg-page']);
  });
});
