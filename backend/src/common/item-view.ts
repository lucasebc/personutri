import { FoodLike, foodNutrition } from './food-like';
import { Nutrition, roundNutrition, scaleNutrition, sumNutrition } from './nutrients';

/** Item (alimento + quantidade) de uma refeição ou do diário. */
export interface ItemLike {
  id: number;
  grams: number;
  food: FoodLike;
}

export interface ItemView {
  id: number;
  foodId: number;
  foodName: string;
  brand: string | null;
  source: FoodLike['source'];
  grams: number;
  nutrition: Nutrition;
}

export function itemNutrition(item: Pick<ItemLike, 'grams' | 'food'>): Nutrition {
  return scaleNutrition(foodNutrition(item.food), item.grams);
}

export function viewItem(item: ItemLike): ItemView {
  return {
    id: item.id,
    foodId: item.food.id,
    foodName: item.food.name,
    brand: item.food.brand,
    source: item.food.source,
    grams: item.grams,
    nutrition: roundNutrition(itemNutrition(item)),
  };
}

export function totalOf(items: Array<Pick<ItemLike, 'grams' | 'food'>>): Nutrition {
  return sumNutrition(items.map(itemNutrition));
}
