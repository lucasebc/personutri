import { Micros } from '../common/nutrients';

/** Subconjunto dos campos do Open Food Facts que usamos. */
export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_pt?: string;
  generic_name?: string;
  brands?: string;
  categories?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
}

export interface MappedOffFood {
  externalId: string;
  barcode: string;
  name: string;
  brand: string | null;
  category: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  micros: Micros;
  servingGrams: number | null;
  servingLabel: string | null;
}

/** Campos pedidos à API (reduz bastante o tamanho da resposta). */
export const OFF_FIELDS = [
  'code',
  'product_name',
  'product_name_pt',
  'generic_name',
  'brands',
  'categories',
  'serving_size',
  'serving_quantity',
  'nutriments',
].join(',');

const KJ_PER_KCAL = 4.184;

function n(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const x = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(x) && x >= 0 ? x : null;
}

/**
 * Open Food Facts devolve minerais/vitaminas em **gramas por 100 g**
 * (ex.: `calcium_100g: 0.12` = 120 mg). Convertemos para a unidade de MICRO_META.
 */
const G_TO_MG = 1000;
const G_TO_MCG = 1_000_000;

const MICRO_FIELDS: Array<[keyof Micros, string, number]> = [
  ['sugars', 'sugars_100g', 1],
  ['saturatedFat', 'saturated-fat_100g', 1],
  ['cholesterol', 'cholesterol_100g', G_TO_MG],
  ['sodium', 'sodium_100g', G_TO_MG],
  ['potassium', 'potassium_100g', G_TO_MG],
  ['calcium', 'calcium_100g', G_TO_MG],
  ['magnesium', 'magnesium_100g', G_TO_MG],
  ['phosphorus', 'phosphorus_100g', G_TO_MG],
  ['iron', 'iron_100g', G_TO_MG],
  ['zinc', 'zinc_100g', G_TO_MG],
  ['copper', 'copper_100g', G_TO_MG],
  ['manganese', 'manganese_100g', G_TO_MG],
  ['vitaminA', 'vitamin-a_100g', G_TO_MCG],
  ['vitaminC', 'vitamin-c_100g', G_TO_MG],
  ['thiamin', 'vitamin-b1_100g', G_TO_MG],
  ['riboflavin', 'vitamin-b2_100g', G_TO_MG],
  ['vitaminB6', 'vitamin-b6_100g', G_TO_MG],
  ['niacin', 'vitamin-pp_100g', G_TO_MG],
];

/**
 * Converte um produto do Open Food Facts em alimento do app.
 * Retorna `null` quando o produto não tem nome ou informação de energia/macros utilizável.
 */
export function mapOffProduct(p: OffProduct): MappedOffFood | null {
  const nut = p.nutriments ?? {};
  const barcode = (p.code ?? '').trim();
  const name = (p.product_name_pt || p.product_name || p.generic_name || '').trim();
  if (!barcode || !name) return null;

  const protein = n(nut['proteins_100g']);
  const carbs = n(nut['carbohydrates_100g']);
  const fat = n(nut['fat_100g']);

  let kcal = n(nut['energy-kcal_100g']);
  if (kcal === null) {
    const kj = n(nut['energy_100g']); // kJ
    if (kj !== null) kcal = kj / KJ_PER_KCAL;
  }
  if (kcal === null && protein !== null && carbs !== null && fat !== null) {
    kcal = protein * 4 + carbs * 4 + fat * 9;
  }
  if (kcal === null) return null;

  const micros: Micros = {};
  for (const [key, field, factor] of MICRO_FIELDS) {
    const v = n(nut[field]);
    if (v !== null) micros[key] = v * factor;
  }
  // Sódio ausente mas sal presente: sódio = sal / 2,5
  if (micros.sodium === undefined) {
    const salt = n(nut['salt_100g']);
    if (salt !== null) micros.sodium = (salt / 2.5) * G_TO_MG;
  }

  const serving = n(p.serving_quantity);
  const category = (p.categories ?? '').split(',').map((s) => s.trim()).filter(Boolean).pop() ?? null;

  return {
    externalId: barcode,
    barcode,
    name,
    brand: (p.brands ?? '').split(',')[0]?.trim() || null,
    category,
    kcal,
    protein: protein ?? 0,
    carbs: carbs ?? 0,
    fat: fat ?? 0,
    fiber: n(nut['fiber_100g']) ?? 0,
    micros,
    servingGrams: serving && serving > 0 ? serving : null,
    servingLabel: p.serving_size?.trim() || null,
  };
}
