import {
  aggregateRecord,
  ExerciseType,
  getChanges,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  type Permission,
  type ReadRecordsOptions,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import {
  buildWorkoutImport,
  type HcBodyFat,
  type HcChangeResult,
  type HcSession,
  type HcSessionAggregates,
  type HcWeight,
  type HealthPort,
} from '@personutri/shared';
import type { DiagnosticSession, HealthNative, PermissionState } from './health.types';

/** Dados que o PersoNutri lê. */
const READ_TYPES = ['ExerciseSession', 'ActiveCaloriesBurned', 'TotalCaloriesBurned', 'Distance', 'HeartRate', 'Weight', 'BodyFat'] as const;
const READ_PERMISSIONS: Permission[] = READ_TYPES.map((recordType) => ({ accessType: 'read', recordType }));
const BACKGROUND = { accessType: 'read', recordType: 'BackgroundAccessPermission' } as const;
const HISTORY = { accessType: 'read', recordType: 'ReadHealthDataHistory' } as const;
const CHANGE_TYPES = ['ExerciseSession', 'Weight', 'BodyFat'] as const;

let initialized = false;
async function ensureInit(): Promise<boolean> {
  if (initialized) return true;
  try {
    initialized = await initialize();
  } catch {
    initialized = false;
  }
  return initialized;
}

const exerciseTypeName = (n: number): string => Object.entries(ExerciseType).find(([, v]) => v === n)?.[0] ?? 'OTHER_WORKOUT';

async function permissionState(): Promise<PermissionState> {
  if (!(await ensureInit())) return { read: false, background: false, history: false };
  const granted = (await getGrantedPermissions().catch(() => [])) as Array<{ accessType: string; recordType: string }>;
  const has = (recordType: string) => granted.some((g) => g.accessType === 'read' && g.recordType === recordType);
  return {
    read: READ_TYPES.every(has),
    background: has('BackgroundAccessPermission'),
    history: has('ReadHealthDataHistory'),
  };
}

async function requestPermissions(): Promise<PermissionState> {
  if (!(await ensureInit())) return permissionState();
  await requestPermission(READ_PERMISSIONS).catch(() => []);
  // extras pedidos à parte: recusar segundo plano/histórico não pode derrubar a leitura básica
  await requestPermission([BACKGROUND]).catch(() => []);
  await requestPermission([HISTORY]).catch(() => []);
  return permissionState();
}

async function readAll(recordType: (typeof READ_TYPES)[number], from: Date, to: Date): Promise<any[]> {
  const out: any[] = [];
  let pageToken: string | undefined;
  do {
    const options: ReadRecordsOptions = { timeRangeFilter: { operator: 'between', startTime: from.toISOString(), endTime: to.toISOString() }, pageSize: 500, pageToken };
    const r = await readRecords(recordType, options);
    out.push(...r.records);
    pageToken = r.pageToken;
  } while (pageToken);
  return out;
}

const toSession = (r: any): HcSession | null =>
  r?.metadata?.id
    ? {
        id: r.metadata.id,
        startTime: r.startTime,
        endTime: r.endTime,
        startOffsetSeconds: r.startZoneOffset?.totalSeconds ?? null,
        exerciseType: r.exerciseType,
        title: r.title ?? null,
        dataOrigin: r.metadata.dataOrigin ?? null,
      }
    : null;
const toWeight = (r: any): HcWeight | null => (r?.weight?.inKilograms ? { time: r.time, offsetSeconds: r.zoneOffset?.totalSeconds ?? null, kg: r.weight.inKilograms } : null);
const toFat = (r: any): HcBodyFat | null => (typeof r?.percentage === 'number' ? { time: r.time, offsetSeconds: r.zoneOffset?.totalSeconds ?? null, percentage: r.percentage } : null);
const compact = <T>(list: Array<T | null>): T[] => list.filter((x): x is T => x !== null);

async function readWindow(from: Date, to: Date): Promise<HcChangeResult> {
  const [sessions, weights, fats] = await Promise.all([readAll('ExerciseSession', from, to), readAll('Weight', from, to), readAll('BodyFat', from, to)]);
  return { sessions: compact(sessions.map(toSession)), weights: compact(weights.map(toWeight)), fats: compact(fats.map(toFat)), deletedIds: [] };
}

async function aggregates(s: HcSession): Promise<HcSessionAggregates> {
  const timeRangeFilter = { operator: 'between' as const, startTime: s.startTime, endTime: s.endTime };
  const safe = async <T>(fn: () => Promise<T>): Promise<T | null> => fn().catch(() => null);
  const [active, total, dist, hr] = await Promise.all([
    safe(() => aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter })),
    safe(() => aggregateRecord({ recordType: 'TotalCaloriesBurned', timeRangeFilter })),
    safe(() => aggregateRecord({ recordType: 'Distance', timeRangeFilter })),
    safe(() => aggregateRecord({ recordType: 'HeartRate', timeRangeFilter })),
  ]);
  return {
    activeKcal: (active as any)?.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? null,
    totalKcal: (total as any)?.ENERGY_TOTAL?.inKilocalories ?? null,
    distanceM: (dist as any)?.DISTANCE?.inMeters ?? null,
    avgHeartRate: (hr as any)?.BPM_AVG ?? null,
  };
}

