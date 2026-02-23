// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { HomePage } from '../HomePage.tsx';
import { ThemeProvider } from '../../../shared/theme/ThemeContext.tsx';
import type { BoardListEntry } from '../../../modules/board-access/contracts.ts';

// Capturable navigate mock
const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
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

// Configurable observeBoards mock — tests set this before rendering
let observeBoardsBehavior: (cb: (boards: BoardListEntry[]) => void) => () => void =
  () => () => {};

const mockDeleteBoard = vi.fn().mockResolvedValue(undefined);

vi.mock('../../module-registry.ts', () => ({
  getModuleApi: () => ({
    createBoard: vi.fn().mockResolvedValue({ boardId: 'test-board' }),
    deleteBoard: (...args: unknown[]) => mockDeleteBoard(...args),
    observeBoards: (cb: (boards: BoardListEntry[]) => void) => observeBoardsBehavior(cb),
  }),
}));

// Test fixtures
const SAMPLE_BOARDS: BoardListEntry[] = [
  {
    id: 'board-1',
    title: 'Project Alpha',
    ownerId: 'test-uid',
    createdAt: 1700000000000, // Nov 14 2023
    memberCount: 3,
    role: 'owner',
  },
  {
    id: 'board-2',
    title: 'Design Sprint',
    ownerId: 'other-uid',
    createdAt: 1710000000000, // Mar 9 2024
    memberCount: 7,
    role: 'collaborator',
  },
];

beforeEach(() => {
  mockNavigate.mockReset();
  mockDeleteBoard.mockClear();
  // Default: call back immediately with empty (override per-test as needed)
  observeBoardsBehavior = () => () => {};
});

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

  // ── Board listing tests (TDD — expected to fail until UI is implemented) ──

  it('renders board list when user has boards', () => {
    observeBoardsBehavior = (cb) => {
      cb(SAMPLE_BOARDS);
      return () => {};
    };
    renderWithTheme(<HomePage />);

    expect(screen.getByText('Project Alpha')).toBeDefined();
    expect(screen.getByText('Design Sprint')).toBeDefined();
  });

  it('shows loading state while boards are loading', () => {
    // observeBoards never calls back → boards are still loading
    observeBoardsBehavior = () => () => {};
    renderWithTheme(<HomePage />);

    // Should show a loading indicator (spinner, skeleton, or text)
    const loading = screen.queryByText(/loading/i) ?? screen.queryByRole('status');
    expect(loading).not.toBeNull();
  });

  it('shows empty state message when no boards exist', () => {
    observeBoardsBehavior = (cb) => {
      cb([]);
      return () => {};
    };
    renderWithTheme(<HomePage />);

    // Should show an empty-state message (not just nothing)
    const empty =
      screen.queryByText(/no boards/i) ?? screen.queryByText(/get started/i);
    expect(empty).not.toBeNull();
  });

  it('board cards show title, date, and member count', () => {
    observeBoardsBehavior = (cb) => {
      cb(SAMPLE_BOARDS);
      return () => {};
    };
    renderWithTheme(<HomePage />);

    // Title
    expect(screen.getByText('Project Alpha')).toBeDefined();

    // Member count — look for the number "3" near the board card
    const memberTexts = screen.getAllByText(/3 member/i);
    expect(memberTexts.length).toBeGreaterThan(0);

    // Date — the createdAt timestamp should be formatted as a readable date
    // Nov 14, 2023 or 11/14/2023 or similar
    const datePattern = /nov.*2023|11\/14\/2023|2023/i;
    const dateEl = screen.getAllByText(datePattern);
    expect(dateEl.length).toBeGreaterThan(0);
  });

  it('clicking a board card navigates to /board/{id}', () => {
    observeBoardsBehavior = (cb) => {
      cb(SAMPLE_BOARDS);
      return () => {};
    };
    renderWithTheme(<HomePage />);

    // Click on the first board card
    const boardCard = screen.getByText('Project Alpha').closest(
      '[data-testid="board-card"], a, button, [role="link"], [role="button"]',
    );
    expect(boardCard).not.toBeNull();
    fireEvent.click(boardCard!);

    expect(mockNavigate).toHaveBeenCalledWith('/board/board-1');
  });

  it('create board button still works alongside board list', () => {
    observeBoardsBehavior = (cb) => {
      cb(SAMPLE_BOARDS);
      return () => {};
    };
    renderWithTheme(<HomePage />);

    // Board list is rendered
    expect(screen.getByText('Project Alpha')).toBeDefined();

    // Create board card is still present
    const createTexts = screen.getAllByText(/create new board/i);
    expect(createTexts.length).toBeGreaterThan(0);

    // It should still be clickable
    let el: HTMLElement | null = createTexts[0] as HTMLElement;
    while (el) {
      if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') break;
      el = el.parentElement;
    }
    expect(el).not.toBeNull();
    fireEvent.click(el!);
  });

  // ── Delete board tests ──

  it('clicking delete button calls deleteBoard with board id', () => {
    observeBoardsBehavior = (cb) => {
      cb(SAMPLE_BOARDS);
      return () => {};
    };
    renderWithTheme(<HomePage />);

    const deleteBtn = screen.getByLabelText('Delete Project Alpha');
    fireEvent.click(deleteBtn);

    expect(mockDeleteBoard).toHaveBeenCalledWith('board-1');
  });

  it('clicking delete button does not navigate to the board', () => {
    observeBoardsBehavior = (cb) => {
      cb(SAMPLE_BOARDS);
      return () => {};
    };
    renderWithTheme(<HomePage />);

    const deleteBtn = screen.getByLabelText('Delete Project Alpha');
    fireEvent.click(deleteBtn);

    // Delete should NOT trigger navigation
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
