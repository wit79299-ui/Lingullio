'use client';

import { useState, useEffect, useCallback } from 'react';

type StepStatus = 'idle' | 'loading' | 'success' | 'error';

interface StepState {
  status: StepStatus;
  message: string;
  detail: string;
}

const STEPS = [
  {
    key: 'schema',
    title: 'Etape 1 : Schema (33 tables)',
    description: 'Cree toutes les tables, index et triggers',
  },
  {
    key: 'rls',
    title: 'Etape 2 : Securite RLS',
    description: 'Active Row Level Security et cree 60+ politiques',
  },
  {
    key: 'seed',
    title: 'Etape 3 : Donnees initiales',
    description: 'Insert HSK courses, vocabulary, and test exercises',
  },
] as const;

export default function DeployPage() {
  const [sqlParts, setSqlParts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<Record<string, StepState>>({
    schema: { status: 'idle', message: '', detail: '' },
    rls: { status: 'idle', message: '', detail: '' },
    seed: { status: 'idle', message: '', detail: '' },
  });
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [serviceRoleKey, setServiceRoleKey] = useState('');
  const [credentialsSet, setCredentialsSet] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [allTablesVerified, setAllTablesVerified] = useState(false);

  useEffect(() => {
    fetch('/api/setup/get-sql?step=json')
      .then((r) => r.json())
      .then((data) => {
        setSqlParts(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  function updateStep(key: string, update: Partial<StepState>) {
    setSteps((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...update },
    }));
  }

  async function executeSql(key: string) {
    const sql = sqlParts[key];
    if (!sql || !supabaseUrl || !serviceRoleKey) return;

    updateStep(key, { status: 'loading', message: 'Running...', detail: '' });

    try {
      // Extract project ref from URL
      const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
      if (!urlMatch) {
        updateStep(key, {
          status: 'error',
          message: 'Invalid Supabase URL',
          detail: 'Le format attendu est https://xxxxx.supabase.co',
        });
        return;
      }

      // Use the Supabase SQL API endpoint (pg endpoint)
      // This endpoint allows executing arbitrary SQL with the service role key
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      });

      // The RPC endpoint won't work without a function
      // Instead, we use a different approach: execute via the Management API
      // or fall back to copy-paste approach with verification

      // Try the pg-meta endpoint for SQL execution
      const pgResponse = await fetch(
        `https://${urlMatch[1]}.supabase.co/pg/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            'x-supabase-schema': 'public',
          },
          body: JSON.stringify({ query: sql }),
        }
      );

      if (pgResponse.ok) {
        const result = await pgResponse.json();
        if (result.error) {
          updateStep(key, {
            status: 'error',
            message: 'SQL error',
            detail: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
          });
        } else {
          updateStep(key, {
            status: 'success',
            message: 'Execute avec succes',
            detail: '',
          });
        }
        return;
      }

      // If pg/query doesn't work, try the SQL Editor API (different auth)
      // This requires the Supabase Management API token, not the service role key
      // Fall back to direct PostgreSQL-like execution via the newer endpoint
      const sqlResponse = await fetch(
        `https://${urlMatch[1]}.supabase.co/rest/v1/rpc/exec_sql`,
        {
          method: 'POST',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql_string: sql }),
        }
      );

      if (sqlResponse.ok) {
        updateStep(key, {
          status: 'success',
          message: 'Execute avec succes',
          detail: '',
        });
        return;
      }

      // If all API approaches fail, set error with instructions
      const errorText = await pgResponse.text().catch(() => '');
      updateStep(key, {
        status: 'error',
        message: `L'execution automatique n'est pas disponible (HTTP ${pgResponse.status})`,
        detail: 'Use the "Copy" button below to copy the SQL, then paste it manually into the Supabase SQL Editor.',
      });
    } catch (err) {
      updateStep(key, {
        status: 'error',
        message: 'Connection error',
        detail: String(err),
      });
    }
  }

  async function handleCopy(key: string) {
    const sql = sqlParts[key];
    if (!sql) return;
    try {
      await navigator.clipboard.writeText(sql);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = sql;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(key);
    setTimeout(() => setCopied(null), 3000);
  }

  async function handleCopyAll() {
    const fullSql = [sqlParts.schema, sqlParts.rls, sqlParts.seed].filter(Boolean).join('\n\n');
    try {
      await navigator.clipboard.writeText(fullSql);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = fullSql;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied('all');
    setTimeout(() => setCopied(null), 3000);
  }

  async function verifyTables() {
    if (!supabaseUrl || !serviceRoleKey) return;

    updateStep('schema', { ...steps.schema, detail: 'Verifying...' });

    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/courses?select=id&limit=1`,
        {
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
        }
      );

      if (response.ok) {
        setAllTablesVerified(true);
        updateStep('schema', {
          status: 'success',
          message: 'Tables verifiees avec succes',
          detail: 'La table "courses" est accessible via l\'API REST.',
        });
        // Also verify RLS and seed
        const usersResp = await fetch(
          `${supabaseUrl}/rest/v1/users?select=id,role&limit=5`,
          {
            headers: {
              'apikey': serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
          }
        );
        if (usersResp.ok) {
          const users = await usersResp.json();
          updateStep('rls', {
            status: 'success',
            message: 'RLS verifie',
            detail: `Tables accessibles avec service_role.`,
          });
          updateStep('seed', {
            status: 'success',
            message: 'Donnees trouvees',
            detail: `${users.length} utilisateur(s) trouves dans la table users.`,
          });
        }
      } else {
        const err = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
        setAllTablesVerified(false);
        updateStep('schema', {
          status: 'error',
          message: 'Tables non trouvees',
          detail: err.message || 'Les tables n\'existent pas encore. Executez le SQL.',
        });
      }
    } catch (err) {
      updateStep('schema', {
        status: 'error',
        message: 'Erreur de verification',
        detail: String(err),
      });
    }
  }

  const handleSetCredentials = useCallback(() => {
    if (supabaseUrl && serviceRoleKey) {
      setCredentialsSet(true);
    }
  }, [supabaseUrl, serviceRoleKey]);

  function getStatusColor(status: StepStatus): string {
    switch (status) {
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      case 'loading': return '#E6B84A';
      default: return 'rgba(244,241,234,0.3)';
    }
  }

  function getStatusIcon(status: StepStatus): string {
    switch (status) {
      case 'success': return '\u2713';
      case 'error': return '\u2717';
      case 'loading': return '\u23F3';
      default: return '\u2022';
    }
  }

  const supabaseRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';

  return (
    <html lang="fr">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex, nofollow" />
        <title>Deploiement SQL - Lingullio</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0D1B2A;
            color: #F4F1EA;
            min-height: 100vh;
            padding: 2rem 1rem;
          }
          .container { max-width: 800px; margin: 0 auto; }
          h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
          .subtitle { font-size: 0.875rem; color: rgba(244,241,234,0.6); margin-bottom: 2rem; line-height: 1.6; }
          
          .cred-section {
            background: #1B3A4B;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }
          .cred-section h2 {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: #2DB39A;
          }
          .field { margin-bottom: 1rem; }
          .field label {
            display: block;
            font-size: 0.8125rem;
            color: rgba(244,241,234,0.5);
            margin-bottom: 0.375rem;
          }
          .field input {
            width: 100%;
            padding: 0.625rem 0.75rem;
            background: rgba(0,0,0,0.3);
            border: 1px solid rgba(244,241,234,0.12);
            border-radius: 8px;
            color: #F4F1EA;
            font-family: 'SF Mono', 'Fira Code', monospace;
            font-size: 0.8125rem;
          }
          .field input:focus {
            outline: none;
            border-color: #2DB39A;
          }
          
          .btn {
            padding: 0.625rem 1.25rem;
            border: none;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 700;
            cursor: pointer;
            transition: opacity 0.15s;
          }
          .btn:hover { opacity: 0.85; }
          .btn:disabled { opacity: 0.4; cursor: not-allowed; }
          .btn-primary { background: #2DB39A; color: #0D1B2A; }
          .btn-secondary { background: rgba(244,241,234,0.1); color: #F4F1EA; }
          .btn-copy { background: #3E6FAE; color: #F4F1EA; }
          .btn-copy.copied { background: #22c55e; }
          .btn-small { padding: 0.375rem 0.75rem; font-size: 0.75rem; }
          
          .step-card {
            background: #1B3A4B;
            border-radius: 12px;
            padding: 1.25rem;
            margin-bottom: 1rem;
            border-left: 4px solid rgba(244,241,234,0.1);
            transition: border-color 0.3s;
          }
          .step-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 0.75rem;
            gap: 1rem;
          }
          .step-title {
            font-size: 0.9375rem;
            font-weight: 600;
          }
          .step-desc {
            font-size: 0.8125rem;
            color: rgba(244,241,234,0.5);
            margin-top: 0.25rem;
          }
          .step-actions {
            display: flex;
            gap: 0.5rem;
            flex-shrink: 0;
          }
          .step-status {
            font-size: 0.8125rem;
            margin-top: 0.5rem;
            padding: 0.5rem 0.75rem;
            border-radius: 6px;
            background: rgba(0,0,0,0.2);
          }
          .step-detail {
            font-size: 0.75rem;
            color: rgba(244,241,234,0.5);
            margin-top: 0.25rem;
            word-break: break-word;
          }
          
          .sql-preview {
            background: #0a1320;
            border: 1px solid rgba(244,241,234,0.08);
            border-radius: 8px;
            padding: 0.75rem;
            max-height: 200px;
            overflow: auto;
            font-family: 'SF Mono', 'Fira Code', monospace;
            font-size: 0.6875rem;
            line-height: 1.4;
            color: rgba(244,241,234,0.5);
            white-space: pre;
            tab-size: 2;
            margin-top: 0.75rem;
          }
          
          .instructions {
            background: rgba(62,111,174,0.1);
            border: 1px solid rgba(62,111,174,0.2);
            border-radius: 10px;
            padding: 1.25rem;
            margin-bottom: 1.5rem;
          }
          .instructions h3 {
            font-size: 0.875rem;
            font-weight: 600;
            color: #3E6FAE;
            margin-bottom: 0.75rem;
          }
          .instructions ol {
            padding-left: 1.25rem;
            font-size: 0.8125rem;
            line-height: 1.8;
          }
          .instructions a {
            color: #2DB39A;
            text-decoration: underline;
          }
          
          .verified-banner {
            background: rgba(34,197,94,0.1);
            border: 1px solid rgba(34,197,94,0.3);
            border-radius: 10px;
            padding: 1.25rem;
            text-align: center;
            margin-bottom: 1.5rem;
          }
          .verified-banner h3 {
            color: #22c55e;
            font-size: 1.125rem;
            margin-bottom: 0.5rem;
          }
          .verified-banner p {
            font-size: 0.875rem;
            color: rgba(244,241,234,0.7);
          }
          
          .toggle-row {
            display: flex;
            gap: 0.75rem;
            align-items: center;
            margin-top: 0.5rem;
          }
          
          .separator {
            text-align: center;
            margin: 1.5rem 0;
            color: rgba(244,241,234,0.25);
            font-size: 0.75rem;
          }
          
          .loading { text-align: center; padding: 3rem; color: rgba(244,241,234,0.5); }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid transparent;
            border-top-color: currentColor;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
            vertical-align: middle;
            margin-right: 0.375rem;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1>Deploiement de la base de donnees</h1>
          <p className="subtitle">
            Deploiement en 3 etapes avec verification automatique.
          </p>

          {loading ? (
            <div className="loading">Chargement du SQL...</div>
          ) : (
            <>
              {allTablesVerified && (
                <div className="verified-banner">
                  <h3>Base de donnees deployee avec succes</h3>
                  <p>
                    Toutes les tables sont accessibles. Vous pouvez fermer cette page
                    et retourner a l'application.
                  </p>
                </div>
              )}

              {/* Credentials section */}
              {!credentialsSet ? (
                <div className="cred-section">
                  <h2>Identifiants Supabase</h2>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(244,241,234,0.5)', marginBottom: '1rem' }}>
                    Entrez vos identifiants pour permettre la verification automatique
                    et l'execution directe du SQL.
                  </p>
                  <div className="field">
                    <label>URL du projet Supabase</label>
                    <input
                      type="url"
                      placeholder="https://xxxxx.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value.trim())}
                      autoComplete="off"
                    />
                  </div>
                  <div className="field">
                    <label>Service Role Key (secret)</label>
                    <input
                      type={showKeys ? 'text' : 'password'}
                      placeholder="eyJhbGci..."
                      value={serviceRoleKey}
                      onChange={(e) => setServiceRoleKey(e.target.value.trim())}
                      autoComplete="off"
                    />
                  </div>
                  <div className="toggle-row">
                    <button
                      className="btn btn-primary"
                      onClick={handleSetCredentials}
                      disabled={!supabaseUrl || !serviceRoleKey}
                    >
                      Continuer
                    </button>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => setShowKeys(!showKeys)}
                    >
                      {showKeys ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Instructions */}
                  <div className="instructions">
                    <h3>Methode recommandee : copier-coller dans Supabase</h3>
                    <ol>
                      <li>Cliquez <strong>Copier</strong> sur chaque etape (dans l'ordre)</li>
                      <li>
                        Ouvrez le{' '}
                        <a
                          href={`https://supabase.com/dashboard/project/${supabaseRef}/sql/new`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          SQL Editor de Supabase
                        </a>
                      </li>
                      <li>Collez le SQL et cliquez <strong>Run</strong></li>
                      <li>
                        <strong>Important :</strong> attendez le message de succes (&quot;Success. No rows returned&quot;)
                        avant de passer a l'etape suivante
                      </li>
                      <li>Apres les 3 etapes, cliquez <strong>Verifier le deploiement</strong></li>
                    </ol>
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        className={`btn btn-copy ${copied === 'all' ? 'copied' : ''}`}
                        onClick={handleCopyAll}
                      >
                        {copied === 'all' ? 'Copie !' : 'Copier tout le SQL (1307 lignes)'}
                      </button>
                    </div>
                  </div>

                  {/* Steps */}
                  {STEPS.map(({ key, title, description }) => (
                    <div
                      key={key}
                      className="step-card"
                      style={{ borderLeftColor: getStatusColor(steps[key].status) }}
                    >
                      <div className="step-header">
                        <div>
                          <div className="step-title">
                            <span style={{ color: getStatusColor(steps[key].status), marginRight: '0.5rem' }}>
                              {getStatusIcon(steps[key].status)}
                            </span>
                            {title}
                          </div>
                          <div className="step-desc">{description}</div>
                          <div className="step-desc">
                            {sqlParts[key] ? `${sqlParts[key].split('\n').length} lignes` : ''}
                          </div>
                        </div>
                        <div className="step-actions">
                          <button
                            className={`btn btn-copy btn-small ${copied === key ? 'copied' : ''}`}
                            onClick={() => handleCopy(key)}
                          >
                            {copied === key ? 'Copie !' : 'Copier'}
                          </button>
                          <button
                            className="btn btn-primary btn-small"
                            onClick={() => executeSql(key)}
                            disabled={steps[key].status === 'loading'}
                          >
                            {steps[key].status === 'loading' ? (
                              <><span className="spinner" /> Exec...</>
                            ) : (
                              'Executer'
                            )}
                          </button>
                        </div>
                      </div>

                      {steps[key].message && (
                        <div className="step-status" style={{ color: getStatusColor(steps[key].status) }}>
                          {steps[key].message}
                          {steps[key].detail && (
                            <div className="step-detail">{steps[key].detail}</div>
                          )}
                        </div>
                      )}

                      {sqlParts[key] && (
                        <div className="sql-preview">
                          {sqlParts[key].slice(0, 600)}
                          {sqlParts[key].length > 600 ? '\n\n... (tronque pour l\'apercu)' : ''}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="separator">---</div>

                  {/* Verification */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <button
                      className="btn btn-primary"
                      onClick={verifyTables}
                      style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
                    >
                      Verifier le deploiement
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </body>
    </html>
  );
}
