import { addDays, dateRange, startOfWeek } from '../common/dates';
import { BodyProfile, WeightEntry } from '../body/body.entity';
import { KCAL_PER_KG } from '../body/energy';
import { energyOn } from '../body/energy-calculator';

export interface ForecastInput {
  today: string;
  profile: BodyProfile;
  weights: WeightEntry[];
  /** kcal consumidas (apenas registros "feitos") por data. Datas sem registro ficam de fora. */
  consumedKcal: Map<string, number>;
  weeksBack?: number;
  weeksAhead?: number;
}

export interface ForecastWeek {
  weekStart: string; // segunda-feira
  weekEnd: string;
  partial: boolean; // semana em andamento
  /** Média das pesagens da semana (null se não pesou). */
  measured: number | null;
  weighIns: number;
  /** Peso de partida da previsão (média medida da semana anterior, ou a previsão encadeada). */
  anchor: number | null;
  anchorType: 'measured' | 'predicted' | null;
  /** Peso médio previsto para a semana, a partir da âncora e do balanço calórico. */
  predicted: number | null;
  /** measured - predicted: positivo = pesou mais do que o previsto. */
  error: number | null;
  /** Trajetória ideal pela meta semanal do perfil. */
  goal: number | null;
  avgIntake: number | null;
  intakeSource: 'logged' | 'plan';
  loggedDays: number;
  tdee: number | null;
}

export interface ForecastProjection {
  weekStart: string;
  predicted: number;
  goal: number | null;
}

export type ForecastResult =
  | { ready: false; reason: 'no-profile' | 'no-weights' }
  | {
      ready: true;
      weeks: ForecastWeek[];
      projection: ForecastProjection[];
      summary: {
        measuredChangePerWeek: number | null;
        predictedChangePerWeek: number | null;
        meanAbsError: number | null;
        /** Gasto diário "real" estimado a partir do que foi comido e do peso que de fato variou. */
        calibratedTdee: number | null;
        calibratedWeeks: number;
        targetWeightKg: number | null;
        weeklyGoalKg: number;
      };
    };

const r2 = (v: number) => Math.round(v * 100) / 100;
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Peso-meta pode limitar a trajetória: não passa do alvo. */
function clampToTarget(weight: number, profile: BodyProfile): number {
  const t = profile.targetWeightKg;
  if (t == null) return weight;
  return profile.weeklyGoalKg < 0 ? Math.max(weight, t) : profile.weeklyGoalKg > 0 ? Math.min(weight, t) : weight;
}

