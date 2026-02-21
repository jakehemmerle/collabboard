export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
  duration: number;
}

type Listener = (toasts: Toast[]) => void;

const listeners = new Set<Listener>();
let toasts: Toast[] = [];
let nextId = 0;

function notify() {
  for (const l of listeners) l([...toasts]);
}

export function addToast(message: string, type: Toast['type'] = 'info', duration = 2500): void {
  const id = String(nextId++);
  toasts = [...toasts, { id, message, type, duration }];
  notify();
  setTimeout(() => removeToast(id), duration);
}

export function removeToast(id: string): void {
  toasts = toasts.filter(t => t.id !== id);
  notify();
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getToasts(): Toast[] {
  return toasts;
}
