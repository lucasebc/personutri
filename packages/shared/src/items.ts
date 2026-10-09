import type { Food, ItemInput, ItemView } from './types';

/** Valores por 100 g usados só na pré-visualização; o servidor recalcula tudo. */
export interface Per100 {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Linha editável de uma refeição/registro. */
export interface EditableItem {
  key: string;
  foodId: number;
  name: string;
  brand: string | null;
  grams: number;
  servingGrams: number | null;
  per100: Per100;
}

let seq = 0;
const newKey = () => `i${Date.now().toString(36)}${++seq}`;

export function fromFood(food: Food, grams?: number): EditableItem {
  return {
    key: newKey(),
    foodId: food.id,
    name: food.name,
    brand: food.brand,
    grams: grams ?? food.servingGrams ?? 100,
    servingGrams: food.servingGrams,
    per100: { kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat },
  };
}

/** Reconstrói os valores por 100 g a partir de um item já calculado pelo servidor. */
export function fromItemView(item: ItemView): EditableItem {
  const f = item.grams > 0 ? 100 / item.grams : 0;
  return {
    key: newKey(),
    foodId: item.foodId,
    name: item.foodName,
    brand: item.brand,
    grams: item.grams,
    servingGrams: null,
    per100: {
      kcal: item.nutrition.kcal * f,
      protein: item.nutrition.protein * f,
      carbs: item.nutrition.carbs * f,
      fat: item.nutrition.fat * f,
    },
  };
}

export const toInputs = (items: EditableItem[]): ItemInput[] => items.map((i) => ({ foodId: i.foodId, grams: i.grams }));

export function scalePer100(per100: Per100, grams: number): Per100 {
  const f = grams / 100;
  return { kcal: per100.kcal * f, protein: per100.protein * f, carbs: per100.carbs * f, fat: per100.fat * f };
}

export function totalsOf(items: Array<Pick<EditableItem, 'grams' | 'per100'>>): Per100 {
  const t: Per100 = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const i of items) {
    const s = scalePer100(i.per100, i.grams);
    t.kcal += s.kcal;
    t.protein += s.protein;
    t.carbs += s.carbs;
    t.fat += s.fat;
  }
  return t;
}

export const itemsAreValid = (items: EditableItem[]) => items.length > 0 && items.every((i) => Number.isFinite(i.grams) && i.grams >= 1 && i.grams <= 10000);
