import { ActivityLevel, ActivityMode, BmrFormula, Sex } from './energy';

/** Formas puras (sem TypeORM) do perfil e das pesagens, compartilhadas com o modo "só navegador". */
export interface BodyProfileData {
  sex: Sex;
  birthDate: string; // YYYY-MM-DD
  heightCm: number;
  activityLevel: ActivityLevel;
  weeklyGoalKg: number;
  targetWeightKg: number | null;
  proteinPerKg: number;
  fatPercent: number;
  bmrFormula: BmrFormula;
  activityMode: ActivityMode;
}

export interface WeightEntryData {
  id: number;
  date: string;
  weightKg: number;
  bodyFatPct: number | null;
  waistCm: number | null;
  source?: 'manual' | 'device';
}
