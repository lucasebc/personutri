import { classifyFailure, enqueue, isTempId, ops, OutboxOp, overlayDiary, overlayWeights, overlayWorkouts, PreviewItem, WorkoutPreview, doneTotals } from './outbox';
import type { DiaryEntry, WeightEntry, WorkoutDay } from './types';

const item = (foodId = 1, grams = 100): PreviewItem => ({ foodId, name: `Alimento ${foodId}`, brand: null, grams, per100: { kcal: 200, protein: 10, carbs: 20, fat: 5 } });
const nut = (kcal: number) => ({ kcal, protein: 0, carbs: 0, fat: 0, fiber: 0, micros: {} });
const entry = (id: number, status: DiaryEntry['status'], kcal = 300, time = '12:00'): DiaryEntry => ({ id, date: '2026-10-06', time, label: `Ref ${id}`, kind: 'planned', status, mealId: 1, items: [], totals: nut(kcal) });
const wp = (over: Partial<WorkoutPreview> = {}): WorkoutPreview => ({
  activityId: 5, activityName: 'Musculação', category: 'Academia', calcMode: 'met', met: 6, time: '18:00', durationMin: 60,
  distanceKm: null, speedKmh: null, gradePercent: null, avgHeartRate: null, deviceActiveKcal: null, notes: null, netKcal: 400, ...over,
});
const q = (...list: ReturnType<typeof ops.diaryStatus>[]) => list.reduce<OutboxOp[]>((acc, o) => enqueue(acc, o), []);

describe('enqueue: simplificação da fila', () => {
  it('o último status de um registro substitui os anteriores', () => {
    const list = q(ops.diaryStatus(1, '2026-10-06', 'done', 'x'), ops.diaryStatus(1, '2026-10-06', 'skipped', 'x'), ops.diaryStatus(2, '2026-10-06', 'done', 'y'));
    expect(list).toHaveLength(2);
    expect(list.find((o) => o.meta.kind === 'diary.status' && o.meta.entryId === 1)!.body).toEqual({ status: 'skipped' });
  });

  it('editar itens de um consumo livre ainda não enviado altera a criação', () => {
    let list = enqueue([], ops.diaryFree('2026-10-06', 'Lanche', '16:00', [item(1, 100)]));
    const temp = (list[0].meta as { tempId: number }).tempId;
    expect(isTempId(temp)).toBe(true);
    list = enqueue(list, ops.diaryItems(temp, '2026-10-06', [item(2, 50)], 'Lanche'));
    expect(list).toHaveLength(1);
    expect(list[0].body).toMatchObject({ items: [{ foodId: 2, grams: 50 }] });
  });

  it('apagar um consumo livre pendente cancela a criação (nada vai ao servidor)', () => {
    let list = enqueue([], ops.diaryFree('2026-10-06', 'Lanche', null, [item()]));
    const temp = (list[0].meta as { tempId: number }).tempId;
    list = enqueue(list, ops.diaryDelete(temp, '2026-10-06', 'Lanche'));
    expect(list).toEqual([]);
  });

  it('apagar um registro real descarta alterações pendentes dele', () => {
    let list = q(ops.diaryStatus(7, '2026-10-06', 'done', 'x'));
    list = enqueue(list, ops.diaryItems(7, '2026-10-06', [item()], 'x'));
    list = enqueue(list, ops.diaryDelete(7, '2026-10-06', 'x'));
    expect(list.map((o) => o.method)).toEqual(['DELETE']);
  });

  it('treino criado offline: editar altera a criação; apagar cancela', () => {
    let list = enqueue([], ops.workoutCreate('2026-10-06', wp()));
    const temp = (list[0].meta as { tempId: number }).tempId;
    list = enqueue(list, ops.workoutUpdate(temp, '2026-10-06', wp({ durationMin: 30 })));
    expect(list).toHaveLength(1);
    expect(list[0].method).toBe('POST');
    expect((list[0].body as { durationMin: number }).durationMin).toBe(30);
    list = enqueue(list, ops.workoutDelete(temp, '2026-10-06', 'Musculação'));
    expect(list).toEqual([]);
  });

  it('peso do mesmo dia: o último vale', () => {
    const list = [ops.weightAdd('2026-10-06', 82, null, null), ops.weightAdd('2026-10-06', 81.5, null, null), ops.weightAdd('2026-10-05', 82.2, null, null)].reduce<OutboxOp[]>(enqueue, []);
    expect(list).toHaveLength(2);
    expect(list.find((o) => o.meta.kind === 'weight.add' && o.meta.date === '2026-10-06')!.meta).toMatchObject({ weightKg: 81.5 });
  });

  it('cada operação recebe um id único (usado como Idempotency-Key)', () => {
    const list = q(ops.diaryStatus(1, 'd', 'done', 'a'), ops.diaryStatus(2, 'd', 'done', 'b'));
    expect(new Set(list.map((o) => o.id)).size).toBe(2);
  });
});

