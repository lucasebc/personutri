import { ApiError } from '../client';
import type { ImportResult } from '../types';
import { type HealthPort, runHealthSync, type SyncApi, type SyncStore } from './runner';
import type { HcChangeResult, HcSession } from './sync';

const session = (id: string, over: Partial<HcSession> = {}): HcSession => ({
  id, startTime: '2026-10-06T10:00:00Z', endTime: '2026-10-06T10:45:00Z', startOffsetSeconds: -10800, exerciseType: 56, title: 'Corrida', dataOrigin: 'com.sec.android.app.shealth', ...over,
});
const empty = (): HcChangeResult => ({ sessions: [], weights: [], fats: [], deletedIds: [] });

function fakes(opts: { token?: string | null; changes?: HcChangeResult; window?: HcChangeResult; expired?: boolean; status?: 'available' | 'update-required' | 'unavailable'; perms?: boolean; importErr?: Error } = {}) {
  const calls: string[] = [];
  let token = opts.token ?? null;
  const health: HealthPort = {
    sdkStatus: async () => opts.status ?? 'available',
    hasReadPermissions: async () => opts.perms ?? true,
    newChangesToken: async () => (calls.push('newToken'), 'T-NEW'),
    changesSince: async (t) => (calls.push(`since:${t}`), { changes: opts.changes ?? empty(), nextToken: 'T-NEXT', expired: !!opts.expired }),
    readWindow: async () => (calls.push('window'), opts.window ?? empty()),
    aggregates: async (s) => (calls.push(`agg:${s.id}`), { activeKcal: 400, distanceM: 6000, avgHeartRate: 150 }),
    typeName: (n) => (n === 56 ? 'RUNNING' : n === 79 ? 'WALKING' : 'OTHER_WORKOUT'),
  };
  const store: SyncStore = { getToken: async () => token, setToken: async (t) => void (token = t) };
  const sent: { items: any[]; deleted: string[]; weights: any[] } = { items: [], deleted: [], weights: [] };
  const api: SyncApi = {
    importWorkouts: async (items, deleted) => {
      if (opts.importErr) throw opts.importErr;
      sent.items.push(...items);
      sent.deleted.push(...deleted);
      return { created: items.length, updated: 0, deleted: deleted.length, errors: [] } as ImportResult;
    },
    importWeights: async (items) => (sent.weights.push(...items), { created: items.length, updated: 0, skippedManual: 0 }),
    latestWeightKg: async () => 80,
  };
  return { health, store, api, calls, sent, getToken: () => token };
}

const NOW = () => new Date('2026-10-09T12:00:00Z');

describe('runHealthSync', () => {
  it('sem Health Connect / sem permissão não sincroniza nada', async () => {
    expect((await runHealthSync({ ...fakes({ status: 'unavailable' }), now: NOW })).state).toBe('unavailable');
    expect((await runHealthSync({ ...fakes({ status: 'update-required' }), now: NOW })).state).toBe('update-required');
    const f = fakes({ perms: false });
    expect(await runHealthSync({ ...f, now: NOW })).toMatchObject({ state: 'needs-permission' });
    expect(f.calls).toEqual([]);
  });

  it('primeira vez: pede o token ANTES de ler a janela, envia e guarda o token', async () => {
    const f = fakes({ window: { ...empty(), sessions: [session('a')] } });
    const r = await runHealthSync({ ...f, now: NOW });
    expect(f.calls.slice(0, 2)).toEqual(['newToken', 'window']);
    expect(r).toMatchObject({ state: 'ok', mode: 'initial', workouts: { sent: 1, created: 1 } });
    expect(f.sent.items[0]).toMatchObject({ externalId: 'a', exerciseType: 'RUNNING', durationMin: 45, deviceActiveKcal: 400, distanceKm: 6, avgHeartRate: 150, date: '2026-10-06', time: '07:00' });
    expect(f.getToken()).toBe('T-NEW');
  });

  it('incremental: usa o token, envia remoções e atualiza o token', async () => {
    const f = fakes({ token: 'T-OLD', changes: { ...empty(), sessions: [session('b', { exerciseType: 79 })], deletedIds: ['gone', 'gone'] } });
    const r = await runHealthSync({ ...f, now: NOW });
    expect(f.calls).toContain('since:T-OLD');
    expect(f.calls).not.toContain('window');
    expect(r).toMatchObject({ state: 'ok', mode: 'incremental', workouts: { sent: 1, deleted: 1 } });
    expect(f.sent.deleted).toEqual(['gone']);
    expect(f.getToken()).toBe('T-NEXT');
  });

  it('token vencido: recomeça pela janela de 30 dias', async () => {
    const f = fakes({ token: 'T-OLD', expired: true, window: { ...empty(), sessions: [session('c')] } });
    const r = await runHealthSync({ ...f, now: NOW });
    expect(r).toMatchObject({ state: 'ok', mode: 'initial' });
    expect(f.getToken()).toBe('T-NEW');
  });

  it('servidor fora do ar: não avança o token (a leitura se repete depois)', async () => {
    const f = fakes({ token: 'T-OLD', changes: { ...empty(), sessions: [session('d')] }, importErr: new ApiError('x', 0, true) });
    const r = await runHealthSync({ ...f, now: NOW });
    expect(r.state).toBe('offline');
    expect(f.getToken()).toBe('T-OLD');
  });

  it('erro inesperado vira mensagem, sem derrubar nem avançar o token', async () => {
    const f = fakes({ token: 'T-OLD', changes: { ...empty(), sessions: [session('e')] }, importErr: new Error('boom') });
    expect(await runHealthSync({ ...f, now: NOW })).toMatchObject({ state: 'error', message: 'boom' });
    expect(f.getToken()).toBe('T-OLD');
  });

  it('o mesmo treino de dois apps é enviado uma vez; pesagens e gordura vão juntas', async () => {
    const dup = session('x2', { dataOrigin: 'com.google.android.apps.fitness', endTime: '2026-10-06T10:46:00Z' });
    const f = fakes({
      window: { sessions: [session('x1'), dup], weights: [{ time: '2026-10-06T10:00:00Z', offsetSeconds: -10800, kg: 81.2 }], fats: [{ time: '2026-10-06T10:01:00Z', offsetSeconds: -10800, percentage: 20.5 }], deletedIds: [] },
    });
    const r = await runHealthSync({ ...f, now: NOW, preferredOrigins: ['com.sec.android.app.shealth'] });
    expect(f.sent.items.map((i) => i.externalId)).toEqual(['x1']);
    expect(f.sent.weights).toEqual([{ date: '2026-10-06', weightKg: 81.2, bodyFatPct: 20.5 }]);
    expect(r).toMatchObject({ weights: { sent: 1, created: 1 } });
  });

  it('nada novo: não chama o servidor, mas avança o token', async () => {
    const f = fakes({ token: 'T-OLD' });
    const r = await runHealthSync({ ...f, now: NOW });
    expect(r).toMatchObject({ state: 'ok', workouts: { sent: 0 } });
    expect(f.sent.items).toEqual([]);
    expect(f.getToken()).toBe('T-NEXT');
  });
});
