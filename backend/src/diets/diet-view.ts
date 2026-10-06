import { totalOf } from '../common/item-view';
import { addNutrition, emptyNutrition, Nutrition, roundNutrition } from '../common/nutrients';
import { MealLike, mealView } from '../meals/meal-view';

export interface DietLike {
  id: number;
  name: string;
  active: boolean;
  entries: Array<{ id: number; label: string; time: string; weekdays: number[]; meal: MealLike }>;
}

export function dietView(diet: DietLike) {
  const entries = [...diet.entries]
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((e) => ({ id: e.id, label: e.label, time: e.time, weekdays: e.weekdays, meal: mealView(e.meal) }));

  // Totais por dia da semana (0 = domingo)
  const byWeekday = Array.from({ length: 7 }, (_, wd) => {
    let sum: Nutrition = emptyNutrition();
    for (const e of diet.entries) {
      if (e.weekdays.includes(wd)) sum = addNutrition(sum, totalOf(e.meal.items));
    }
    return { weekday: wd, totals: roundNutrition(sum) };
  });
  const daysWithMeals = byWeekday.filter((d) => d.totals.kcal > 0);
  const averageKcal = daysWithMeals.length
    ? Math.round(daysWithMeals.reduce((s, d) => s + d.totals.kcal, 0) / daysWithMeals.length)
    : 0;

  return { id: diet.id, name: diet.name, active: diet.active, entries, byWeekday, averageKcal };
}
