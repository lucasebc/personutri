import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type BodySummary,
  createApiClient,
  type ImportResult,
  runHealthSync,
  type SyncApi,
  type SyncOutcome,
  type WeightImportResult,
} from '@personutri/shared';
import { HC_LAST_KEY, HC_TOKEN_KEY, TOKEN_KEY, URL_KEY } from '@/lib/keys';
import { getSecret, readJson, writeJson } from '@/lib/storage';
import { health } from './health';

/** Apps que gravam treinos do relógio: em caso de duplicata, vence o primeiro. */
const PREFERRED_ORIGINS = ['com.sec.android.app.shealth', 'com.samsung.android.shealth'];

/**
 * Sincroniza o Health Connect com o servidor. Funciona fora da interface (tarefa em segundo plano):
 * lê servidor e token direto do armazenamento.
 */
export async function syncNow(): Promise<SyncOutcome> {
  const at = new Date().toISOString();
  const port = health.port;
  if (!port) return { state: 'unavailable', at, message: 'Disponível apenas no app Android.' };

  const [baseUrl, token] = await Promise.all([AsyncStorage.getItem(URL_KEY), getSecret(TOKEN_KEY)]);
  if (!baseUrl) return { state: 'error', at, message: 'Servidor não configurado.' };
  const client = createApiClient({ baseUrl: () => baseUrl, token: () => token });

  const api: SyncApi = {
    importWorkouts: (items, deletedExternalIds) => client.post<ImportResult>('/workouts/import', { items, deletedExternalIds, source: 'device' }),
    importWeights: (items) => client.post<WeightImportResult>('/body/weights/import', { items }),
    latestWeightKg: async () => (await client.get<BodySummary>('/body')).latestWeight?.weightKg ?? null,
  };
  const store = {
    getToken: () => AsyncStorage.getItem(HC_TOKEN_KEY),
    setToken: (t: string | null) => (t ? AsyncStorage.setItem(HC_TOKEN_KEY, t) : AsyncStorage.removeItem(HC_TOKEN_KEY)),
  };

  const outcome = await runHealthSync({ health: port, store, api, preferredOrigins: PREFERRED_ORIGINS });
  await writeJson(HC_LAST_KEY, outcome);
  return outcome;
}

export const lastSync = () => readJson<SyncOutcome | null>(HC_LAST_KEY, null);
export const resetSyncState = () => AsyncStorage.removeItem(HC_TOKEN_KEY);
