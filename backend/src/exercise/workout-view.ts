import { ActivityCalcLike, workoutCalories } from './calories';

export interface WorkoutLike {
  id: number;
  date: string;
  time: string | null;
  activity: ActivityCalcLike & { id: number; name: string; category: string };
  durationMin: number;
  distanceKm: number | null;
  speedKmh: number | null;
  gradePercent: number | null;
  avgHeartRate: number | null;
  deviceActiveKcal: number | null;
  notes: string | null;
  source: 'manual' | 'device';
}

const r1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);

/** `weightKg` = peso vigente na data do treino. */
export function workoutView(w: WorkoutLike, weightKg: number | null) {
  const c = workoutCalories(w.activity, w, weightKg);
  return {
    id: w.id,
    date: w.date,
    time: w.time,
    activity: { id: w.activity.id, name: w.activity.name, category: w.activity.category, calcMode: w.activity.calcMode, met: w.activity.met },
    durationMin: w.durationMin,
    distanceKm: w.distanceKm,
    speedKmh: r1(c.speedKmh),
    gradePercent: w.gradePercent,
    avgHeartRate: w.avgHeartRate,
    deviceActiveKcal: w.deviceActiveKcal,
    notes: w.notes,
    source: w.source,
    met: r1(c.met),
    grossKcal: c.grossKcal === null ? null : Math.round(c.grossKcal),
    netKcal: c.netKcal === null ? null : Math.round(c.netKcal),
    kcalSource: c.source,
  };
}

export type WorkoutView = ReturnType<typeof workoutView>;

export function workoutTotals(views: WorkoutView[]) {
  return {
    sessions: views.length,
    minutes: Math.round(views.reduce((s, w) => s + w.durationMin, 0)),
    netKcal: views.reduce((s, w) => s + (w.netKcal ?? 0), 0),
    grossKcal: views.reduce((s, w) => s + (w.grossKcal ?? 0), 0),
    /** Algum treino ficou sem calorias por falta de peso/velocidade. */
    incomplete: views.some((w) => w.netKcal === null),
  };
}
