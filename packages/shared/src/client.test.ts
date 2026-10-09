import { ApiError, createApiClient, normalizeBaseUrl } from './client';

function fakeFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return handler(url, init);
  }) as unknown as typeof fetch;
  return { impl, calls };
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('normalizeBaseUrl', () => {
  it('completa esquema e /api', () => {
    expect(normalizeBaseUrl('nutri.exemplo.com')).toBe('https://nutri.exemplo.com/api');
    expect(normalizeBaseUrl(' https://nutri.exemplo.com/ ')).toBe('https://nutri.exemplo.com/api');
    expect(normalizeBaseUrl('http://192.168.0.10:3001/api')).toBe('http://192.168.0.10:3001/api');
  });
});

describe('createApiClient', () => {
  const base = { baseUrl: () => 'https://x/api', token: () => 'tok' };

  it('envia token, corpo e Idempotency-Key', async () => {
    const f = fakeFetch(() => json({ id: 1 }, 201));
    const c = createApiClient({ ...base, fetchImpl: f.impl });
    const r = await c.post<{ id: number }>('/workouts', { a: 1 }, { idempotencyKey: 'op-1' });
    expect(r).toEqual({ id: 1 });
    const { url, init } = f.calls[0];
    expect(url).toBe('https://x/api/workouts');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":1}');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer tok', 'Idempotency-Key': 'op-1', 'Content-Type': 'application/json' });
  });

  it('204 devolve undefined', async () => {
    const c = createApiClient({ ...base, fetchImpl: fakeFetch(() => new Response(null, { status: 204 })).impl });
    await expect(c.del('/x')).resolves.toBeUndefined();
  });

  it('falha de rede vira ApiError network', async () => {
    const c = createApiClient({ ...base, fetchImpl: (async () => { throw new TypeError('fail'); }) as unknown as typeof fetch });
    await expect(c.get('/x')).rejects.toMatchObject({ network: true, status: 0 });
  });

  it('erro do servidor traz a mensagem (inclusive lista) e não é "network"', async () => {
    const c = createApiClient({ ...base, fetchImpl: fakeFetch(() => json({ message: ['a inválido', 'b inválido'] }, 400)).impl });
    const err = (await c.get('/x').catch((e) => e)) as ApiError;
    expect(err.message).toBe('a inválido; b inválido');
    expect(err.network).toBe(false);
    expect(err.status).toBe(400);
  });

  it('401 avisa a aplicação', async () => {
    const onUnauthorized = jest.fn();
    const c = createApiClient({ ...base, onUnauthorized, fetchImpl: fakeFetch(() => json({}, 401)).impl });
    await expect(c.get('/x')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('502/503/504 (proxy sem API) contam como sem conexão', async () => {
    const c = createApiClient({ ...base, fetchImpl: fakeFetch(() => new Response('bad gateway', { status: 502 })).impl });
    await expect(c.get('/x')).rejects.toMatchObject({ network: true });
  });

  it('sem servidor configurado falha de forma clara', async () => {
    const c = createApiClient({ baseUrl: () => null, token: () => null });
    await expect(c.get('/x')).rejects.toThrow('Servidor não configurado');
  });

  it('informa se o servidor está alcançável a cada requisição', async () => {
    const results: boolean[] = [];
    const ok = createApiClient({ ...base, onNetworkResult: (r) => results.push(r), fetchImpl: fakeFetch(() => json({})).impl });
    await ok.get('/x');
    const bad = createApiClient({ ...base, onNetworkResult: (r) => results.push(r), fetchImpl: fakeFetch(() => json({ message: 'x' }, 400)).impl });
    await bad.get('/x').catch(() => {}); // erro de validação: o servidor respondeu
    const down = createApiClient({ ...base, onNetworkResult: (r) => results.push(r), fetchImpl: (async () => { throw new TypeError('x'); }) as unknown as typeof fetch });
    await down.get('/x').catch(() => {});
    const gw = createApiClient({ ...base, onNetworkResult: (r) => results.push(r), fetchImpl: fakeFetch(() => new Response('', { status: 503 })).impl });
    await gw.get('/x').catch(() => {});
    expect(results).toEqual([true, true, false, false]);
  });
});
