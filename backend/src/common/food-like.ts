import { Micros, Nutrition } from './nutrients';

export type FoodSource = 'taco' | 'off' | 'custom';

/** Forma mínima de um alimento (valores por 100 g). A entidade Food e o modo "só navegador" a satisfazem. */
export interface FoodLike {
  id: number;
  source: FoodSource;
  name: string;
  brand: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  micros: Micros;
}

export function foodNutrition(food: Pick<FoodLike, 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'micros'>): Nutrition {
  return {
    kcal: food.kcal,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    fiber: food.fiber ?? 0,
    micros: food.micros ?? {},
  };
}

export function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
