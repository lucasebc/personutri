import type { MicroKey } from './types';

export const MICRO_INFO: Record<MicroKey, { label: string; unit: string }> = {
  sugars: { label: 'Açúcares', unit: 'g' },
  saturatedFat: { label: 'Gordura saturada', unit: 'g' },
  cholesterol: { label: 'Colesterol', unit: 'mg' },
  sodium: { label: 'Sódio', unit: 'mg' },
  potassium: { label: 'Potássio', unit: 'mg' },
  calcium: { label: 'Cálcio', unit: 'mg' },
  magnesium: { label: 'Magnésio', unit: 'mg' },
  phosphorus: { label: 'Fósforo', unit: 'mg' },
  iron: { label: 'Ferro', unit: 'mg' },
  zinc: { label: 'Zinco', unit: 'mg' },
  copper: { label: 'Cobre', unit: 'mg' },
  manganese: { label: 'Manganês', unit: 'mg' },
  vitaminA: { label: 'Vitamina A (RAE)', unit: 'mcg' },
  vitaminC: { label: 'Vitamina C', unit: 'mg' },
  thiamin: { label: 'Tiamina (B1)', unit: 'mg' },
  riboflavin: { label: 'Riboflavina (B2)', unit: 'mg' },
  vitaminB6: { label: 'Vitamina B6', unit: 'mg' },
  niacin: { label: 'Niacina (B3)', unit: 'mg' },
};

export const MICRO_KEYS = Object.keys(MICRO_INFO) as MicroKey[];