export function computeForecast(input: ForecastInput): ForecastResult {
  const { today, profile, weights, consumedKcal } = input;
  const weeksBack = input.weeksBack ?? 12;
  const weeksAhead = input.weeksAhead ?? 4;
  if (!weights.length) return { ready: false, reason: 'no-weights' };

  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const firstWeek = startOfWeek(sorted[0].date);
  const currentWeek = startOfWeek(today);
  const startWeek = [firstWeek, addDays(currentWeek, -7 * (weeksBack - 1))].sort().pop()!;

  const weekMeasured = (weekStart: string) => {
    const end = addDays(weekStart, 6);
    const inWeek = sorted.filter((w) => w.date >= weekStart && w.date <= end);
    return { avg: inWeek.length ? mean(inWeek.map((w) => w.weightKg)) : null, count: inWeek.length };
  };

  // "Semana semente": a anterior à primeira exibida, usada só como âncora.
  let prevMeasured: number | null = weekMeasured(addDays(startWeek, -7)).avg;
  if (prevMeasured === null && startWeek > firstWeek) {
    const before = sorted.filter((w) => w.date < startWeek).pop();
    prevMeasured = before?.weightKg ?? null;
  }
  let prevPredicted: number | null = null;

  const weeks: ForecastWeek[] = [];
  let baseline: number | null = null;

  for (let ws = startWeek; ws <= currentWeek; ws = addDays(ws, 7)) {
    const we = addDays(ws, 6);
    const { avg: measured, count } = weekMeasured(ws);
    const partial = we > today;

    const anchor: number | null = prevMeasured ?? prevPredicted;
    const anchorType: ForecastWeek['anchorType'] = anchor === null ? null : prevMeasured !== null ? 'measured' : 'predicted';

    // O dia de hoje ainda não acabou: o consumo parcial dele distorceria a média, então só contam dias encerrados.
    const days = dateRange(ws, partial ? addDays(today, -1) : we);
    const logged = days.map((d) => consumedKcal.get(d) ?? 0).filter((k) => k > 0);

    let predicted: number | null = null;
    let avgIntake: number | null = null;
    let tdee: number | null = null;
    let intakeSource: ForecastWeek['intakeSource'] = logged.length ? 'logged' : 'plan';
    if (anchor !== null) {
      const energy = energyOn(ws, profile, weights, anchor);
      if (energy) {
        tdee = energy.tdee;
        avgIntake = logged.length ? mean(logged) : energy.targetKcal;
        predicted = anchor + (7 * (avgIntake - energy.tdee)) / KCAL_PER_KG;
      }
    }

    if (baseline === null) baseline = measured ?? anchor;
    const idx = weeks.length;
    const goal = baseline === null ? null : clampToTarget(baseline + idx * profile.weeklyGoalKg, profile);

    weeks.push({
      weekStart: ws,
      weekEnd: we,
      partial,
      measured: measured === null ? null : r2(measured),
      weighIns: count,
      anchor: anchor === null ? null : r2(anchor),
      anchorType,
      predicted: predicted === null ? null : r2(predicted),
      error: measured !== null && predicted !== null ? r2(measured - predicted) : null,
      goal: goal === null ? null : r2(goal),
      avgIntake: avgIntake === null ? null : Math.round(avgIntake),
      intakeSource,
      loggedDays: logged.length,
      tdee: tdee === null ? null : Math.round(tdee),
    });

    prevMeasured = measured;
    prevPredicted = predicted ?? (measured !== null ? null : prevPredicted);
  }

  // Projeção: a partir do último peso conhecido, com a ingestão recente (ou a meta, se pouco registro).
  const last = [...weeks].reverse().find((w) => w.measured !== null || w.predicted !== null)!;
  let projWeight = last.measured ?? last.predicted!;
  const recentLogged = dateRange(addDays(today, -14), addDays(today, -1))
    .map((d) => consumedKcal.get(d) ?? 0)
    .filter((k) => k > 0);
  const projection: ForecastProjection[] = [];
  for (let k = 1; k <= weeksAhead; k++) {
    const ws = addDays(currentWeek, 7 * k);
    const energy = energyOn(ws, profile, weights, projWeight);
    if (!energy) break;
    const intake = recentLogged.length >= 3 ? mean(recentLogged) : energy.targetKcal;
    projWeight += (7 * (intake - energy.tdee)) / KCAL_PER_KG;
    const goalIdx = weeks.length - 1 + k;
    const goalBase = baseline === null ? null : clampToTarget(baseline + goalIdx * profile.weeklyGoalKg, profile);
    projection.push({ weekStart: ws, predicted: r2(projWeight), goal: goalBase === null ? null : r2(goalBase) });
  }

  // Resumo
  const complete = weeks.filter((w) => !w.partial);
  const both = complete.filter((w) => w.error !== null);
  const lastTwo = complete.filter((w) => w.measured !== null).slice(-2);
  const measuredChangePerWeek =
    lastTwo.length === 2 ? r2((lastTwo[1].measured! - lastTwo[0].measured!) / ((Date.parse(lastTwo[1].weekStart) - Date.parse(lastTwo[0].weekStart)) / (7 * 86_400_000))) : null;
  const lastPred = [...complete].reverse().find((w) => w.predicted !== null && w.anchor !== null);
  const predictedChangePerWeek = lastPred ? r2(lastPred.predicted! - lastPred.anchor!) : null;

  // TDEE calibrado: só semanas completas com âncora medida, peso medido e >= 4 dias registrados.
  const calibratable = complete
    .filter((w) => w.anchorType === 'measured' && w.measured !== null && w.loggedDays >= 4 && w.avgIntake !== null)
    .slice(-4);
  const calibratedTdee = calibratable.length
    ? Math.round(mean(calibratable.map((w) => w.avgIntake! - ((w.measured! - w.anchor!) * KCAL_PER_KG) / 7)))
    : null;

  return {
    ready: true,
    weeks,
    projection,
    summary: {
      measuredChangePerWeek,
      predictedChangePerWeek,
      meanAbsError: both.length ? r2(mean(both.map((w) => Math.abs(w.error!)))) : null,
      calibratedTdee,
      calibratedWeeks: calibratable.length,
      targetWeightKg: profile.targetWeightKg,
      weeklyGoalKg: profile.weeklyGoalKg,
    },
  };
}

