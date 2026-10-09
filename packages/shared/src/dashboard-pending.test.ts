import { applyPendingToDashboard } from './dashboard-pending';
import { enqueue, ops, overlayDiary, type OutboxOp } from './outbox';
import type { Dashboard, DiaryEntry } from './types';

const nut = (kcal: number, p = 0, c = 0, f = 0) => ({ kcal, protein: p, carbs: c, fat: f, fiber: 0, micros: {} });
const entry = (id: number, status: DiaryEntry['status'], kcal: number, kind: DiaryEntry['kind'] = 'planned'): DiaryEntry => ({ id, date: '2026-10-06', time: `0${id}:00`, label: `R${id}`, kind, status, mealId: 1, items: [], totals: nut(kcal, kcal / 10, kcal / 5, kcal / 20) });

const dash = {
  date: '2026-10-06',
  hasProfile: true,
  hasWeight: true,
  energy: { weightKg: 80, bmr: 1800, tdee: 2700, baseTdee: 2700, exerciseKcal: 0, targetKcal: 2150 },
  targets: { kcal: 2150, protein: 144, carbs: 260, fat: 60 },
  consumed: nut(500, 50, 100, 25),
  pending: nut(1000),
  projected: nut(1500),
  balance: { vsTdee: -2200, vsTarget: -1650, status: 'deficit', weeklyKg: -2.2 },
  projectedBalance: { vsTdee: -1200, vsTarget: -650, status: 'deficit', weeklyKg: -1.2 },
  remainingKcal: 1650,
  macros: { protein: { consumed: 50, target: 144, pct: 35, kcalPct: 20 }, carbs: { consumed: 100, target: 260, pct: 38, kcalPct: 40 }, fat: { consumed: 25, target: 60, pct: 42, kcalPct: 40 }, fiber: { consumed: 5, target: 25, pct: 20 } },
  micros: [],
  meals: [],
  mealsDone: 1,
  mealsTotal: 3,
  week: [],
  exercise: { sessions: 0, minutes: 0, netKcal: 0, grossKcal: 0, incomplete: false, counted: false, items: [] },
} as unknown as Dashboard;

describe('applyPendingToDashboard', () => {
  const base = [entry(1, 'done', 500), entry(2, 'pending', 600), entry(3, 'pending', 400)];

  it('sem pendências devolve o mesmo objeto', () => {
    expect(applyPendingToDashboard(dash, base, overlayDiary('2026-10-06', base, []))).toBe(dash);
  });

  it('marcar uma refeição como feita move as calorias de "falta" para "consumido"', () => {
    const queue = [ops.diaryStatus(2, '2026-10-06', 'done', 'R2')].reduce<OutboxOp[]>(enqueue, []);
    const d = applyPendingToDashboard(dash, base, overlayDiary('2026-10-06', base, queue));
    expect(d.consumed.kcal).toBe(1100);
    expect(d.pending.kcal).toBe(400);
    expect(d.projected.kcal).toBe(1500); // o previsto não muda
    expect(d.remainingKcal).toBe(2150 - 1100);
    expect(d.balance!.vsTdee).toBe(1100 - 2700);
    expect(d.mealsDone).toBe(2);
    expect(d.meals.find((m) => m.id === 2)!.status).toBe('done');
    expect(d.macros.protein.consumed).toBeCloseTo(50 + 60, 5);
  });

  it('consumo livre offline soma ao consumido e ao previsto', () => {
    const item = { foodId: 1, name: 'Banana', brand: null, grams: 100, per100: { kcal: 90, protein: 1, carbs: 22, fat: 0 } };
    const queue = [ops.diaryFree('2026-10-06', 'Lanche', '16:00', [item])].reduce<OutboxOp[]>(enqueue, []);
    const d = applyPendingToDashboard(dash, base, overlayDiary('2026-10-06', base, queue));
    expect(d.consumed.kcal).toBe(590);
    expect(d.projected.kcal).toBe(1590);
    expect(d.mealsDone).toBe(2);
  });

  it('pular uma pendente tira das refeições totais e das calorias que faltam', () => {
    const queue = [ops.diaryStatus(3, '2026-10-06', 'skipped', 'R3')].reduce<OutboxOp[]>(enqueue, []);
    const d = applyPendingToDashboard(dash, base, overlayDiary('2026-10-06', base, queue));
    expect(d.pending.kcal).toBe(600);
    expect(d.mealsTotal).toBe(2);
  });
});