const port: HealthPort = {
  async sdkStatus() {
    const s = await getSdkStatus();
    return s === SdkAvailabilityStatus.SDK_AVAILABLE ? ((await ensureInit()) ? 'available' : 'unavailable') : s === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED ? 'update-required' : 'unavailable';
  },
  async hasReadPermissions() {
    return (await permissionState()).read;
  },
  async newChangesToken() {
    // sem token, o getChanges abre um novo "a partir de agora" e devolve o próximo token
    const r = await getChanges({ recordTypes: [...CHANGE_TYPES] });
    return r.nextChangesToken;
  },
  async changesSince(token) {
    const changes: HcChangeResult = { sessions: [], weights: [], fats: [], deletedIds: [] };
    let current = token;
    for (let i = 0; i < 50; i++) {
      const r = await getChanges({ changesToken: current });
      if (r.changesTokenExpired) return { changes, nextToken: current, expired: true };
      for (const { record } of r.upsertionChanges) {
        const rec = record as any;
        if (rec.recordType === 'ExerciseSession') {
          const s = toSession(rec);
          if (s) changes.sessions.push(s);
        } else if (rec.recordType === 'Weight') {
          const w = toWeight(rec);
          if (w) changes.weights.push(w);
        } else if (rec.recordType === 'BodyFat') {
          const f = toFat(rec);
          if (f) changes.fats.push(f);
        }
      }
      changes.deletedIds.push(...r.deletionChanges.map((d) => d.recordId));
      current = r.nextChangesToken;
      if (!r.hasMore) break;
    }
    return { changes, nextToken: current, expired: false };
  },
  readWindow,
  aggregates,
  typeName: exerciseTypeName,
};

export const health: HealthNative = {
  supported: true,
  port,
  permissionState,
  requestPermissions,
  openHealthConnect: () => openHealthConnectSettings(),
  async diagnostics(days) {
    const now = new Date();
    const status = await port.sdkStatus().catch((): 'unavailable' => 'unavailable');
    const permissions = await permissionState();
    const base = { generatedAt: now.toISOString(), sdkStatus: status, permissions, days, sessions: [] as DiagnosticSession[], origins: [] as string[], weights: 0, bodyFat: 0 };
    if (status !== 'available' || !permissions.read) return base;

    const w = await readWindow(new Date(now.getTime() - days * 86_400_000), now);
    const origins = new Set<string>();
    for (const s of w.sessions) {
      const agg = await aggregates(s);
      const built = buildWorkoutImport(s, agg, { typeName: exerciseTypeName(s.exerciseType) });
      if (s.dataOrigin) origins.add(s.dataOrigin);
      base.sessions.push({
        id: s.id,
        type: exerciseTypeName(s.exerciseType),
        title: s.title ?? null,
        origin: s.dataOrigin ?? null,
        start: s.startTime,
        durationMin: Math.round((Date.parse(s.endTime) - Date.parse(s.startTime)) / 6000) / 10,
        activeKcal: agg.activeKcal != null ? Math.round(agg.activeKcal) : null,
        totalKcal: agg.totalKcal != null ? Math.round(agg.totalKcal) : null,
        distanceKm: agg.distanceM ? Math.round(agg.distanceM / 10) / 100 : null,
        avgHeartRate: agg.avgHeartRate ? Math.round(agg.avgHeartRate) : null,
        send: built?.item ?? null,
        kcalSource: built?.kcalSource ?? null,
      });
    }
    return { ...base, origins: [...origins], weights: w.weights.length, bodyFat: w.fats.length };
  },
};
