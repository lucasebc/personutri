import { ApiError } from '../client';
import type { ImportResult, WeightImportResult, WorkoutImportItem } from '../types';
import {
  buildWeightImports,
  buildWorkoutImport,
  dedupeSessions,
  type HcChangeResult,
  type HcSession,
  type HcSessionAggregates,
  lookbackStart,
  type WeightImportItem,
} from './sync';

/** O que o sincronizador precisa do Health Connect (implementado no app Android; nos testes, um falso). */
export interface HealthPort {
  sdkStatus(): Promise<'available' | 'update-required' | 'unavailable'>;
  hasReadPermissions(): Promise<boolean>;
  /** Token de mudanças "a partir de agora". */
  newChangesToken(): Promise<string>;
  changesSince(token: string): Promise<{ changes: HcChangeResult; nextToken: string; expired: boolean }>;
  /** Leitura completa de uma janela (primeira sincronização). */
  readWindow(from: Date, to: Date): Promise<HcChangeResult>;
  aggregates(session: HcSession): Promise<HcSessionAggregates>;
  typeName(exerciseType: number): string;
}

export interface SyncStore {
  getToken(): Promise<string | null>;
  setToken(token: string | null): Promise<void>;
}

/** Chamadas ao servidor PersoNutri. */
export interface SyncApi {
  importWorkouts(items: WorkoutImportItem[], deletedExternalIds: string[]): Promise<ImportResult>;
  importWeights(items: WeightImportItem[]): Promise<WeightImportResult>;
  latestWeightKg(): Promise<number | null>;
}

export type SyncOutcome =
  | {
      state: 'ok';
      at: string;
      /** primeira sincronização (janela de 30 dias) ou incremental */
      mode: 'initial' | 'incremental';
      workouts: { sent: number; created: number; updated: number; deleted: number; errors: number; estimatedFromTotal: number; withoutCalories: number };
      weights: { sent: number; created: number; updated: number; skippedManual: number };
    }
  | { state: 'unavailable' | 'update-required' | 'needs-permission' | 'offline' | 'error'; at: string; message: string };

export interface RunDeps {
  health: HealthPort;
  store: SyncStore;
  api: SyncApi;
  now?: () => Date;
  /** Apps de origem preferidos quando o mesmo treino chega de dois lugares. */
  preferredOrigins?: string[];
  lookbackDays?: number;
}

export async function runHealthSync(deps: RunDeps): Promise<SyncOutcome> {
  const now = (deps.now ?? (() => new Date()))();
  const at = now.toISOString();
  const fail = (state: Extract<SyncOutcome, { message: string }>['state'], message: string): SyncOutcome => ({ state, at, message });
  const { health, store, api } = deps;

  try {
    const status = await health.sdkStatus();
    if (status === 'unavailable') return fail('unavailable', 'O Health Connect não está disponível neste aparelho.');
    if (status === 'update-required') return fail('update-required', 'Atualize o app Health Connect para continuar.');
    if (!(await health.hasReadPermissions())) return fail('needs-permission', 'Permita a leitura de exercícios, calorias, distância, frequência cardíaca e peso.');

    let token = await store.getToken();
    let changes: HcChangeResult | null = null;
    let nextToken = '';
    let mode: 'initial' | 'incremental' = 'incremental';

    if (token) {
      const r = await health.changesSince(token);
      if (r.expired) token = null; // o token vence após ~30 dias sem uso: recomeça pela janela
      else {
        changes = r.changes;
        nextToken = r.nextToken;
      }
    }
    if (!token) {
      mode = 'initial';
      // o token é pedido ANTES de ler: o que chegar durante a leitura entra na próxima sincronização
      nextToken = await health.newChangesToken();
      changes = await health.readWindow(lookbackStart(now, deps.lookbackDays ?? 30), now);
    }

    const weightKg = await api.latestWeightKg().catch(() => null);
    const sessions = dedupeSessions(changes!.sessions, deps.preferredOrigins ?? []);
    const items: WorkoutImportItem[] = [];
    let estimatedFromTotal = 0;
    let withoutCalories = 0;
    for (const s of sessions) {
      const agg = await health.aggregates(s).catch((): HcSessionAggregates => ({}));
      const built = buildWorkoutImport(s, agg, { typeName: health.typeName(s.exerciseType), weightKg });
      if (!built) continue;
      items.push(built.item);
      if (built.kcalSource === 'total-minus-resting') estimatedFromTotal++;
      if (built.kcalSource === 'none') withoutCalories++;
    }

    const deleted = [...new Set(changes!.deletedIds)];
    const wres: ImportResult = items.length || deleted.length ? await api.importWorkouts(items, deleted) : { created: 0, updated: 0, deleted: 0, errors: [] };
    const weightItems = buildWeightImports(changes!.weights, changes!.fats);
    const weightRes: WeightImportResult = weightItems.length ? await api.importWeights(weightItems) : { created: 0, updated: 0, skippedManual: 0 };

    // só guarda o token depois que o servidor aceitou tudo: uma falha repete a leitura na próxima vez
    await store.setToken(nextToken);

    return {
      state: 'ok',
      at,
      mode,
      workouts: { sent: items.length, created: wres.created, updated: wres.updated, deleted: wres.deleted, errors: wres.errors.length, estimatedFromTotal, withoutCalories },
      weights: { sent: weightItems.length, ...weightRes },
    };
  } catch (e) {
    if (e instanceof ApiError && e.network) return fail('offline', 'Sem conexão com o servidor. A sincronização será tentada de novo.');
    return fail('error', (e as Error).message || 'Falha na sincronização.');
  }
}
