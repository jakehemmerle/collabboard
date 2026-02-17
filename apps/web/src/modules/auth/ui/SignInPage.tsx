import { useAuth } from './useAuth.ts';

export function SignInPage() {
  const { signIn } = useAuth();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: 16,
    }}>
      <h1>CollabBoard</h1>
      <p>Sign in to start collaborating</p>
      <button
        onClick={signIn}
        style={{
          padding: '12px 24px',
          fontSize: 16,
          cursor: 'pointer',
          border: '1px solid #ccc',
          borderRadius: 4,
          background: '#fff',
        }}
      >
        Sign in with Google
      </button>
    </div>
  );
}
