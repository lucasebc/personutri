import type { WorkoutImportItem } from '../types';

/** Formas mínimas dos registros do Health Connect (independentes da biblioteca nativa, para testar em Node). */
export interface HcSession {
  id: string;
  startTime: string; // ISO
  endTime: string;
  startOffsetSeconds?: number | null;
  exerciseType: number;
  title?: string | null;
  dataOrigin?: string | null;
}

export interface HcSessionAggregates {
  activeKcal?: number | null;
  totalKcal?: number | null;
  distanceM?: number | null;
  avgHeartRate?: number | null;
}

export interface HcWeight {
  time: string;
  offsetSeconds?: number | null;
  kg: number;
}
export interface HcBodyFat {
  time: string;
  offsetSeconds?: number | null;
  percentage: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Data e hora locais de um instante, dado o deslocamento (do registro, ou do aparelho se ausente). */
export function localDateTime(iso: string, offsetSeconds?: number | null, deviceOffsetMinutes = -new Date().getTimezoneOffset()) {
  const offset = offsetSeconds ?? deviceOffsetMinutes * 60;
  const d = new Date(Date.parse(iso) + offset * 1000);
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  };
}

export interface BuildOptions {
  /** Nome da constante ExerciseType (ex.: "RUNNING"), resolvido pelo adaptador nativo. */
  typeName: string;
  /** Peso do dia, para derivar calorias ativas quando só há "totais". */
  weightKg?: number | null;
  deviceOffsetMinutes?: number;
}

export interface BuiltWorkout {
  item: WorkoutImportItem;
  /** De onde vieram as calorias enviadas. */
  kcalSource: 'active' | 'total-minus-resting' | 'none';
}

/**
 * Converte uma sessão de exercício (+ agregados do mesmo intervalo) no item de importação do servidor.
 * Calorias: preferência pelas ativas; se só houver totais, descontamos o repouso (1 kcal/kg/h, a mesma
 * convenção do servidor); sem nenhuma, o servidor calcula por MET.
 */
export function buildWorkoutImport(session: HcSession, agg: HcSessionAggregates, opts: BuildOptions): BuiltWorkout | null {
  const ms = Date.parse(session.endTime) - Date.parse(session.startTime);
  if (!Number.isFinite(ms) || ms < 60_000) return null; // menos de 1 minuto: ruído
  const durationMin = Math.round(Math.min(ms / 60_000, 1440) * 10) / 10;
  const { date, time } = localDateTime(session.startTime, session.startOffsetSeconds, opts.deviceOffsetMinutes);

  const item: WorkoutImportItem = { externalId: session.id, date, time, exerciseType: opts.typeName, durationMin };

  const title = session.title?.trim();
  if (title) item.title = title.slice(0, 100);
  if (agg.distanceM && agg.distanceM > 0) item.distanceKm = Math.round((agg.distanceM / 1000) * 100) / 100;
  if (agg.avgHeartRate && agg.avgHeartRate >= 30 && agg.avgHeartRate <= 250) item.avgHeartRate = Math.round(agg.avgHeartRate);

  let kcalSource: BuiltWorkout['kcalSource'] = 'none';
  if (agg.activeKcal && agg.activeKcal > 0) {
    item.deviceActiveKcal = Math.round(agg.activeKcal);
    kcalSource = 'active';
  } else if (agg.totalKcal && agg.totalKcal > 0 && opts.weightKg && opts.weightKg > 0) {
    const net = agg.totalKcal - opts.weightKg * (durationMin / 60);
    if (net > 0) {
      item.deviceActiveKcal = Math.round(net);
      kcalSource = 'total-minus-resting';
    }
  }
  return { item, kcalSource };
}

/**
 * O mesmo treino pode chegar de dois apps (Samsung Health e outro). Considera duplicata a sessão do mesmo
 * tipo que cobre ≥ 80% da mais curta; fica a de origem preferida e, na falta, a mais longa.
 */
export function dedupeSessions(sessions: HcSession[], preferredOrigins: string[] = []): HcSession[] {
  const sorted = [...sessions].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  const kept: HcSession[] = [];
  const rank = (s: HcSession) => {
    const i = preferredOrigins.indexOf(s.dataOrigin ?? '');
    return i === -1 ? preferredOrigins.length : i;
  };
  const length = (s: HcSession) => Date.parse(s.endTime) - Date.parse(s.startTime);
  for (const s of sorted) {
    const dupIdx = kept.findIndex((k) => {
      if (k.exerciseType !== s.exerciseType) return false;
      const overlap = Math.min(Date.parse(k.endTime), Date.parse(s.endTime)) - Math.max(Date.parse(k.startTime), Date.parse(s.startTime));
      return overlap > 0 && overlap >= 0.8 * Math.min(length(k), length(s));
    });
    if (dupIdx === -1) kept.push(s);
    else {
      const k = kept[dupIdx];
      if (rank(s) < rank(k) || (rank(s) === rank(k) && length(s) > length(k))) kept[dupIdx] = s;
    }
  }
  return kept;
}

export interface WeightImportItem {
  date: string;
  weightKg: number;
  bodyFatPct?: number | null;
}

/** Uma pesagem por dia (a mais tardia), com a gordura corporal do mesmo dia quando houver. */
export function buildWeightImports(weights: HcWeight[], fats: HcBodyFat[], deviceOffsetMinutes?: number): WeightImportItem[] {
  const latestWeight = new Map<string, { t: number; kg: number }>();
  for (const w of weights) {
    if (!(w.kg >= 20 && w.kg <= 400)) continue;
    const { date } = localDateTime(w.time, w.offsetSeconds, deviceOffsetMinutes);
    const t = Date.parse(w.time);
    const cur = latestWeight.get(date);
    if (!cur || t > cur.t) latestWeight.set(date, { t, kg: w.kg });
  }
  const latestFat = new Map<string, { t: number; pct: number }>();
  for (const f of fats) {
    if (!(f.percentage >= 2 && f.percentage <= 70)) continue;
    const { date } = localDateTime(f.time, f.offsetSeconds, deviceOffsetMinutes);
    const t = Date.parse(f.time);
    const cur = latestFat.get(date);
    if (!cur || t > cur.t) latestFat.set(date, { t, pct: f.percentage });
  }
  return [...latestWeight.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, w]) => ({ date, weightKg: Math.round(w.kg * 10) / 10, bodyFatPct: latestFat.get(date)?.pct ?? null }));
}

export interface HcChangeResult {
  sessions: HcSession[];
  weights: HcWeight[];
  fats: HcBodyFat[];
  deletedIds: string[];
}

/** Janela do primeiro sync (ou após o token de changes expirar). */
export function lookbackStart(now: Date, days = 30): Date {
  return new Date(now.getTime() - days * 86_400_000);
}
