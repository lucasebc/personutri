import { addNutrition, emptyNutrition, roundNutrition, scaleNutrition, sumNutrition } from './nutrients';

const rice = { kcal: 128, protein: 2.5, carbs: 28, fat: 0.2, fiber: 1.6, micros: { iron: 0.08, sodium: 1.2 } };
const beans = { kcal: 76, protein: 4.8, carbs: 13.6, fat: 0.5, fiber: 8.5, micros: { iron: 1.3, calcium: 27 } };

describe('nutrients', () => {
  it('escala valores por 100 g para a porção', () => {
    const n = scaleNutrition(rice, 150);
    expect(n.kcal).toBeCloseTo(192);
    expect(n.protein).toBeCloseTo(3.75);
    expect(n.micros.iron).toBeCloseTo(0.12);
  });

  it('soma macros e micros (micros ausentes não viram NaN)', () => {
    const total = sumNutrition([scaleNutrition(rice, 100), scaleNutrition(beans, 100)]);
    expect(total.kcal).toBeCloseTo(204);
    expect(total.fiber).toBeCloseTo(10.1);
    expect(total.micros.iron).toBeCloseTo(1.38);
    expect(total.micros.calcium).toBe(27);
    expect(total.micros.sodium).toBeCloseTo(1.2);
    expect(Object.values(total.micros).every(Number.isFinite)).toBe(true);
  });

  it('soma vazia é neutra', () => {
    expect(addNutrition(emptyNutrition(), emptyNutrition())).toEqual(emptyNutrition());
  });

  it('arredonda para a resposta da API', () => {
    const r = roundNutrition({ kcal: 191.6, protein: 3.7549, carbs: 1, fat: 0.333, fiber: 0, micros: { copper: 0.12345, sodium: 123.456 } });
    expect(r.kcal).toBe(192);
    expect(r.protein).toBe(3.8);
    expect(r.micros.copper).toBe(0.123);
    expect(r.micros.sodium).toBe(123.5);
  });
});
