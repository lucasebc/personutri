import { ageOn } from '../common/dates';
import { BodyProfileData as BodyProfile, WeightEntryData as WeightEntry } from './body.types';
import { bmr, macroTargets, targetKcal, tdee } from './energy';

export interface EnergyOn {
  date: string;
  weightKg: number;
  bodyFatPct: number | null;
  age: number;
  bmr: number;
  /** Gasto total do dia: base + exercícios (quando o modo é `tracked`). */
  tdee: number;
  /** Gasto sem os treinos registrados. */
  baseTdee: number;
  /** Calorias líquidas de treino somadas ao gasto (0 no modo `level`). */
  exerciseKcal: number;
  targetKcal: number;
  macros: { protein: number; carbs: number; fat: number };
}

/** Peso vigente numa data: última pesagem até a data; se não houver, a primeira registrada. */
export function weightOn(date: string, weights: WeightEntry[]): WeightEntry | null {
  if (!weights.length) return null;
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  let current: WeightEntry | null = null;
  for (const w of sorted) {
    if (w.date <= date) current = w;
    else break;
  }
  return current ?? sorted[0];
}

/** Gasto energético e metas de uma data, com base no perfil e no peso vigente. */
export function energyOn(
  date: string,
  profile: BodyProfile,
  weights: WeightEntry[],
  overrideWeightKg?: number,
  /** Calorias líquidas (acima do repouso) dos treinos do dia; só contam no modo `tracked`. */
  exerciseKcal = 0,
): EnergyOn | null {
  const w = weightOn(date, weights);
  const weightKg = overrideWeightKg ?? w?.weightKg;
  if (weightKg === undefined) return null;
  const bodyFatPct = overrideWeightKg === undefined ? (w?.bodyFatPct ?? null) : null;
  const age = ageOn(profile.birthDate, date);
  const basal = bmr({
    sex: profile.sex,
    weightKg,
    heightCm: profile.heightCm,
    age,
    bodyFatPct,
    formula: profile.bmrFormula,
  });
  const base = tdee(basal, profile.activityLevel);
  const applied = profile.activityMode === 'tracked' ? Math.max(0, exerciseKcal) : 0;
  const total = base + applied;
  const target = targetKcal(total, profile.weeklyGoalKg);
  return {
    date,
    weightKg,
    bodyFatPct,
    age,
    bmr: basal,
    tdee: total,
    baseTdee: base,
    exerciseKcal: applied,
    targetKcal: target,
    macros: macroTargets({ kcal: target, weightKg, proteinPerKg: profile.proteinPerKg, fatPercent: profile.fatPercent }),
  };
}
