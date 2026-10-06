import { cycleMet, effectiveSpeedKmh, runMet, walkMet, workoutCalories } from './calories';

describe('MET por velocidade', () => {
  it('caminhada a 5 km/h ≈ 3,4 MET (Compendium: 3,5 a 4,8 km/h)', () => {
    expect(walkMet(5)).toBeCloseTo(3.38, 2);
  });

  it('inclinação aumenta o gasto na caminhada', () => {
    expect(walkMet(5, 5)).toBeGreaterThan(walkMet(5, 0) + 1.5);
  });

  it('caminhada muito rápida passa a usar a equação de corrida', () => {
    expect(walkMet(8)).toBeCloseTo(runMet(8), 5);
  });

  it('corrida: 8 km/h ≈ 8,6 e 10 km/h ≈ 10,5 MET', () => {
    expect(runMet(8)).toBeCloseTo(8.62, 2);
    expect(runMet(10)).toBeCloseTo(10.52, 2);
  });

  it('ciclismo interpola a tabela e satura nas pontas', () => {
    expect(cycleMet(5)).toBe(3.5);
    expect(cycleMet(16)).toBe(4.0);
    expect(cycleMet(20.8)).toBe(8.0);
    expect(cycleMet(22.4)).toBeCloseTo(9.0, 5);
    expect(cycleMet(50)).toBe(15.8);
  });
});

describe('workoutCalories', () => {
  const walk = { calcMode: 'walk' as const, met: null };
  const lift = { calcMode: 'met' as const, met: 6 };

  it('caminhar 5 km/h por 60 min com 80 kg: bruto ≈ 270 e líquido ≈ 190 kcal', () => {
    const r = workoutCalories(walk, { durationMin: 60, speedKmh: 5 }, 80);
    expect(r.source).toBe('calculated');
    expect(r.grossKcal).toBeCloseTo(270.4, 0);
    expect(r.netKcal).toBeCloseTo(190.4, 0);
  });

  it('deriva a velocidade da distância e da duração', () => {
    expect(effectiveSpeedKmh({ durationMin: 30, distanceKm: 3 })).toBe(6);
    const r = workoutCalories(walk, { durationMin: 30, distanceKm: 2.5 }, 80);
    expect(r.speedKmh).toBe(5);
  });

  it('MET fixo: musculação 6 MET, 45 min, 70 kg', () => {
    const r = workoutCalories(lift, { durationMin: 45 }, 70);
    expect(r.grossKcal).toBeCloseTo(315, 5);
    expect(r.netKcal).toBeCloseTo(262.5, 5);
  });

  it('calorias do relógio têm prioridade e o bruto soma o repouso', () => {
    const r = workoutCalories(lift, { durationMin: 60, deviceActiveKcal: 300 }, 80);
    expect(r.source).toBe('device');
    expect(r.netKcal).toBe(300);
    expect(r.grossKcal).toBe(380);
  });

  it('sem peso e sem dado do relógio não há como calcular', () => {
    expect(workoutCalories(lift, { durationMin: 60 }, null)).toMatchObject({ netKcal: null, grossKcal: null, source: null });
    expect(workoutCalories(lift, { durationMin: 60, deviceActiveKcal: 250 }, null)).toMatchObject({ netKcal: 250, grossKcal: null });
  });

  it('atividade por velocidade sem velocidade nem distância não calcula', () => {
    expect(workoutCalories(walk, { durationMin: 30 }, 80).netKcal).toBeNull();
  });

  it('MET abaixo de 1 não gera líquido negativo', () => {
    expect(workoutCalories({ calcMode: 'met', met: 0.9 }, { durationMin: 60 }, 80).netKcal).toBe(0);
  });
});
