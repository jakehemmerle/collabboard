import { useState } from 'react';
import { useAuth } from './useAuth.ts';
import { v } from '../../../shared/theme/theme-utils.ts';
import { ThemeToggle } from '../../../shared/ui/ThemeToggle.tsx';

export function SignInPage() {
  const { signIn } = useAuth();
  const [btnHovered, setBtnHovered] = useState(false);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: `linear-gradient(135deg, ${v('--cb-primary-light')}, ${v('--cb-bg-page')})`,
      position: 'relative',
    }}>
      {/* Theme toggle — top-right corner */}
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <ThemeToggle />
      </div>

      {/* Card */}
      <div style={{
        background: v('--cb-bg-surface'),
        maxWidth: 420,
        width: '100%',
        borderRadius: 12,
        boxShadow: v('--cb-shadow-lg'),
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}>
        {/* Wordmark */}
        <h1 style={{
          margin: 0,
          fontSize: 28,
          fontWeight: 700,
          color: v('--cb-text-primary'),
        }}>
          CollabBoard
        </h1>

        {/* Tagline */}
        <p style={{
          margin: 0,
          fontSize: 15,
          color: v('--cb-text-secondary'),
        }}>
          Real-time collaborative whiteboarding
        </p>

        {/* Separator */}
        <hr style={{
          width: '100%',
          border: 'none',
          borderTop: `1px solid ${v('--cb-border-subtle')}`,
          margin: '16px 0',
        }} />

        {/* Google sign-in button */}
        <button
          onClick={signIn}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            background: btnHovered ? v('--cb-primary-hover') : v('--cb-primary'),
            color: v('--cb-text-on-primary'),
            border: 'none',
            borderRadius: 8,
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
            transition: 'background 0.15s',
          }}
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
