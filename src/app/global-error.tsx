'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ color: '#1a1a2e' }}>Application Error</h1>
        <p style={{ color: '#666' }}>
          {error.message || 'An unexpected error occurred.'}
        </p>
        <pre style={{
          background: '#f5f5f5',
          padding: '1rem',
          borderRadius: '8px',
          overflow: 'auto',
          maxHeight: '300px',
          fontSize: '12px',
          border: '1px solid #ddd',
        }}>
          {error.stack || error.message}
        </pre>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={reset}
            style={{
              padding: '8px 16px',
              background: '#0d9488',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
          <a
            href="/login"
            style={{
              padding: '8px 16px',
              background: '#e5e5e5',
              color: '#333',
              textDecoration: 'none',
              borderRadius: '6px',
            }}
          >
            Back to login
          </a>
        </div>
      </body>
    </html>
  );
}
