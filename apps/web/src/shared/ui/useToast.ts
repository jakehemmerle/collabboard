import { useCallback } from 'react';
import { addToast } from './toast-store.ts';

export function useToast() {
  const toast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
    addToast(message, type);
  }, []);
  return { toast };
}
