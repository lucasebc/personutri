import { KCAL_PER_G } from '../common/nutrients';

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'athlete';
export type BmrFormula = 'mifflin' | 'katch';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // pouco ou nenhum exercício
  light: 1.375, // 1–3 dias/semana
  moderate: 1.55, // 3–5 dias/semana
  high: 1.725, // 6–7 dias/semana
  athlete: 1.9, // treino intenso / trabalho físico
};

/** Energia aproximada de 1 kg de massa corporal (kcal). */
export const KCAL_PER_KG = 7700;

export interface BmrInput {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  bodyFatPct?: number | null;
  formula?: BmrFormula;
}

/** Taxa metabólica basal (kcal/dia). Mifflin-St Jeor, ou Katch-McArdle se houver % de gordura. */
export function bmr(i: BmrInput): number {
  if (i.formula === 'katch' && i.bodyFatPct != null && i.bodyFatPct > 0 && i.bodyFatPct < 100) {
    const leanMass = i.weightKg * (1 - i.bodyFatPct / 100);
    return 370 + 21.6 * leanMass;
  }
  const base = 10 * i.weightKg + 6.25 * i.heightCm - 5 * i.age;
  return i.sex === 'male' ? base + 5 : base - 161;
}

export function tdee(bmrKcal: number, activity: ActivityLevel): number {
  return bmrKcal * ACTIVITY_FACTORS[activity];
}

/** Meta calórica diária para atingir `weeklyGoalKg` (negativo = emagrecer). */
export function targetKcal(tdeeKcal: number, weeklyGoalKg: number): number {
  return tdeeKcal + (weeklyGoalKg * KCAL_PER_KG) / 7;
}

export interface MacroTargetInput {
  kcal: number;
  weightKg: number;
  proteinPerKg: number;
  fatPercent: number;
}

/** Proteína por kg, gordura por % das kcal, carboidrato = restante. */
export function macroTargets(i: MacroTargetInput) {
  const protein = i.proteinPerKg * i.weightKg;
  const fat = (i.kcal * (i.fatPercent / 100)) / KCAL_PER_G.fat;
  const carbs = Math.max(0, (i.kcal - protein * KCAL_PER_G.protein - fat * KCAL_PER_G.fat) / KCAL_PER_G.carbs);
  return { protein, fat, carbs };
}
