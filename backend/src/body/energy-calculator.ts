import { ageOn } from '../common/dates';
import { BodyProfile, WeightEntry } from './body.entity';
import { bmr, macroTargets, targetKcal, tdee } from './energy';

export interface EnergyOn {
  date: string;
  weightKg: number;
  bodyFatPct: number | null;
  age: number;
  bmr: number;
  tdee: number;
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
  const total = tdee(basal, profile.activityLevel);
  const target = targetKcal(total, profile.weeklyGoalKg);
  return {
    date,
    weightKg,
    bodyFatPct,
    age,
    bmr: basal,
    tdee: total,
    targetKcal: target,
    macros: macroTargets({ kcal: target, weightKg, proteinPerKg: profile.proteinPerKg, fatPercent: profile.fatPercent }),
  };
}
