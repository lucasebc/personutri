import { mapOffProduct } from './off.mapper';

describe('mapOffProduct', () => {
  const base = {
    code: '7891000100103',
    product_name: 'Leite condensado',
    brands: 'Nestlé, Moça',
    categories: 'Laticínios, Leites condensados',
    serving_quantity: 20,
    serving_size: '20 g',
    nutriments: {
      'energy-kcal_100g': 321,
      proteins_100g: 7.3,
      carbohydrates_100g: 55,
      fat_100g: 8,
      fiber_100g: 0,
      sugars_100g: 54,
      'saturated-fat_100g': 5,
      sodium_100g: 0.1, // g -> 100 mg
      calcium_100g: 0.25, // g -> 250 mg
      'vitamin-a_100g': 0.0001, // g -> 100 mcg
    },
  };

  it('converte macros e converte minerais de g para mg/mcg', () => {
    const f = mapOffProduct(base)!;
    expect(f.name).toBe('Leite condensado');
    expect(f.brand).toBe('Nestlé');
    expect(f.category).toBe('Leites condensados');
    expect(f).toMatchObject({ kcal: 321, protein: 7.3, carbs: 55, fat: 8, servingGrams: 20, servingLabel: '20 g' });
    expect(f.micros.sodium).toBeCloseTo(100);
    expect(f.micros.calcium).toBeCloseTo(250);
    expect(f.micros.vitaminA).toBeCloseTo(100);
    expect(f.micros.sugars).toBe(54);
  });

  it('usa kJ quando não há kcal', () => {
    const f = mapOffProduct({ ...base, nutriments: { energy_100g: 1000, proteins_100g: 1, carbohydrates_100g: 1, fat_100g: 1 } })!;
    expect(f.kcal).toBeCloseTo(239, 0);
  });

  it('estima kcal pelos macros quando não há energia', () => {
    const f = mapOffProduct({ ...base, nutriments: { proteins_100g: 10, carbohydrates_100g: 20, fat_100g: 5 } })!;
    expect(f.kcal).toBe(10 * 4 + 20 * 4 + 5 * 9);
  });

  it('deriva sódio a partir do sal', () => {
    const f = mapOffProduct({ ...base, nutriments: { 'energy-kcal_100g': 10, salt_100g: 2.5 } })!;
    expect(f.micros.sodium).toBeCloseTo(1000);
  });

  it('prefere o nome em português', () => {
    expect(mapOffProduct({ ...base, product_name: 'Condensed milk', product_name_pt: 'Leite condensado integral' })!.name).toBe(
      'Leite condensado integral',
    );
  });

  it('descarta produtos sem nome, sem código ou sem energia', () => {
    expect(mapOffProduct({ ...base, product_name: '' })).toBeNull();
    expect(mapOffProduct({ ...base, code: '' })).toBeNull();
    expect(mapOffProduct({ ...base, nutriments: { proteins_100g: 1 } })).toBeNull();
    expect(mapOffProduct({ code: '1', product_name: 'x' })).toBeNull();
  });

  it('ignora valores negativos ou inválidos', () => {
    const f = mapOffProduct({ ...base, nutriments: { 'energy-kcal_100g': 100, proteins_100g: -3, fat_100g: 'abc' } })!;
    expect(f.protein).toBe(0);
    expect(f.fat).toBe(0);
  });
});
