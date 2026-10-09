'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { API_URL, authHeaders, setToken } from '@/lib/api';

type State = 'checking' | 'ok' | 'need';

/** Pede o token de acesso quando a API exige autenticação. Sem token configurado na API, não aparece. */
export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>('checking');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    try {
      const health = (await fetch(`${API_URL}/health`).then((r) => r.json())) as { authRequired?: boolean };
      if (!health.authRequired) return setState('ok');
      const res = await fetch(`${API_URL}/auth/check`, { headers: authHeaders() });
      setState(res.ok ? 'ok' : 'need');
    } catch {
      setState('ok'); // API fora do ar: as próprias telas mostram o erro de conexão
    }
  }, []);

  useEffect(() => {
    void check();
    const onUnauthorized = () => setState('need');
    window.addEventListener('personutri:unauthorized', onUnauthorized);
    return () => window.removeEventListener('personutri:unauthorized', onUnauthorized);
  }, [check]);

  if (state === 'ok') return <>{children}</>;
  if (state === 'checking') return <p className="py-20 text-center text-sm text-muted">Carregando…</p>;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-accent">PersoNutri</h1>
      <p className="text-sm text-muted">Esta instalação exige um token de acesso. Informe o token configurado no servidor (variável API_TOKENS).</p>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setToken(value);
          setError(null);
          await check();
          const res = await fetch(`${API_URL}/auth/check`, { headers: authHeaders() }).catch(() => null);
          if (!res?.ok) setError('Token recusado. Confira e tente de novo.');
        }}
      >
        <input type="password" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="Token de acesso" aria-label="Token de acesso" />
        {error && <p className="text-sm text-bad">{error}</p>}
        <button className="btn btn-primary" disabled={value.trim().length < 8}>
          Entrar
        </button>
      </form>
    </main>
  );
}
