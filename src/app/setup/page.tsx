'use client';

import { useState, useEffect } from 'react';

type Status = 'idle' | 'checking' | 'ready' | 'submitting' | 'success' | 'expired' | 'error';

export default function SetupPage() {
  const [status, setStatus] = useState<Status>('checking');
  const [token, setToken] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [supabaseServiceRoleKey, setSupabaseServiceRoleKey] = useState('');
  const [error, setError] = useState('');
  const [showKeys, setShowKeys] = useState(false);

  useEffect(() => {
    // Check if setup is still available
    fetch('/api/setup/supabase')
      .then((r) => r.json())
      .then((data) => {
        if (data.available) {
          setStatus('ready');
        } else {
          setStatus('expired');
        }
      })
      .catch(() => {
        setStatus('error');
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setStatus('submitting');

    try {
      const res = await fetch('/api/setup/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          supabaseUrl,
          supabaseAnonKey,
          supabaseServiceRoleKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'An error occurred.');
        setStatus('ready');
        return;
      }

      // Clear sensitive data from memory immediately
      setToken('');
      setSupabaseUrl('');
      setSupabaseAnonKey('');
      setSupabaseServiceRoleKey('');
      setStatus('success');
    } catch {
      setError('Network error. Please try again.');
      setStatus('ready');
    }
  }

  return (
    <html lang="fr">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex, nofollow" />
        <title>Configuration securisee - Lingullio</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0D1B2A;
            color: #F4F1EA;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
          }
          .container {
            width: 100%;
            max-width: 520px;
            background: #1B3A4B;
            border-radius: 16px;
            padding: 2.5rem;
            box-shadow: 0 25px 50px rgba(0,0,0,0.4);
          }
          .lock-icon {
            width: 48px;
            height: 48px;
            background: rgba(45,179,154,0.15);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
          }
          .lock-icon svg { width: 24px; height: 24px; color: #2DB39A; }
          h1 {
            font-size: 1.25rem;
            font-weight: 700;
            text-align: center;
            margin-bottom: 0.5rem;
          }
          .subtitle {
            font-size: 0.8125rem;
            color: rgba(244,241,234,0.6);
            text-align: center;
            margin-bottom: 2rem;
            line-height: 1.5;
          }
          .security-badges {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            justify-content: center;
            margin-bottom: 2rem;
          }
          .badge {
            font-size: 0.6875rem;
            padding: 0.25rem 0.75rem;
            border-radius: 100px;
            background: rgba(45,179,154,0.12);
            color: #2DB39A;
            font-weight: 500;
            border: 1px solid rgba(45,179,154,0.2);
          }
          .field { margin-bottom: 1.25rem; }
          label {
            display: block;
            font-size: 0.8125rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: rgba(244,241,234,0.85);
          }
          .hint {
            font-size: 0.6875rem;
            color: rgba(244,241,234,0.4);
            margin-top: 0.25rem;
          }
          input, textarea {
            width: 100%;
            padding: 0.75rem 1rem;
            background: rgba(13,27,42,0.6);
            border: 1px solid rgba(244,241,234,0.12);
            border-radius: 8px;
            color: #F4F1EA;
            font-family: 'SF Mono', 'Fira Code', monospace;
            font-size: 0.8125rem;
            transition: border-color 0.15s;
            -webkit-text-security: disc;
          }
          input:focus, textarea:focus {
            outline: none;
            border-color: #2DB39A;
            box-shadow: 0 0 0 3px rgba(45,179,154,0.15);
          }
          input.visible, textarea.visible {
            -webkit-text-security: none;
          }
          textarea {
            min-height: 64px;
            resize: vertical;
            line-height: 1.4;
          }
          .toggle-vis {
            background: none;
            border: none;
            color: rgba(244,241,234,0.5);
            font-size: 0.75rem;
            cursor: pointer;
            padding: 0.25rem 0;
            margin-top: 0.25rem;
          }
          .toggle-vis:hover { color: #2DB39A; }
          .error {
            background: rgba(220,38,38,0.1);
            border: 1px solid rgba(220,38,38,0.3);
            color: #FCA5A5;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-size: 0.8125rem;
            margin-bottom: 1rem;
          }
          .btn {
            width: 100%;
            padding: 0.875rem;
            background: #2DB39A;
            color: #0D1B2A;
            border: none;
            border-radius: 10px;
            font-size: 0.9375rem;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.15s;
          }
          .btn:hover { background: #25a08a; }
          .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .success-box {
            text-align: center;
            padding: 2rem 0;
          }
          .success-icon {
            width: 64px;
            height: 64px;
            background: rgba(45,179,154,0.15);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
          }
          .success-icon svg { width: 32px; height: 32px; color: #2DB39A; }
          .success-title { font-size: 1.125rem; font-weight: 700; margin-bottom: 0.75rem; }
          .success-text {
            font-size: 0.8125rem;
            color: rgba(244,241,234,0.6);
            line-height: 1.6;
          }
          .expired-box {
            text-align: center;
            padding: 2rem 0;
          }
          .expired-icon {
            width: 64px;
            height: 64px;
            background: rgba(230,184,74,0.15);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
          }
          .expired-icon svg { width: 32px; height: 32px; color: #E6B84A; }
          .separator {
            border: none;
            border-top: 1px solid rgba(244,241,234,0.08);
            margin: 1.5rem 0;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          {status === 'checking' && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <p>Verification...</p>
            </div>
          )}

          {status === 'expired' && (
            <div className="expired-box">
              <div className="expired-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-7a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="success-title">Configuration already done</p>
              <p className="success-text">
                The credentials have already been saved.<br />
                This page is no longer accessible.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="success-box">
              <div className="success-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="success-title">Credentials saved</p>
              <p className="success-text">
                Les informations Supabase ont ete ecrites dans le fichier de configuration serveur.<br />
                The access token for this page has been revoked.<br />
                Le serveur va redemarrer automatiquement.
              </p>
            </div>
          )}

          {(status === 'ready' || status === 'submitting') && (
            <>
              <div className="lock-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1>Configuration Supabase</h1>
              <p className="subtitle">
                Saisissez vos credentials Supabase ci-dessous.<br />
                Les valeurs sont envoyees directement au serveur via HTTPS et ecrites dans le fichier de configuration local. Elles ne sont jamais stockees dans le navigateur.
              </p>

              <div className="security-badges">
                <span className="badge">HTTPS uniquement</span>
                <span className="badge">Server write</span>
                <span className="badge">Token usage unique</span>
                <span className="badge">Pas de log</span>
                <span className="badge">autocomplete off</span>
              </div>

              <form onSubmit={handleSubmit} autoComplete="off">
                <div className="field">
                  <label htmlFor="setup-token">Token de securite</label>
                  <input
                    id="setup-token"
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                    autoComplete="off"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-form-type="other"
                    placeholder="Paste the provided token"
                    className={showKeys ? 'visible' : ''}
                  />
                  <p className="hint">The one-time token provided by the developer</p>
                </div>

                <hr className="separator" />

                <div className="field">
                  <label htmlFor="sb-url">Supabase URL</label>
                  <input
                    id="sb-url"
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    required
                    autoComplete="off"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-form-type="other"
                    placeholder="https://xxxx.supabase.co"
                    className={showKeys ? 'visible' : ''}
                  />
                  <p className="hint">Settings &gt; API &gt; Project URL</p>
                </div>

                <div className="field">
                  <label htmlFor="sb-anon">Anon Key (public)</label>
                  <textarea
                    id="sb-anon"
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    required
                    autoComplete="off"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-form-type="other"
                    placeholder="eyJhbGciOi..."
                    className={showKeys ? 'visible' : ''}
                    rows={2}
                  />
                  <p className="hint">Settings &gt; API &gt; Project API keys &gt; anon public</p>
                </div>

                <div className="field">
                  <label htmlFor="sb-service">Service Role Key (secret)</label>
                  <textarea
                    id="sb-service"
                    value={supabaseServiceRoleKey}
                    onChange={(e) => setSupabaseServiceRoleKey(e.target.value)}
                    required
                    autoComplete="off"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-form-type="other"
                    placeholder="eyJhbGciOi..."
                    className={showKeys ? 'visible' : ''}
                    rows={2}
                  />
                  <p className="hint">Settings &gt; API &gt; Project API keys &gt; service_role secret</p>
                </div>

                <button
                  type="button"
                  className="toggle-vis"
                  onClick={() => setShowKeys(!showKeys)}
                >
                  {showKeys ? 'Hide values' : 'Show values'}
                </button>

                {error && <div className="error">{error}</div>}

                <div style={{ marginTop: '1.5rem' }}>
                  <button
                    type="submit"
                    className="btn"
                    disabled={status === 'submitting'}
                  >
                    {status === 'submitting'
                      ? 'Saving...'
                      : 'Save credentials'}
                  </button>
                </div>
              </form>
            </>
          )}

          {status === 'error' && (
            <div className="expired-box">
              <p className="success-title">Verification error</p>
              <p className="success-text">
                Impossible de contacter le serveur. Rechargez la page.
              </p>
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
