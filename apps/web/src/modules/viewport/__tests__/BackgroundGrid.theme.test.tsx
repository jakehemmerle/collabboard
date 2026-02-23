// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

// Mock react-konva since it requires canvas which jsdom doesn't support
vi.mock('react-konva', () => ({
  Layer: ({ children }: { children: React.ReactNode }) => <div data-testid="layer">{children}</div>,
  Circle: (props: Record<string, unknown>) => <div data-testid="circle" data-fill={props.fill} />,
}));

import { render } from '@testing-library/react';
import { BackgroundGrid } from '../../viewport/ui/BackgroundGrid.tsx';

const defaultCamera = { x: 0, y: 0, scale: 1 };

describe('BackgroundGrid theme integration', () => {
  it('accepts and uses gridDotColor prop for dot fill color', () => {
    const { container } = render(
      <BackgroundGrid
        camera={defaultCamera}
        width={800}
        height={600}
        gridDotColor="#3d3d5c"
      />,
    );

    // After migration, BackgroundGrid should accept gridDotColor and use it
    // as the fill color for the Circle elements instead of hardcoded "#ccc"
    const circles = container.querySelectorAll('[data-testid="circle"]');
    expect(circles.length).toBeGreaterThan(0);

    const firstCircle = circles[0];
    expect(firstCircle?.getAttribute('data-fill')).toBe('#3d3d5c');
  });

  it('defaults to a reasonable color when gridDotColor is not provided', () => {
    const { container } = render(
      <BackgroundGrid camera={defaultCamera} width={800} height={600} />,
    );

    const circles = container.querySelectorAll('[data-testid="circle"]');
    if (circles.length > 0) {
      const fill = circles[0]?.getAttribute('data-fill');
      // Should have some fill color (either a default or from theme)
      expect(fill).toBeTruthy();
    }
  });
});
