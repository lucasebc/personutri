import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type ApiClient, createApiClient, normalizeBaseUrl } from '@personutri/shared';
import { deleteSecret, getSecret, setSecret } from './storage';

const URL_KEY = 'personutri:baseUrl';
const TOKEN_KEY = 'personutri:token';

interface SessionCtx {
  /** Terminou de ler o armazenamento. */
  ready: boolean;
  baseUrl: string | null;
  token: string | null;
  /** Servidor configurado (e, se a API exige, token informado). */
  configured: boolean;
  /** O servidor recusou o token (401). */
  unauthorized: boolean;
  client: ApiClient;
  save: (url: string, token: string | null) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children, initial }: { children: ReactNode; initial?: { baseUrl: string; token: string | null } }) {
  const [ready, setReady] = useState(!!initial);
  const [baseUrl, setBaseUrl] = useState<string | null>(initial?.baseUrl ?? null);
  const [token, setToken] = useState<string | null>(initial?.token ?? null);
  const [unauthorized, setUnauthorized] = useState(false);
  const ref = useRef({ baseUrl, token });
  ref.current = { baseUrl, token };

  useEffect(() => {
    if (initial) return;
    (async () => {
      const [u, t] = await Promise.all([AsyncStorage.getItem(URL_KEY), getSecret(TOKEN_KEY)]);
      setBaseUrl(u);
      setToken(t);
      setReady(true);
    })().catch(() => setReady(true));
  }, [initial]);

  const client = useMemo(
    () =>
      createApiClient({
        baseUrl: () => ref.current.baseUrl,
        token: () => ref.current.token,
        onUnauthorized: () => setUnauthorized(true),
      }),
    [],
  );

  const save = useCallback(async (url: string, tk: string | null) => {
    const normalized = normalizeBaseUrl(url);
    await AsyncStorage.setItem(URL_KEY, normalized);
    if (tk) await setSecret(TOKEN_KEY, tk.trim());
    else await deleteSecret(TOKEN_KEY);
    ref.current = { baseUrl: normalized, token: tk?.trim() || null };
    setBaseUrl(normalized);
    setToken(tk?.trim() || null);
    setUnauthorized(false);
  }, []);

  const logout = useCallback(async () => {
    await deleteSecret(TOKEN_KEY);
    ref.current = { ...ref.current, token: null };
    setToken(null);
    setUnauthorized(false);
  }, []);

  const value = useMemo<SessionCtx>(
    () => ({ ready, baseUrl, token, configured: !!baseUrl, unauthorized, client, save, logout }),
    [ready, baseUrl, token, unauthorized, client, save, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession fora do SessionProvider');
  return v;
}

export const useApi = () => useSession().client;
