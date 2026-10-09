import type { CalcMode } from '../types';
import type { Per100 } from '../items';

/** Item de uma operação pendente, com o necessário para mostrar totais sem o servidor. */
export interface PreviewItem {
  foodId: number;
  name: string;
  brand: string | null;
  grams: number;
  per100: Per100;
}

export interface WorkoutPreview {
  activityId: number;
  activityName: string;
  category: string;
  calcMode: CalcMode;
  met: number | null;
  time: string | null;
  durationMin: number;
  distanceKm: number | null;
  speedKmh: number | null;
  gradePercent: number | null;
  avgHeartRate: number | null;
  deviceActiveKcal: number | null;
  notes: string | null;
  /** Estimativa de calorias ativas mostrada enquanto pendente (do /estimate ou null). */
  netKcal: number | null;
}

export type OpMeta =
  | { kind: 'diary.status'; entryId: number; date: string; status: 'pending' | 'done' | 'skipped' }
  | { kind: 'diary.items'; entryId: number; date: string; items: PreviewItem[] }
  | { kind: 'diary.free'; tempId: number; date: string; label: string; time: string | null; items: PreviewItem[] }
  | { kind: 'diary.delete'; entryId: number; date: string }
  | { kind: 'workout.create'; tempId: number; date: string; workout: WorkoutPreview }
  | { kind: 'workout.update'; workoutId: number; date: string; workout: WorkoutPreview }
  | { kind: 'workout.delete'; workoutId: number; date: string }
  | { kind: 'weight.add'; date: string; weightKg: number; bodyFatPct: number | null; waistCm: number | null }
  | { kind: 'weight.delete'; weightId: number };

export type OutboxKind = OpMeta['kind'];

/** Uma operação a reenviar ao servidor quando houver conexão. */
export interface OutboxOp {
  /** Também é a Idempotency-Key: reenviar não duplica. */
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  label: string;
  createdAt: string;
  attempts: number;
  /** Rejeitada pelo servidor (erro 4xx): fica na lista até você descartar ou corrigir. */
  error?: string;
  meta: OpMeta;
}
