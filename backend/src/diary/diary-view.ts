import { ItemLike, totalOf, viewItem } from '../common/item-view';
import { roundNutrition } from '../common/nutrients';

export interface DiaryEntryLike {
  id: number;
  date: string;
  time: string | null;
  label: string;
  kind: 'planned' | 'free';
  status: 'pending' | 'done' | 'skipped';
  mealId: number | null;
  items: ItemLike[];
}

export function diaryEntryView(e: DiaryEntryLike) {
  return {
    id: e.id,
    date: e.date,
    time: e.time,
    label: e.label,
    kind: e.kind,
    status: e.status,
    mealId: e.mealId,
    items: e.items.map(viewItem),
    totals: roundNutrition(totalOf(e.items)),
  };
}

export interface DietSlot<F> {
  id: number;
  label: string;
  time: string;
  weekdays: number[];
  mealId: number;
  items: Array<{ food: F; grams: number }>;
}

/**
 * Decide o que fazer na agenda de um dia para refletir a dieta ativa: remove pendências obsoletas
 * (a dieta mudou) e cria as refeições programadas que ainda não existem. Feitas/puladas ficam intactas.
 */
export function planDiarySync<F>(args: {
  weekday: number;
  slots: DietSlot<F>[];
  existing: Array<{ id: number; status: 'pending' | 'done' | 'skipped'; dietEntryId: number | null }>;
}) {
  const wanted = args.slots.filter((s) => s.weekdays.includes(args.weekday));
  const wantedIds = new Set(wanted.map((w) => w.id));
  const removeIds = args.existing.filter((e) => e.status === 'pending' && !wantedIds.has(e.dietEntryId ?? -1)).map((e) => e.id);
  const have = new Set(args.existing.map((e) => e.dietEntryId));
  const create = wanted.filter((w) => !have.has(w.id));
  return { removeIds, create };
}
