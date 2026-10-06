'use client';

import { useState } from 'react';
import type { Food, ItemInput, ItemView } from '@/lib/api';
import { fmt } from '@/lib/format';
import { FoodPicker } from './FoodPicker';
import { MacroChips } from './ui';

/** Linha editável: guarda os valores por 100 g só para a pré-visualização; o servidor recalcula tudo. */
export interface EditableItem {
  key: string;
  foodId: number;
  name: string;
  brand: string | null;
  grams: number;
  servingGrams: number | null;
  per100: { kcal: number; protein: number; carbs: number; fat: number };
}

let seq = 0;
const newKey = () => `i${++seq}`;

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
  const f = 100 / item.grams;
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

export function totalsOf(items: EditableItem[]) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const i of items) {
    const f = i.grams / 100;
    t.kcal += i.per100.kcal * f;
    t.protein += i.per100.protein * f;
    t.carbs += i.per100.carbs * f;
    t.fat += i.per100.fat * f;
  }
  return t;
}

export function ItemsEditor({ items, onChange }: { items: EditableItem[]; onChange: (items: EditableItem[]) => void }) {
  const [picking, setPicking] = useState(false);
  const setGrams = (key: string, grams: number) => onChange(items.map((i) => (i.key === key ? { ...i, grams } : i)));

  return (
    <div>
      {items.length === 0 && <p className="rounded-lg border border-dashed border-line py-5 text-center text-sm text-muted">Nenhum alimento ainda.</p>}
      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <li key={i.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-lg border border-line px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{i.name}</p>
              <p className="num text-xs text-muted">
                {i.brand ? `${i.brand} · ` : ''}
                {fmt((i.per100.kcal * i.grams) / 100)} kcal
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={10000}
                step={5}
                value={Number.isFinite(i.grams) ? i.grams : ''}
                onChange={(e) => setGrams(i.key, Number(e.target.value))}
                className="num !w-20 text-right"
                aria-label={`Gramas de ${i.name}`}
              />
              <span className="text-xs text-muted">g</span>
              {i.servingGrams && i.servingGrams !== i.grams && (
                <button type="button" className="btn btn-sm" title="Usar a porção do rótulo" onClick={() => setGrams(i.key, i.servingGrams!)}>
                  porção
                </button>
              )}
              <button type="button" className="btn btn-sm btn-danger" onClick={() => onChange(items.filter((x) => x.key !== i.key))} aria-label={`Remover ${i.name}`}>
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn" onClick={() => setPicking(true)}>
          + Adicionar alimento
        </button>
        {items.length > 0 && <MacroChips n={totalsOf(items)} />}
      </div>
      {picking && (
        <FoodPicker
          onClose={() => setPicking(false)}
          onPick={(food) => {
            onChange([...items, fromFood(food)]);
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}
