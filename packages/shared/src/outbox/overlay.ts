import { scalePer100, totalsOf } from '../items';
import type { DiaryEntry, Nutrition, WeightEntry, Workout, WorkoutDay } from '../types';
import type { OutboxOp, PreviewItem, WorkoutPreview } from './types';

/** Registro do diário com marca de "ainda não enviado". */
export type DiaryEntryView = DiaryEntry & { pendingSync?: boolean };
export type WorkoutViewWithSync = Workout & { pendingSync?: boolean };

const round1 = (v: number) => Math.round(v * 10) / 10;

function itemViews(items: PreviewItem[]): DiaryEntry['items'] {
  return items.map((i, idx) => {
    const s = scalePer100(i.per100, i.grams);
    return {
      id: -(idx + 1),
      foodId: i.foodId,
      foodName: i.name,
      brand: i.brand,
      source: 'custom' as const,
      grams: i.grams,
      nutrition: { kcal: Math.round(s.kcal), protein: round1(s.protein), carbs: round1(s.carbs), fat: round1(s.fat), fiber: 0, micros: {} },
    };
  });
}

function totalsFor(items: PreviewItem[]): Nutrition {
  const t = totalsOf(items);
  return { kcal: Math.round(t.kcal), protein: round1(t.protein), carbs: round1(t.carbs), fat: round1(t.fat), fiber: 0, micros: {} };
}

/** Aplica ao diário do dia (vindo do servidor/cache) o que ainda está na fila. */
export function overlayDiary(date: string, entries: DiaryEntry[], queue: OutboxOp[]): DiaryEntryView[] {
  let list: DiaryEntryView[] = entries.map((e) => ({ ...e }));
  for (const op of queue) {
    const m = op.meta;
    if (op.error) continue;
    switch (m.kind) {
      case 'diary.status':
        list = list.map((e) => (e.id === m.entryId ? { ...e, status: m.status, pendingSync: true } : e));
        break;
      case 'diary.items':
        list = list.map((e) => (e.id === m.entryId ? { ...e, items: itemViews(m.items), totals: totalsFor(m.items), pendingSync: true } : e));
        break;
      case 'diary.delete':
        list = list.filter((e) => e.id !== m.entryId);
        break;
      case 'diary.free':
        if (m.date === date) {
          list.push({
            id: m.tempId,
            date,
            time: m.time,
            label: m.label || 'Consumo livre',
            kind: 'free',
            status: 'done',
            mealId: null,
            items: itemViews(m.items),
            totals: totalsFor(m.items),
            pendingSync: true,
          });
        }
        break;
      default:
        break;
    }
  }
  return list.sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99') || a.id - b.id);
}

/** Totais do que está "feito" (usado para mostrar o efeito das pendências no consumo do dia). */
export function doneTotals(entries: Array<Pick<DiaryEntry, 'status' | 'totals'>>) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const e of entries) {
    if (e.status !== 'done') continue;
    t.kcal += e.totals.kcal;
    t.protein += e.totals.protein;
    t.carbs += e.totals.carbs;
    t.fat += e.totals.fat;
  }
  return t;
}

function previewToWorkout(id: number, date: string, w: WorkoutPreview): WorkoutViewWithSync {
  return {
    id,
    date,
    time: w.time,
    activity: { id: w.activityId, name: w.activityName, category: w.category, calcMode: w.calcMode, met: w.met },
    durationMin: w.durationMin,
    distanceKm: w.distanceKm,
    speedKmh: w.speedKmh,
    gradePercent: w.gradePercent,
    avgHeartRate: w.avgHeartRate,
    deviceActiveKcal: w.deviceActiveKcal,
    notes: w.notes,
    source: 'manual',
    met: w.met,
    grossKcal: null,
    netKcal: w.deviceActiveKcal ?? w.netKcal,
    kcalSource: w.deviceActiveKcal != null ? 'device' : w.netKcal != null ? 'calculated' : null,
    pendingSync: true,
  };
}

function workoutTotalsOf(workouts: Workout[]): WorkoutDay['totals'] {
  return {
    sessions: workouts.length,
    minutes: Math.round(workouts.reduce((s, w) => s + w.durationMin, 0)),
    netKcal: workouts.reduce((s, w) => s + (w.netKcal ?? 0), 0),
    grossKcal: workouts.reduce((s, w) => s + (w.grossKcal ?? 0), 0),
    incomplete: workouts.some((w) => w.netKcal === null),
  };
}

export function overlayWorkouts(date: string, day: WorkoutDay | undefined, queue: OutboxOp[]): { date: string; workouts: WorkoutViewWithSync[]; totals: WorkoutDay['totals'] } {
  let list: WorkoutViewWithSync[] = (day?.workouts ?? []).map((w) => ({ ...w }));
  for (const op of queue) {
    const m = op.meta;
    if (op.error) continue;
    if (m.kind === 'workout.create' && m.date === date) list.push(previewToWorkout(m.tempId, date, m.workout));
    else if (m.kind === 'workout.update') {
      if (m.date === date) list = list.map((w) => (w.id === m.workoutId ? previewToWorkout(w.id, date, m.workout) : w));
      else list = list.filter((w) => w.id !== m.workoutId); // mudou de dia
    } else if (m.kind === 'workout.delete') list = list.filter((w) => w.id !== m.workoutId);
  }
  list.sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99') || a.id - b.id);
  return { date, workouts: list, totals: workoutTotalsOf(list) };
}

export function overlayWeights(weights: WeightEntry[], queue: OutboxOp[]): Array<WeightEntry & { pendingSync?: boolean }> {
  let list: Array<WeightEntry & { pendingSync?: boolean }> = weights.map((w) => ({ ...w }));
  for (const op of queue) {
    const m = op.meta;
    if (op.error) continue;
    if (m.kind === 'weight.add') {
      const existing = list.find((w) => w.date === m.date);
      const entry = { id: existing?.id ?? -1, date: m.date, weightKg: m.weightKg, bodyFatPct: m.bodyFatPct, waistCm: m.waistCm, pendingSync: true };
      list = existing ? list.map((w) => (w.date === m.date ? entry : w)) : [...list, entry];
    } else if (m.kind === 'weight.delete') list = list.filter((w) => w.id !== m.weightId);
  }
  return list.sort((a, b) => a.date.localeCompare(b.date));
}
