// @vitest-environment jsdom
/**
 * Feature 3 — ToolCallDisplay TDD tests
 *
 * EXPECTED TO FAIL until ToolCallDisplay is created and exported
 * from AiMessageBubble.tsx (Task #9).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../../shared/theme/theme-utils.ts', () => ({
  v: (token: string) => token,
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <span>{children}</span>,
}));

// This import will fail until ToolCallDisplay is implemented and exported
import { ToolCallDisplay } from '../ui/AiMessageBubble.tsx';

describe('ToolCallDisplay', () => {
  beforeEach(() => {
    cleanup();
  });

  // ── Rendering ────────────────────────────────────────────────────────

  it('renders the tool name', () => {
    render(
      <ToolCallDisplay
        toolName="createStickyNote"
        input={{ text: 'hello', color: 'yellow' }}
        state="output-available"
        output={{ id: 'obj-1' }}
      />,
    );

    expect(screen.getByText(/createStickyNote/)).toBeTruthy();
  });

  it('renders a human-readable description via describeToolResult', () => {
    render(
      <ToolCallDisplay
        toolName="createStickyNote"
        input={{ text: 'hello' }}
        state="output-available"
        output={{ id: 'obj-1' }}
      />,
    );

    expect(screen.getByText(/Created sticky note/)).toBeTruthy();
  });

  // ── Status indicators ────────────────────────────────────────────────

  it('shows checkmark for completed (output-available) tools', () => {
    render(
      <ToolCallDisplay
        toolName="moveObject"
        input={{ objectId: 'obj-1', x: 100, y: 200 }}
        state="output-available"
        output={{ success: true }}
      />,
    );

    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('shows in-progress indicator (no checkmark) for partial-call state', () => {
    render(
      <ToolCallDisplay
        toolName="getBoardState"
        input={{}}
        state="partial-call"
      />,
    );

    // Should NOT show checkmark
    expect(screen.queryByText('✓')).toBeNull();
    // Should show in-progress description
    expect(screen.getByText(/Reading board state/)).toBeTruthy();
  });

  it('shows in-progress indicator for call state (called, no result yet)', () => {
    render(
      <ToolCallDisplay
        toolName="createShape"
        input={{ type: 'rectangle' }}
        state="call"
      />,
    );

    expect(screen.queryByText('✓')).toBeNull();
    expect(screen.getByText(/Creating rectangle/)).toBeTruthy();
  });

  // ── Error styling ────────────────────────────────────────────────────

  it('shows error text for failed tools', () => {
    render(
      <ToolCallDisplay
        toolName="moveObject"
        input={{ objectId: 'obj-1' }}
        state="output-available"
        output={{ error: 'Object not found' }}
      />,
    );

    expect(screen.getByText(/Object not found/)).toBeTruthy();
  });

  it('does not show checkmark for error results', () => {
    render(
      <ToolCallDisplay
        toolName="moveObject"
        input={{ objectId: 'obj-1' }}
        state="output-available"
        output={{ error: 'Object not found' }}
      />,
    );

    expect(screen.queryByText('✓')).toBeNull();
  });

  // ── Expand / collapse ────────────────────────────────────────────────

  it('does not show input/output JSON when collapsed', () => {
    render(
      <ToolCallDisplay
        toolName="createStickyNote"
        input={{ text: 'hello', color: 'yellow' }}
        state="output-available"
        output={{ id: 'obj-1' }}
      />,
    );

    // The raw JSON values should not be visible when collapsed
    expect(screen.queryByText(/"yellow"/)).toBeNull();
    expect(screen.queryByText(/"obj-1"/)).toBeNull();
  });

  it('expands on click to show input parameters as JSON', () => {
    render(
      <ToolCallDisplay
        toolName="createStickyNote"
        input={{ text: 'hello', color: 'yellow' }}
        state="output-available"
        output={{ id: 'obj-1' }}
      />,
    );

    // Click to expand — find the clickable card area
    const card =
      screen.getByText(/createStickyNote/).closest('[role="button"]') ??
      screen.getByText(/createStickyNote/).parentElement;
    fireEvent.click(card!);

    // Input JSON should now be visible
    expect(screen.getByText(/"yellow"/)).toBeTruthy();
  });

  it('shows output JSON in expanded state', () => {
    render(
      <ToolCallDisplay
        toolName="createStickyNote"
        input={{ text: 'hello' }}
        state="output-available"
        output={{ id: 'obj-1' }}
      />,
    );

    const card =
      screen.getByText(/createStickyNote/).closest('[role="button"]') ??
      screen.getByText(/createStickyNote/).parentElement;
    fireEvent.click(card!);

    expect(screen.getByText(/"obj-1"/)).toBeTruthy();
  });

  it('collapses back on second click', () => {
    render(
      <ToolCallDisplay
        toolName="createStickyNote"
        input={{ text: 'hello', color: 'yellow' }}
        state="output-available"
        output={{ id: 'obj-1' }}
      />,
    );

    const card =
      screen.getByText(/createStickyNote/).closest('[role="button"]') ??
      screen.getByText(/createStickyNote/).parentElement;

    // Expand
    fireEvent.click(card!);
    expect(screen.getByText(/"yellow"/)).toBeTruthy();

    // Collapse
    fireEvent.click(card!);
    expect(screen.queryByText(/"yellow"/)).toBeNull();
  });
});
