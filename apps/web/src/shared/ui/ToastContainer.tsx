import { useSyncExternalStore } from 'react';
import { subscribeToasts, getToasts, removeToast } from './toast-store.ts';

const typeStyles: Record<'success' | 'info' | 'error', React.CSSProperties> = {
  success: { background: '#4CAF50' },
  info: { background: '#333' },
  error: { background: '#D32F2F' },
};

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 80,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1001,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  alignItems: 'center',
  pointerEvents: 'none',
};

const toastStyle: React.CSSProperties = {
  pointerEvents: 'auto',
  padding: '10px 20px',
  borderRadius: 8,
  fontSize: 14,
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};

const closeStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'rgba(255,255,255,0.7)',
  cursor: 'pointer',
  fontSize: 16,
  padding: 0,
};

export function ToastContainer() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts);

  if (toasts.length === 0) return null;

  return (
    <div style={containerStyle}>
      {toasts.map(toast => (
        <div key={toast.id} style={{ ...toastStyle, ...typeStyles[toast.type] }}>
          <span>{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} style={closeStyle}>
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
