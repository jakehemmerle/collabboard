import { useEffect } from 'react';

interface KeyboardShortcutHandlers {
  onDelete: () => void;
  onSelectAll: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDeselect: () => void;
  isEditing: boolean;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (handlers.isEditing) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handlers.onDelete();
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        handlers.onSelectAll();
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault();
        handlers.onCopy();
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        handlers.onPaste();
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        handlers.onDuplicate();
      }

      if (e.key === 'Escape') {
        handlers.onDeselect();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });
}
