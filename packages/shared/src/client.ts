/** Erro da API. `network` = não houve resposta (sem sinal, servidor fora do ar, timeout). */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public network = false,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ClientConfig {
  /** Ex.: "https://nutri.exemplo.com/api" (sem barra final). */
  baseUrl: () => string | null;
  token: () => string | null;
  /** Chamado em respostas 401 (token recusado). */
  onUnauthorized?: () => void;
  /** Chamado a cada requisição: true = o servidor respondeu; false = sem resposta (rede, servidor fora do ar, 502-504). */
  onNetworkResult?: (reachable: boolean) => void;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Chave de idempotência (a fila offline usa o id da operação). */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export function normalizeBaseUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (!/\/api$/i.test(url)) url = `${url}/api`;
  return url;
}

export function createApiClient(cfg: ClientConfig) {
  const doFetch = cfg.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const timeoutMs = cfg.timeoutMs ?? 15_000;

  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const base = cfg.baseUrl();
    if (!base) throw new ApiError('Servidor não configurado.', 0, false);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    const token = cfg.token();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    opts.signal?.addEventListener('abort', () => ctl.abort());
    let res: Response;
    try {
      res = await doFetch(`${base}${path}`, {
        method: opts.method ?? 'GET',
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: ctl.signal,
      });
    } catch {
      cfg.onNetworkResult?.(false);
      throw new ApiError('Sem conexão com o servidor.', 0, true);
    } finally {
      clearTimeout(timer);
    }
    cfg.onNetworkResult?.(!(res.status >= 502 && res.status <= 504));

    if (res.status === 401) {
      cfg.onUnauthorized?.();
      throw new ApiError('Token de acesso inválido ou ausente.', 401);
    }
    if (!res.ok) {
      let message = `Erro ${res.status}`;
      try {
        const body = (await res.json()) as { message?: string | string[] };
        message = Array.isArray(body.message) ? body.message.join('; ') : (body.message ?? message);
      } catch {
        /* sem corpo */
      }
      // 502/503/504 vêm do proxy quando a API caiu: tratar como falta de conexão (a fila tenta de novo)
      throw new ApiError(message, res.status, res.status >= 502 && res.status <= 504);
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  return {
    request,
    get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
    post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'POST', body }),
    put: <T>(path: string, body: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'PUT', body }),
    patch: <T>(path: string, body: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'PATCH', body }),
    del: (path: string, opts?: RequestOptions) => request<void>(path, { ...opts, method: 'DELETE' }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
