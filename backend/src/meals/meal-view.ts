import { ItemLike, totalOf, viewItem } from '../common/item-view';
import { roundNutrition } from '../common/nutrients';

export interface MealLike {
  id: number;
  name: string;
  notes: string | null;
  items: ItemLike[];
}

export function mealView(meal: MealLike) {
  return {
    id: meal.id,
    name: meal.name,
    notes: meal.notes,
    items: meal.items.map(viewItem),
    totals: roundNutrition(totalOf(meal.items)),
  };
}
