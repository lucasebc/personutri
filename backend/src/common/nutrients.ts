/**
 * Modelo de nutrientes compartilhado por alimentos, refeições, diário e dashboard.
 *
 * Todo alimento guarda seus valores por 100 g. Macros principais ficam em colunas;
 * os demais nutrientes ficam em `micros` (chaves de MICRO_META).
 */

export interface Macros {
  kcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber: number; // g
}

export type MicroKey =
  | 'sugars'
  | 'saturatedFat'
  | 'cholesterol'
  | 'sodium'
  | 'potassium'
  | 'calcium'
  | 'magnesium'
  | 'phosphorus'
  | 'iron'
  | 'zinc'
  | 'copper'
  | 'manganese'
  | 'vitaminA'
  | 'vitaminC'
  | 'thiamin'
  | 'riboflavin'
  | 'vitaminB6'
  | 'niacin';

export type Micros = Partial<Record<MicroKey, number>>;

export interface Nutrition extends Macros {
  micros: Micros;
}

export interface MicroMeta {
  label: string;
  unit: 'g' | 'mg' | 'mcg';
  /** Valor de referência diário para adultos. */
  reference: number;
  /** min = meta mínima a atingir; max = limite a não ultrapassar. */
  kind: 'min' | 'max';
}

/**
 * Referências diárias para adultos (RDC 269/2005 da ANVISA e recomendações da OMS
 * para sódio/potássio/açúcares). São valores genéricos: não substituem a orientação
 * de um nutricionista.
 */
export const MICRO_META: Record<MicroKey, MicroMeta> = {
  sugars: { label: 'Açúcares', unit: 'g', reference: 50, kind: 'max' },
  saturatedFat: { label: 'Gordura saturada', unit: 'g', reference: 22, kind: 'max' },
  cholesterol: { label: 'Colesterol', unit: 'mg', reference: 300, kind: 'max' },
  sodium: { label: 'Sódio', unit: 'mg', reference: 2000, kind: 'max' },
  potassium: { label: 'Potássio', unit: 'mg', reference: 3510, kind: 'min' },
  calcium: { label: 'Cálcio', unit: 'mg', reference: 1000, kind: 'min' },
  magnesium: { label: 'Magnésio', unit: 'mg', reference: 260, kind: 'min' },
  phosphorus: { label: 'Fósforo', unit: 'mg', reference: 700, kind: 'min' },
  iron: { label: 'Ferro', unit: 'mg', reference: 14, kind: 'min' },
  zinc: { label: 'Zinco', unit: 'mg', reference: 7, kind: 'min' },
  copper: { label: 'Cobre', unit: 'mg', reference: 0.9, kind: 'min' },
  manganese: { label: 'Manganês', unit: 'mg', reference: 2.3, kind: 'min' },
  vitaminA: { label: 'Vitamina A (RAE)', unit: 'mcg', reference: 600, kind: 'min' },
  vitaminC: { label: 'Vitamina C', unit: 'mg', reference: 45, kind: 'min' },
  thiamin: { label: 'Tiamina (B1)', unit: 'mg', reference: 1.2, kind: 'min' },
  riboflavin: { label: 'Riboflavina (B2)', unit: 'mg', reference: 1.3, kind: 'min' },
  vitaminB6: { label: 'Vitamina B6', unit: 'mg', reference: 1.3, kind: 'min' },
  niacin: { label: 'Niacina (B3)', unit: 'mg', reference: 16, kind: 'min' },
};

export const FIBER_REFERENCE_G = 25;

export const MICRO_KEYS = Object.keys(MICRO_META) as MicroKey[];

export function emptyNutrition(): Nutrition {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, micros: {} };
}

/** Arredonda para `digits` casas, evitando ruído de ponto flutuante. */
export function round(value: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** Valores por 100 g -> valores para `grams` gramas. */
export function scaleNutrition(per100: Nutrition, grams: number): Nutrition {
  const f = grams / 100;
  const micros: Micros = {};
  for (const key of MICRO_KEYS) {
    const v = per100.micros?.[key];
    if (typeof v === 'number') micros[key] = v * f;
  }
  return {
    kcal: per100.kcal * f,
    protein: per100.protein * f,
    carbs: per100.carbs * f,
    fat: per100.fat * f,
    fiber: (per100.fiber ?? 0) * f,
    micros,
  };
}

export function addNutrition(a: Nutrition, b: Nutrition): Nutrition {
  const micros: Micros = { ...a.micros };
  for (const key of MICRO_KEYS) {
    const v = b.micros?.[key];
    if (typeof v === 'number') micros[key] = (micros[key] ?? 0) + v;
  }
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
    micros,
  };
}

export function sumNutrition(list: Nutrition[]): Nutrition {
  return list.reduce(addNutrition, emptyNutrition());
}

/** Arredondamento para resposta da API (kcal inteiro, demais com 1 casa). */
export function roundNutrition(n: Nutrition): Nutrition {
  const micros: Micros = {};
  for (const key of MICRO_KEYS) {
    const v = n.micros?.[key];
    if (typeof v === 'number') micros[key] = round(v, MICRO_META[key].reference < 5 ? 3 : 1);
  }
  return {
    kcal: Math.round(n.kcal),
    protein: round(n.protein),
    carbs: round(n.carbs),
    fat: round(n.fat),
    fiber: round(n.fiber),
    micros,
  };
}

/** kcal por grama de cada macro (fatores de Atwater). */
export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;
