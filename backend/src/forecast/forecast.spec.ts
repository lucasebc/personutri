import { BodyProfile, WeightEntry } from '../body/body.entity';
import { energyOn } from '../body/energy-calculator';
import { addDays, dateRange } from '../common/dates';
import { computeForecast } from './forecast';

const profile: BodyProfile = {
  id: 1,
  sex: 'male',
  birthDate: '1995-06-15',
  heightCm: 180,
  activityLevel: 'moderate',
  weeklyGoalKg: -0.5,
  targetWeightKg: 75,
  proteinPerKg: 1.8,
  fatPercent: 25,
  bmrFormula: 'mifflin',
};

const w = (date: string, weightKg: number): WeightEntry => ({ id: 0, date, weightKg, bodyFatPct: null, waistCm: null });

// 2026-09-07 é segunda-feira
const W1 = '2026-09-07';
const W2 = '2026-09-14';
const W3 = '2026-09-21';
const TODAY = '2026-10-04'; // domingo da semana de 28/09

describe('computeForecast', () => {
  it('sem pesagens não há previsão', () => {
    const r = computeForecast({ today: TODAY, profile, weights: [], consumedKcal: new Map() });
    expect(r).toEqual({ ready: false, reason: 'no-weights' });
  });

  it('1ª semana é a base; semanas seguintes partem da média medida da anterior', () => {
    const weights = [w(W1, 80.2), w(addDays(W1, 3), 79.8), w(W2, 79.5)];
    const r = computeForecast({ today: addDays(W2, 6), profile, weights, consumedKcal: new Map() });
    if (!r.ready) throw new Error('not ready');
    expect(r.weeks).toHaveLength(2);
    expect(r.weeks[0]).toMatchObject({ weekStart: W1, measured: 80, predicted: null, anchor: null });
    expect(r.weeks[1]).toMatchObject({ weekStart: W2, measured: 79.5, anchor: 80, anchorType: 'measured' });
  });

  it('comendo exatamente o gasto, o peso previsto não muda', () => {
    const weights = [w(W1, 80), w(W2, 80)];
    const tdee = energyOn(W2, profile, weights, 80)!.tdee;
    const consumed = new Map(dateRange(W2, addDays(W2, 6)).map((d) => [d, tdee]));
    const r = computeForecast({ today: addDays(W2, 6), profile, weights, consumedKcal: consumed });
    if (!r.ready) throw new Error('not ready');
    expect(r.weeks[1].predicted).toBeCloseTo(80, 2);
    expect(r.weeks[1].intakeSource).toBe('logged');
    expect(r.weeks[1].loggedDays).toBe(7);
  });

  it('déficit de 550 kcal/dia prevê -0,5 kg na semana', () => {
    const weights = [w(W1, 80), w(W2, 79.6)];
    const tdee = energyOn(W2, profile, weights, 80)!.tdee;
    const consumed = new Map(dateRange(W2, addDays(W2, 6)).map((d) => [d, tdee - 550]));
    const r = computeForecast({ today: addDays(W2, 6), profile, weights, consumedKcal: consumed });
    if (!r.ready) throw new Error('not ready');
    expect(r.weeks[1].predicted).toBeCloseTo(79.5, 2);
    expect(r.weeks[1].error).toBeCloseTo(0.1, 2); // pesou 79,6 contra 79,5 previsto
    expect(r.summary.meanAbsError).toBeCloseTo(0.1, 2);
  });

  it('sem registros de consumo, usa a meta do plano e sinaliza', () => {
    const weights = [w(W1, 80), w(W2, 79.5)];
    const r = computeForecast({ today: addDays(W2, 6), profile, weights, consumedKcal: new Map() });
    if (!r.ready) throw new Error('not ready');
    expect(r.weeks[1].intakeSource).toBe('plan');
    expect(r.weeks[1].loggedDays).toBe(0);
    // meta = TDEE - 550 => -0,5 kg
    expect(r.weeks[1].predicted).toBeCloseTo(79.5, 1);
  });

  it('semana sem pesagem encadeia a previsão', () => {
    const weights = [w(W1, 80), w(W3, 79)];
    const r = computeForecast({ today: addDays(W3, 6), profile, weights, consumedKcal: new Map() });
    if (!r.ready) throw new Error('not ready');
    expect(r.weeks[1].measured).toBeNull();
    expect(r.weeks[1].predicted).not.toBeNull();
    expect(r.weeks[2].anchorType).toBe('predicted');
    expect(r.weeks[2].anchor).toBe(r.weeks[1].predicted);
  });

  it('marca a semana corrente como parcial e projeta as próximas', () => {
    const weights = [w(W1, 80), w('2026-09-28', 79)];
    const r = computeForecast({ today: '2026-10-01', profile, weights, consumedKcal: new Map(), weeksAhead: 3 });
    if (!r.ready) throw new Error('not ready');
    expect(r.weeks[r.weeks.length - 1].partial).toBe(true);
    expect(r.projection).toHaveLength(3);
    expect(r.projection[0].weekStart).toBe('2026-10-05');
    // projeção na meta (-0,5/sem) decresce semana a semana
    expect(r.projection[1].predicted).toBeLessThan(r.projection[0].predicted);
  });

  it('trajetória-meta respeita o peso alvo', () => {
    const weights = [w(W1, 75.5)];
    const r = computeForecast({ today: addDays(W1, 6), profile, weights, consumedKcal: new Map(), weeksAhead: 4 });
    if (!r.ready) throw new Error('not ready');
    expect(r.projection.every((p) => p.goal! >= 75)).toBe(true);
    expect(r.projection[r.projection.length - 1].goal).toBe(75);
  });

  it('calibra o gasto real a partir do que foi comido e do peso medido', () => {
    // comeu 2000 kcal/dia e perdeu 0,5 kg => gasto real ~ 2550
    const weights = [w(W1, 80), w(W2, 79.5), w(W3, 79)];
    const consumed = new Map(dateRange(W1, addDays(W3, 6)).map((d) => [d, 2000]));
    const r = computeForecast({ today: addDays(W3, 6), profile, weights, consumedKcal: consumed });
    if (!r.ready) throw new Error('not ready');
    expect(r.summary.calibratedTdee).toBe(2550);
    expect(r.summary.calibratedWeeks).toBe(2);
    expect(r.summary.measuredChangePerWeek).toBeCloseTo(-0.5, 2);
  });

  it('o consumo parcial de hoje não entra na média da semana em andamento', () => {
    const weights = [w(W1, 80), w(W2, 80)];
    const today = addDays(W2, 2); // quarta
    const tdee = energyOn(W2, profile, weights, 80)!.tdee;
    const consumed = new Map<string, number>([
      [W2, tdee],
      [addDays(W2, 1), tdee],
      [today, 400], // só o café da manhã até agora
    ]);
    const r = computeForecast({ today, profile, weights, consumedKcal: consumed });
    if (!r.ready) throw new Error('not ready');
    const cur = r.weeks[1];
    expect(cur.partial).toBe(true);
    expect(cur.loggedDays).toBe(2);
    expect(cur.predicted).toBeCloseTo(80, 2);
  });
});
