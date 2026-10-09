import { useCallback, useEffect, useState } from 'react';
import type { Food } from '@personutri/shared';
import { readJson, writeJson } from '@/lib/storage';

const KEY = 'personutri:recent-foods';
const MAX = 40;

/** Alimentos usados por último: ficam disponíveis sem internet (com os valores por 100 g). */
export async function addRecent(food: Food) {
  const list = await readJson<Food[]>(KEY, []);
  await writeJson(KEY, [food, ...list.filter((f) => f.id !== food.id)].slice(0, MAX));
}

export function useRecents() {
  const [recents, setRecents] = useState<Food[]>([]);
  const reload = useCallback(() => readJson<Food[]>(KEY, []).then(setRecents), []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { recents, reload };
}