describe('overlay', () => {
  it('diário: status, itens e consumo livre pendentes aparecem na lista', () => {
    const base = [entry(1, 'pending', 300, '08:00'), entry(2, 'pending', 500, '12:00')];
    const queue = [
      ops.diaryStatus(1, '2026-10-06', 'done', 'Café'),
      ops.diaryItems(2, '2026-10-06', [item(9, 150)], 'Almoço'),
      ops.diaryFree('2026-10-06', '', '10:30', [item(3, 50)]),
    ].reduce<OutboxOp[]>(enqueue, []);
    const view = overlayDiary('2026-10-06', base, queue);
    expect(view.map((e) => e.id).length).toBe(3);
    expect(view[0]).toMatchObject({ id: 1, status: 'done', pendingSync: true });
    expect(view[1]).toMatchObject({ kind: 'free', label: 'Consumo livre', status: 'done', time: '10:30' });
    expect(view[1].totals.kcal).toBe(100); // 50 g × 200 kcal/100 g
    expect(view[2].items[0].grams).toBe(150);
    expect(view[2].totals.kcal).toBe(300);
    expect(doneTotals(view).kcal).toBe(300 + 100);
  });

  it('diário: não mistura consumo livre de outro dia e respeita remoções', () => {
    const queue = [ops.diaryFree('2026-10-07', 'amanhã', null, [item()]), ops.diaryDelete(2, '2026-10-06', 'Almoço')].reduce<OutboxOp[]>(enqueue, []);
    const view = overlayDiary('2026-10-06', [entry(1, 'done'), entry(2, 'pending')], queue);
    expect(view.map((e) => e.id)).toEqual([1]);
  });

  it('operações rejeitadas pelo servidor não entram na visão', () => {
    const queue = q(ops.diaryStatus(1, '2026-10-06', 'done', 'x')).map((o) => ({ ...o, error: 'recusado' }));
    expect(overlayDiary('2026-10-06', [entry(1, 'pending')], queue)[0].status).toBe('pending');
  });

  it('treinos: criação, edição e remoção, com totais recalculados', () => {
    const day: WorkoutDay = {
      date: '2026-10-06',
      workouts: [{ id: 10, date: '2026-10-06', time: '07:00', activity: { id: 1, name: 'Caminhada', category: 'c', calcMode: 'walk', met: null }, durationMin: 45, distanceKm: 4, speedKmh: 5.3, gradePercent: null, avgHeartRate: null, deviceActiveKcal: null, notes: null, source: 'manual', met: 3.5, grossKcal: 250, netKcal: 160, kcalSource: 'calculated' }],
      totals: { sessions: 1, minutes: 45, netKcal: 160, grossKcal: 250, incomplete: false },
    };
    const queue = [ops.workoutCreate('2026-10-06', wp()), ops.workoutDelete(10, '2026-10-06', 'Caminhada')].reduce<OutboxOp[]>(enqueue, []);
    const view = overlayWorkouts('2026-10-06', day, queue);
    expect(view.workouts).toHaveLength(1);
    expect(view.workouts[0]).toMatchObject({ pendingSync: true, netKcal: 400, kcalSource: 'calculated' });
    expect(view.totals).toMatchObject({ sessions: 1, minutes: 60, netKcal: 400 });
  });

  it('pesos: adiciona/atualiza por data e remove por id', () => {
    const base: WeightEntry[] = [{ id: 1, date: '2026-10-05', weightKg: 82, bodyFatPct: null, waistCm: null }, { id: 2, date: '2026-10-06', weightKg: 81.8, bodyFatPct: null, waistCm: null }];
    const queue = [ops.weightAdd('2026-10-06', 81.2, 20, null), ops.weightAdd('2026-10-07', 81, null, null), ops.weightDelete(1, '05/10')].reduce<OutboxOp[]>(enqueue, []);
    const view = overlayWeights(base, queue);
    expect(view.map((w) => [w.date, w.weightKg])).toEqual([['2026-10-06', 81.2], ['2026-10-07', 81]]);
    expect(view[0].id).toBe(2);
  });
});

describe('classifyFailure', () => {
  const op = (method: OutboxOp['method']) => ({ ...q(ops.diaryStatus(1, 'd', 'done', 'x'))[0], method });
  it('sucesso, rede, alvo inexistente e erro de validação', () => {
    expect(classifyFailure(op('PATCH'), null)).toBe('done');
    expect(classifyFailure(op('PATCH'), { status: 0, network: true })).toBe('retry-later');
    expect(classifyFailure(op('DELETE'), { status: 404, network: false })).toBe('drop');
    expect(classifyFailure(op('POST'), { status: 404, network: false })).toBe('failed');
    expect(classifyFailure(op('POST'), { status: 400, network: false })).toBe('failed');
    expect(classifyFailure(op('POST'), { status: 429, network: false })).toBe('retry-later');
    expect(classifyFailure(op('POST'), { status: 401, network: false })).toBe('retry-later');
  });
});
