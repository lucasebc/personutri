import { bmr, macroTargets, targetKcal, tdee } from './energy';

describe('energy', () => {
  it('Mifflin-St Jeor: homem, 80 kg, 180 cm, 30 anos', () => {
    expect(bmr({ sex: 'male', weightKg: 80, heightCm: 180, age: 30 })).toBe(1780);
  });

  it('Mifflin-St Jeor: mulher, 60 kg, 165 cm, 30 anos', () => {
    expect(bmr({ sex: 'female', weightKg: 60, heightCm: 165, age: 30 })).toBeCloseTo(1320.25, 2);
  });

  it('Katch-McArdle usa massa magra quando há % de gordura', () => {
    // 80 kg com 20% de gordura = 64 kg de massa magra -> 370 + 21,6 * 64
    expect(bmr({ sex: 'male', weightKg: 80, heightCm: 180, age: 30, bodyFatPct: 20, formula: 'katch' })).toBeCloseTo(1752.4, 1);
  });

  it('Katch-McArdle cai para Mifflin sem % de gordura', () => {
    expect(bmr({ sex: 'male', weightKg: 80, heightCm: 180, age: 30, formula: 'katch' })).toBe(1780);
  });

  it('TDEE aplica o fator de atividade', () => {
    expect(tdee(1780, 'moderate')).toBeCloseTo(2759, 0);
  });

  it('meta calórica: -0,5 kg/semana = -550 kcal/dia', () => {
    expect(targetKcal(2759, -0.5)).toBeCloseTo(2209, 0);
    expect(targetKcal(2759, 0)).toBe(2759);
  });

  it('macros: proteína por kg, gordura por % e carboidrato pelo restante', () => {
    const m = macroTargets({ kcal: 2200, weightKg: 80, proteinPerKg: 1.8, fatPercent: 25 });
    expect(m.protein).toBeCloseTo(144, 5);
    expect(m.fat).toBeCloseTo(61.1, 1);
    // (2200 - 144*4 - 61.1*9) / 4
    expect(m.carbs).toBeCloseTo(268.6, 0);
    expect(m.protein * 4 + m.carbs * 4 + m.fat * 9).toBeCloseTo(2200, 3);
  });
});
