// @vitest-environment jsdom
/**
 * Feature 1 (Clear button) + Feature 2 (Stop button) TDD tests
 *
 * EXPECTED TO FAIL until:
 * - Clear button is added to AiChatPanel header (Feature 1)
 * - onClearMessages prop is wired (Feature 1)
 * - Stop/Send conditional rendering is added (Feature 2)
 * - Input disabled state is changed (Feature 2)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// --- Mocks ---

const mockSendMessage = vi.fn();
const mockStop = vi.fn();
const mockSetMessages = vi.fn();
const mockClearError = vi.fn();

let mockStatus = 'ready';
let mockMessages: unknown[] = [];
let mockError: Error | null = null;

vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({
    messages: mockMessages,
    sendMessage: mockSendMessage,
    status: mockStatus,
    setMessages: mockSetMessages,
    error: mockError,
    clearError: mockClearError,
    stop: mockStop,
  }),
}));

vi.mock('ai', () => ({
  DefaultChatTransport: vi.fn(),
}));

vi.mock('../../../app/module-registry.ts', () => ({
  getModuleApi: () => ({
    getConfig: () => ({ functionUrl: 'http://test-function-url' }),
    getIdToken: () => Promise.resolve('test-token'),
  }),
}));

vi.mock('../../../shared/theme/theme-utils.ts', () => ({
  v: (token: string) => token,
}));

vi.mock('../index.ts', () => ({
  AI_AGENT_MODULE_ID: 'ai-agent',
}));

vi.mock('../../auth/index.ts', () => ({
  AUTH_MODULE_ID: 'auth',
}));

import { AiChatPanel } from '../ui/AiChatPanel.tsx';

/** Helper: open the panel (starts closed) */
function openPanel() {
  fireEvent.click(screen.getByTitle('Open AI Chat'));
}

describe('AiChatPanel', () => {
  beforeEach(() => {
    mockStatus = 'ready';
    mockMessages = [];
    mockError = null;
    vi.clearAllMocks();
    cleanup();
  });

  // ── Feature 1: Clear button ──────────────────────────────────────────

  describe('Feature 1 — Clear button', () => {
    it('renders a Clear button in the header', () => {
      render(<AiChatPanel boardId="b1" />);
      openPanel();

      // The clear button should have an accessible title or visible text
      const clearBtn = screen.getByTitle(/clear/i);
      expect(clearBtn).toBeTruthy();
    });

    it('calls setMessages([]) when Clear is clicked', () => {
      render(<AiChatPanel boardId="b1" />);
      openPanel();

      fireEvent.click(screen.getByTitle(/clear/i));

      expect(mockSetMessages).toHaveBeenCalledWith([]);
    });

    it('calls onClearMessages callback when Clear is clicked', () => {
      const onClear = vi.fn();
      render(<AiChatPanel boardId="b1" onClearMessages={onClear} />);
      openPanel();

      fireEvent.click(screen.getByTitle(/clear/i));

      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('does not crash if onClearMessages is not provided', () => {
      render(<AiChatPanel boardId="b1" />);
      openPanel();

      // Should not throw
      expect(() => {
        fireEvent.click(screen.getByTitle(/clear/i));
      }).not.toThrow();
    });
  });

  // ── Feature 2: Stop inference button ─────────────────────────────────

  describe('Feature 2 — Stop / Send button', () => {
    it('shows Send button when status is ready', () => {
      mockStatus = 'ready';
      render(<AiChatPanel boardId="b1" />);
      openPanel();

      expect(screen.getByText('Send')).toBeTruthy();
      expect(screen.queryByText('Stop')).toBeNull();
    });

    it('shows Stop button when status is streaming', () => {
      mockStatus = 'streaming';
      render(<AiChatPanel boardId="b1" />);
      openPanel();

      expect(screen.getByText('Stop')).toBeTruthy();
      expect(screen.queryByText('Send')).toBeNull();
    });

    it('shows Stop button when status is submitted', () => {
      mockStatus = 'submitted';
      render(<AiChatPanel boardId="b1" />);
      openPanel();

      expect(screen.getByText('Stop')).toBeTruthy();
      expect(screen.queryByText('Send')).toBeNull();
    });

    it('calls stop() when Stop button is clicked', () => {
      mockStatus = 'streaming';
      render(<AiChatPanel boardId="b1" />);
      openPanel();

      fireEvent.click(screen.getByText('Stop'));

      expect(mockStop).toHaveBeenCalledTimes(1);
    });

    it('does NOT disable the text input when loading', () => {
      mockStatus = 'streaming';
      render(<AiChatPanel boardId="b1" />);
      openPanel();

      const input = screen.getByPlaceholderText('Type a command...');
      expect((input as HTMLInputElement).disabled).toBe(false);
    });
  });
});
