export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('Não foi possível conectar à API. O backend está rodando?', 0);
  }
  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.join('; ') : body.message || message;
    } catch {
      /* resposta sem corpo */
    }
    throw new ApiError(message, res.status);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
export const put = <T>(path: string, body: unknown) => api<T>(path, { method: 'PUT', body: JSON.stringify(body) });
export const patch = <T>(path: string, body: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const del = (path: string) => api<void>(path, { method: 'DELETE' });

// ---------- Tipos ----------

export type MicroKey =
  | 'sugars' | 'saturatedFat' | 'cholesterol' | 'sodium' | 'potassium' | 'calcium' | 'magnesium'
  | 'phosphorus' | 'iron' | 'zinc' | 'copper' | 'manganese' | 'vitaminA' | 'vitaminC' | 'thiamin'
  | 'riboflavin' | 'vitaminB6' | 'niacin';

export interface Nutrition {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  micros: Partial<Record<MicroKey, number>>;
}

export interface Food {
  id: number;
  source: 'taco' | 'off' | 'custom';
  name: string;
  brand: string | null;
  category: string | null;
  barcode: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  micros: Partial<Record<MicroKey, number>>;
  servingGrams: number | null;
  servingLabel: string | null;
}

export interface FoodSearch {
  foods: Food[];
  offError?: string;
}

export interface ItemView {
  id: number;
  foodId: number;
  foodName: string;
  brand: string | null;
  source: Food['source'];
  grams: number;
  nutrition: Nutrition;
}

export interface ItemInput {
  foodId: number;
  grams: number;
}

export interface Meal {
  id: number;
  name: string;
  notes: string | null;
  items: ItemView[];
  totals: Nutrition;
}

export interface DietEntry {
  id: number;
  label: string;
  time: string;
  weekdays: number[];
  meal: Meal;
}

export interface Diet {
  id: number;
  name: string;
  active: boolean;
  entries: DietEntry[];
  byWeekday: { weekday: number; totals: Nutrition }[];
  averageKcal: number;
}

export interface DiaryEntry {
  id: number;
  date: string;
  time: string | null;
  label: string;
  kind: 'planned' | 'free';
  status: 'pending' | 'done' | 'skipped';
  mealId: number | null;
  items: ItemView[];
  totals: Nutrition;
}

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'athlete';

export interface BodyProfile {
  sex: 'male' | 'female';
  birthDate: string;
  heightCm: number;
  activityLevel: ActivityLevel;
  weeklyGoalKg: number;
  targetWeightKg: number | null;
  proteinPerKg: number;
  fatPercent: number;
  bmrFormula: 'mifflin' | 'katch';
}

export interface WeightEntry {
  id: number;
  date: string;
  weightKg: number;
  bodyFatPct: number | null;
  waistCm: number | null;
}

export interface BodySummary {
  profile: BodyProfile | null;
  weights: WeightEntry[];
  latestWeight: WeightEntry | null;
  bmi: number | null;
  energy: {
    weightKg: number;
    age: number;
    bmr: number;
    tdee: number;
    targetKcal: number;
    macros: { protein: number; carbs: number; fat: number };
  } | null;
}

export interface Balance {
  vsTdee: number;
  vsTarget: number;
  status: 'deficit' | 'surplus' | 'maintenance';
  weeklyKg: number;
}

export interface Dashboard {
  date: string;
  hasProfile: boolean;
  hasWeight: boolean;
  energy: { weightKg: number; bmr: number; tdee: number; targetKcal: number } | null;
  targets: { kcal: number; protein: number; carbs: number; fat: number } | null;
  consumed: Nutrition;
  pending: Nutrition;
  projected: Nutrition;
  balance: Balance | null;
  projectedBalance: Balance | null;
  remainingKcal: number | null;
  macros: Record<'protein' | 'carbs' | 'fat' | 'fiber', { consumed: number; target: number | null; pct: number | null; kcalPct?: number }>;
  micros: { key: MicroKey; label: string; unit: string; amount: number | null; reference: number; kind: 'min' | 'max'; pct: number | null }[];
  meals: { id: number; time: string | null; label: string; kind: 'planned' | 'free'; status: DiaryEntry['status']; kcal: number }[];
  mealsDone: number;
  mealsTotal: number;
  week: { date: string; consumed: number; tdee: number | null; target: number | null }[];
}

export interface ForecastWeek {
  weekStart: string;
  weekEnd: string;
  partial: boolean;
  measured: number | null;
  weighIns: number;
  anchor: number | null;
  anchorType: 'measured' | 'predicted' | null;
  predicted: number | null;
  error: number | null;
  goal: number | null;
  avgIntake: number | null;
  intakeSource: 'logged' | 'plan';
  loggedDays: number;
  tdee: number | null;
}

export type Forecast =
  | { ready: false; reason: 'no-profile' | 'no-weights' }
  | {
      ready: true;
      weeks: ForecastWeek[];
      projection: { weekStart: string; predicted: number; goal: number | null }[];
      summary: {
        measuredChangePerWeek: number | null;
        predictedChangePerWeek: number | null;
        meanAbsError: number | null;
        calibratedTdee: number | null;
        calibratedWeeks: number;
        targetWeightKg: number | null;
        weeklyGoalKg: number;
      };
    };
