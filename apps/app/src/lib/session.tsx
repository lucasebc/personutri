import { useNetInfo } from '@react-native-community/netinfo';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type ApiClient, createApiClient, normalizeBaseUrl } from '@personutri/shared';
import { TOKEN_KEY, URL_KEY } from './keys';
import { deleteSecret, getSecret, setSecret } from './storage';


interface SessionCtx {
  /** Terminou de ler o armazenamento. */
  ready: boolean;
  baseUrl: string | null;
  token: string | null;
  /** Servidor configurado (e, se a API exige, token informado). */
  configured: boolean;
  /** O servidor recusou o token (401). */
  unauthorized: boolean;
  /**
   * O servidor respondeu à última requisição? `null` = ainda não se sabe. É a fonte da verdade para "online":
   * o NetInfo só serve de gatilho (ele erra em alguns ambientes).
   */
  reachable: boolean | null;
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
  const [reachable, setReachable] = useState<boolean | null>(null);
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
        onNetworkResult: (ok) => setReachable((prev) => (prev === ok ? prev : ok)),
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

  // Sondagem: enquanto o servidor não responde, pergunta de novo a cada 15 s (rota pública e barata).
  const probe = useCallback(() => {
    if (ref.current.baseUrl) client.get('/health').catch(() => {});
  }, [client]);
  useEffect(() => {
    if (reachable !== false) return;
    const t = setInterval(probe, 15_000);
    return () => clearInterval(t);
  }, [reachable, probe]);

  // O NetInfo apenas antecipa: ao perder a rede marca como inacessível; ao ganhar, sonda na hora.
  const net = useNetInfo();
  useEffect(() => {
    if (net.isConnected === false) setReachable(false);
    else if (net.isConnected === true) probe();
  }, [net.isConnected, probe]);

  const value = useMemo<SessionCtx>(
    () => ({ ready, baseUrl, token, configured: !!baseUrl, unauthorized, reachable, client, save, logout }),
    [ready, baseUrl, token, unauthorized, reachable, client, save, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession fora do SessionProvider');
  return v;
}

export const useApi = () => useSession().client;
