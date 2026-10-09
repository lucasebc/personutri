import { buildWeightImports, buildWorkoutImport, dedupeSessions, HcSession, localDateTime, lookbackStart } from './health/sync';
import { planReminders } from './health/reminders';

const session = (over: Partial<HcSession> = {}): HcSession => ({
  id: 'hc-1', startTime: '2026-10-06T10:00:00Z', endTime: '2026-10-06T10:45:00Z', startOffsetSeconds: -10800, exerciseType: 56, title: 'Corrida', dataOrigin: 'com.sec.android.app.shealth', ...over,
});

describe('localDateTime', () => {
  it('usa o deslocamento do registro (virada de dia)', () => {
    expect(localDateTime('2026-10-07T01:30:00Z', -10800)).toEqual({ date: '2026-10-06', time: '22:30' });
    expect(localDateTime('2026-10-06T10:00:00Z', 0)).toEqual({ date: '2026-10-06', time: '10:00' });
  });
  it('sem deslocamento usa o do aparelho', () => {
    expect(localDateTime('2026-10-06T10:00:00Z', null, -180)).toEqual({ date: '2026-10-06', time: '07:00' });
  });
});

describe('buildWorkoutImport', () => {
  it('monta o item com calorias ativas, distância e FC', () => {
    const r = buildWorkoutImport(session(), { activeKcal: 412.6, totalKcal: 520, distanceM: 6234, avgHeartRate: 151.4 }, { typeName: 'RUNNING', weightKg: 82 })!;
    expect(r.kcalSource).toBe('active');
    expect(r.item).toEqual({ externalId: 'hc-1', date: '2026-10-06', time: '07:00', exerciseType: 'RUNNING', durationMin: 45, title: 'Corrida', distanceKm: 6.23, avgHeartRate: 151, deviceActiveKcal: 413 });
  });

  it('só calorias totais: desconta o repouso (1 kcal/kg/h)', () => {
    const r = buildWorkoutImport(session(), { totalKcal: 500 }, { typeName: 'RUNNING', weightKg: 80 })!;
    expect(r.kcalSource).toBe('total-minus-resting');
    expect(r.item.deviceActiveKcal).toBe(440); // 500 − 80 × 0,75 h
  });

  it('sem calorias deixa o cálculo por MET para o servidor', () => {
    const r = buildWorkoutImport(session(), {}, { typeName: 'WALKING', weightKg: 80 })!;
    expect(r.kcalSource).toBe('none');
    expect(r.item.deviceActiveKcal).toBeUndefined();
  });

  it('totais menores que o repouso não geram calorias negativas', () => {
    const r = buildWorkoutImport(session(), { totalKcal: 30 }, { typeName: 'RUNNING', weightKg: 80 })!;
    expect(r.item.deviceActiveKcal).toBeUndefined();
  });

  it('descarta sessões de menos de 1 minuto e FC fora da faixa', () => {
    expect(buildWorkoutImport(session({ endTime: '2026-10-06T10:00:30Z' }), {}, { typeName: 'RUNNING' })).toBeNull();
    expect(buildWorkoutImport(session(), { avgHeartRate: 400 }, { typeName: 'RUNNING' })!.item.avgHeartRate).toBeUndefined();
  });
});

describe('dedupeSessions', () => {
  const a = session({ id: 'a', dataOrigin: 'com.sec.android.app.shealth' });
  const b = session({ id: 'b', dataOrigin: 'com.google.android.apps.fitness', endTime: '2026-10-06T10:46:00Z' });
  it('mantém a origem preferida entre sessões sobrepostas do mesmo tipo', () => {
    expect(dedupeSessions([b, a], ['com.sec.android.app.shealth']).map((s) => s.id)).toEqual(['a']);
  });
  it('sem preferência fica a mais longa', () => {
    expect(dedupeSessions([a, b]).map((s) => s.id)).toEqual(['b']);
  });
  it('tipos diferentes ou horários distintos não são duplicatas', () => {
    const c = session({ id: 'c', exerciseType: 79 });
    const d = session({ id: 'd', startTime: '2026-10-06T18:00:00Z', endTime: '2026-10-06T18:40:00Z' });
    expect(dedupeSessions([a, c, d]).map((s) => s.id).sort()).toEqual(['a', 'c', 'd']);
  });
});

describe('buildWeightImports', () => {
  it('uma pesagem por dia (a última) e gordura do mesmo dia', () => {
    const r = buildWeightImports(
      [
        { time: '2026-10-06T10:00:00Z', offsetSeconds: -10800, kg: 82.04 },
        { time: '2026-10-06T21:00:00Z', offsetSeconds: -10800, kg: 81.6 },
        { time: '2026-10-05T10:00:00Z', offsetSeconds: -10800, kg: 82.5 },
        { time: '2026-10-04T10:00:00Z', offsetSeconds: -10800, kg: 5 }, // inválido
      ],
      [{ time: '2026-10-06T10:05:00Z', offsetSeconds: -10800, percentage: 21.3 }],
    );
    expect(r).toEqual([
      { date: '2026-10-05', weightKg: 82.5, bodyFatPct: null },
      { date: '2026-10-06', weightKg: 81.6, bodyFatPct: 21.3 },
    ]);
  });
});

describe('lookbackStart', () => {
  it('recua N dias', () => {
    expect(lookbackStart(new Date('2026-10-31T12:00:00Z'), 30).toISOString()).toBe('2026-10-01T12:00:00.000Z');
  });
});

describe('planReminders', () => {
  it('um lembrete por dia da semana, 10 min antes, com weekday 1–7', () => {
    const r = planReminders([{ id: 4, label: 'Almoço', time: '12:30', weekdays: [1, 3], mealName: 'Almoço padrão', kcal: 772.4 }]);
    expect(r).toEqual([
      { key: 'meal-4-1', weekday: 2, hour: 12, minute: 20, title: 'Almoço', body: 'Almoço padrão · 772 kcal às 12:30' },
      { key: 'meal-4-3', weekday: 4, hour: 12, minute: 20, title: 'Almoço', body: 'Almoço padrão · 772 kcal às 12:30' },
    ]);
  });
  it('antes da meia-noite volta para o dia anterior', () => {
    const [r] = planReminders([{ id: 1, label: 'Ceia', time: '00:05', weekdays: [0], mealName: 'x', kcal: 100 }], 10);
    expect(r).toMatchObject({ weekday: 7, hour: 23, minute: 55 }); // domingo 00:05 → sábado 23:55
  });
});
