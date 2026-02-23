// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Toolbar } from '../Toolbar.tsx';

const noop = vi.fn();

const defaultProps = {
  selectedType: null as null,
  selectedColor: null as null,
  onCreateSticky: noop,
  onCreateRectangle: noop,
  onCreateCircle: noop,
  onCreateLine: noop,
  onCreateText: noop,
  onCreateConnector: noop,
  onCreateFrame: noop,
  onChangeColor: noop,
  onDelete: noop,
};

describe('Toolbar theme integration', () => {
  it('toolbar container uses var() CSS custom properties instead of hardcoded colors', () => {
    const { container } = render(<Toolbar {...defaultProps} />);
    const toolbar = container.firstElementChild as HTMLElement;
    const style = toolbar?.getAttribute('style') ?? '';

    // After migration, the toolbar should reference CSS custom properties
    // instead of hardcoded #fff for background and #ddd for border.
    // At minimum, the toolbar style should contain var() references.
    expect(style).toContain('var(--cb-');
  });

  it('toolbar button borders use theme tokens not hardcoded #ddd', () => {
    const { container } = render(<Toolbar {...defaultProps} />);
    const buttons = container.querySelectorAll('button');
    let anyButtonUsesVar = false;

    for (const button of buttons) {
      const style = button.getAttribute('style') ?? '';
      if (style.includes('var(--cb-')) {
        anyButtonUsesVar = true;
        break;
      }
    }

    expect(anyButtonUsesVar).toBe(true);
  });

  it('toolbar shadow uses theme token', () => {
    const { container } = render(<Toolbar {...defaultProps} />);
    const toolbar = container.firstElementChild as HTMLElement;
    const style = toolbar?.getAttribute('style') ?? '';

    // Should use var(--cb-shadow-sm) rather than hardcoded rgba shadow
    expect(style).toContain('var(--cb-shadow');
  });
});
