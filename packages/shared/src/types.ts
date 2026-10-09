/**
 * Tipos da API.
 *
 * Os formatos calculados no backend são derivados das próprias funções (import type): mudou o backend, o
 * compilador acusa aqui. Os que vêm direto das entidades (Food, Activity, pesagens) são escritos à mão.
 */
import type { computeBodySummary } from '../../../backend/src/body/body-summary';
import type { BodyProfileData } from '../../../backend/src/body/body.types';
import type { ActivityLevel, ActivityMode, BmrFormula, Sex } from '../../../backend/src/body/energy';
import type { Micros, MicroKey, Nutrition } from '../../../backend/src/common/nutrients';
import type { computeDashboard } from '../../../backend/src/dashboard/dashboard';
import type { diaryEntryView } from '../../../backend/src/diary/diary-view';
import type { dietView } from '../../../backend/src/diets/diet-view';
import type { WorkoutView } from '../../../backend/src/exercise/workout-view';
import type { workoutTotals } from '../../../backend/src/exercise/workout-view';
import type { ForecastResult } from '../../../backend/src/forecast/forecast';
import type { ItemView } from '../../../backend/src/common/item-view';
import type { mealView } from '../../../backend/src/meals/meal-view';

export type { ActivityLevel, ActivityMode, BmrFormula, Sex, Micros, MicroKey, Nutrition, ItemView, ForecastResult };

export type Dashboard = ReturnType<typeof computeDashboard>;
export type BodySummary = ReturnType<typeof computeBodySummary>;
export type Meal = ReturnType<typeof mealView>;
export type Diet = ReturnType<typeof dietView>;
export type DiaryEntry = ReturnType<typeof diaryEntryView>;
export type Workout = WorkoutView;
export type WorkoutDay = { date: string; workouts: Workout[]; totals: ReturnType<typeof workoutTotals> };
export type BodyProfile = BodyProfileData;

export type FoodSource = 'taco' | 'off' | 'custom';

export interface Food {
  id: number;
  source: FoodSource;
  name: string;
  brand: string | null;
  category: string | null;
  barcode: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  micros: Micros;
  servingGrams: number | null;
  servingLabel: string | null;
}

export interface FoodSearch {
  foods: Food[];
  offError?: string;
}

export type CalcMode = 'met' | 'walk' | 'run' | 'cycle';

export interface Activity {
  id: number;
  name: string;
  category: string;
  calcMode: CalcMode;
  met: number | null;
  builtin: boolean;
}

export interface WeightEntry {
  id: number;
  date: string;
  weightKg: number;
  bodyFatPct: number | null;
  waistCm: number | null;
  source?: 'manual' | 'device';
}

export interface CalorieEstimate {
  weightKg: number | null;
  met: number | null;
  speedKmh: number | null;
  grossKcal: number | null;
  netKcal: number | null;
}

export interface ItemInput {
  foodId: number;
  grams: number;
}

export interface HealthResponse {
  status: 'ok';
  time: string;
  authRequired: boolean;
}

export interface ImportResult {
  created: number;
  updated: number;
  deleted: number;
  errors: Array<{ index: number; message: string }>;
}

export interface WeightImportResult {
  created: number;
  updated: number;
  skippedManual: number;
}

/** Item enviado a POST /workouts/import (ver backend ImportWorkoutDto). */
export interface WorkoutImportItem {
  externalId: string;
  date: string;
  time?: string;
  exerciseType?: string;
  durationMin: number;
  distanceKm?: number;
  avgHeartRate?: number;
  deviceActiveKcal?: number;
  title?: string;
}
