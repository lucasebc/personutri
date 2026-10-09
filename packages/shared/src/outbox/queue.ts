import type { OpMeta, OutboxOp, PreviewItem, WorkoutPreview } from './types';

/** IDs negativos identificam registros criados offline e ainda não confirmados pelo servidor. */
let tempSeq = 0;
export const newTempId = () => -(Date.now() % 1_000_000_000) - ++tempSeq;
export const isTempId = (id: number) => id < 0;

export function newOpId(): string {
  const rnd = () => Math.random().toString(36).slice(2, 10);
  return `op-${Date.now().toString(36)}-${rnd()}${rnd()}`;
}

const itemInputs = (items: PreviewItem[]) => items.map((i) => ({ foodId: i.foodId, grams: i.grams }));

export function workoutBody(date: string, w: WorkoutPreview) {
  return {
    date,
    time: w.time ?? undefined,
    activityId: w.activityId,
    durationMin: w.durationMin,
    distanceKm: w.distanceKm ?? undefined,
    speedKmh: w.speedKmh ?? undefined,
    gradePercent: w.gradePercent ?? undefined,
    avgHeartRate: w.avgHeartRate ?? undefined,
    deviceActiveKcal: w.deviceActiveKcal ?? undefined,
    notes: w.notes ?? undefined,
  };
}

type NewOp = Omit<OutboxOp, 'id' | 'createdAt' | 'attempts'> & { id?: string };

/** Constrói as operações. A UI usa estes construtores e nunca monta `OutboxOp` à mão. */
export const ops = {
  diaryStatus(entryId: number, date: string, status: 'pending' | 'done' | 'skipped', label: string): NewOp {
    return { method: 'PATCH', path: `/diary/entries/${entryId}`, body: { status }, label, meta: { kind: 'diary.status', entryId, date, status } };
  },
  diaryItems(entryId: number, date: string, items: PreviewItem[], label: string): NewOp {
    return { method: 'PATCH', path: `/diary/entries/${entryId}`, body: { items: itemInputs(items) }, label, meta: { kind: 'diary.items', entryId, date, items } };
  },
  diaryFree(date: string, label: string, time: string | null, items: PreviewItem[]): NewOp {
    const tempId = newTempId();
    return {
      method: 'POST',
      path: `/diary/${date}/free`,
      body: { label: label || undefined, time: time ?? undefined, items: itemInputs(items) },
      label: label || 'Consumo livre',
      meta: { kind: 'diary.free', tempId, date, label, time, items },
    };
  },
  diaryDelete(entryId: number, date: string, label: string): NewOp {
    return { method: 'DELETE', path: `/diary/entries/${entryId}`, label: `Remover ${label}`, meta: { kind: 'diary.delete', entryId, date } };
  },
  workoutCreate(date: string, workout: WorkoutPreview): NewOp {
    const tempId = newTempId();
    return { method: 'POST', path: '/workouts', body: workoutBody(date, workout), label: workout.activityName, meta: { kind: 'workout.create', tempId, date, workout } };
  },
  workoutUpdate(workoutId: number, date: string, workout: WorkoutPreview): NewOp {
    return { method: 'PUT', path: `/workouts/${workoutId}`, body: workoutBody(date, workout), label: workout.activityName, meta: { kind: 'workout.update', workoutId, date, workout } };
  },
  workoutDelete(workoutId: number, date: string, label: string): NewOp {
    return { method: 'DELETE', path: `/workouts/${workoutId}`, label: `Remover ${label}`, meta: { kind: 'workout.delete', workoutId, date } };
  },
  weightAdd(date: string, weightKg: number, bodyFatPct: number | null, waistCm: number | null): NewOp {
    return {
      method: 'POST',
      path: '/body/weights',
      body: { date, weightKg, bodyFatPct: bodyFatPct ?? undefined, waistCm: waistCm ?? undefined },
      label: `Peso ${weightKg} kg`,
      meta: { kind: 'weight.add', date, weightKg, bodyFatPct, waistCm },
    };
  },
  weightDelete(weightId: number, label: string): NewOp {
    return { method: 'DELETE', path: `/body/weights/${weightId}`, label: `Remover ${label}`, meta: { kind: 'weight.delete', weightId } };
  },
};

const finish = (op: NewOp): OutboxOp => ({ attempts: 0, createdAt: new Date().toISOString(), ...op, id: op.id ?? newOpId() });

const without = (list: OutboxOp[], pred: (o: OutboxOp) => boolean) => list.filter((o) => !pred(o));

/**
 * Acrescenta uma operação à fila, simplificando quando possível:
 *  - editar/apagar algo ainda não enviado altera ou cancela a operação de criação (nada vai ao servidor);
 *  - a última alteração de status/itens/treino de um mesmo registro substitui as anteriores.
 */
export function enqueue(list: OutboxOp[], input: NewOp): OutboxOp[] {
  const m: OpMeta = input.meta;
  switch (m.kind) {
    case 'diary.status': {
      if (isTempId(m.entryId)) return list; // consumo livre criado offline é sempre "feito"
      return [...without(list, (o) => o.meta.kind === 'diary.status' && o.meta.entryId === m.entryId), finish(input)];
    }
    case 'diary.items': {
      if (isTempId(m.entryId)) {
        return list.map((o) =>
          o.meta.kind === 'diary.free' && o.meta.tempId === m.entryId
            ? { ...o, body: { ...(o.body as object), items: itemInputs(m.items) }, meta: { ...o.meta, items: m.items } }
            : o,
        );
      }
      return [...without(list, (o) => o.meta.kind === 'diary.items' && o.meta.entryId === m.entryId), finish(input)];
    }
    case 'diary.delete': {
      if (isTempId(m.entryId)) return without(list, (o) => o.meta.kind === 'diary.free' && o.meta.tempId === m.entryId);
      return [
        ...without(list, (o) => (o.meta.kind === 'diary.status' || o.meta.kind === 'diary.items') && o.meta.entryId === m.entryId),
        finish(input),
      ];
    }
    case 'workout.update': {
      if (isTempId(m.workoutId)) {
        return list.map((o) =>
          o.meta.kind === 'workout.create' && o.meta.tempId === m.workoutId ? { ...o, body: input.body, label: input.label, meta: { ...o.meta, date: m.date, workout: m.workout } } : o,
        );
      }
      return [...without(list, (o) => o.meta.kind === 'workout.update' && o.meta.workoutId === m.workoutId), finish(input)];
    }
    case 'workout.delete': {
      if (isTempId(m.workoutId)) return without(list, (o) => o.meta.kind === 'workout.create' && o.meta.tempId === m.workoutId);
      return [...without(list, (o) => o.meta.kind === 'workout.update' && o.meta.workoutId === m.workoutId), finish(input)];
    }
    case 'weight.add':
      return [...without(list, (o) => o.meta.kind === 'weight.add' && o.meta.date === m.date), finish(input)];
    case 'weight.delete':
      return [...without(list, (o) => o.meta.kind === 'weight.delete' && o.meta.weightId === m.weightId), finish(input)];
    default:
      return [...list, finish(input)];
  }
}

export type FlushOutcome = 'done' | 'retry-later' | 'drop' | 'failed';

/** O que fazer com uma operação depois de uma resposta/erro do servidor. */
export function classifyFailure(op: OutboxOp, err: { status: number; network: boolean } | null): FlushOutcome {
  if (!err) return 'done';
  if (err.network) return 'retry-later';
  // alvo já não existe no servidor: apagar/editar é inútil e não deve travar a fila
  if (err.status === 404 && (op.method === 'DELETE' || op.method === 'PATCH' || op.method === 'PUT')) return 'drop';
  if (err.status === 401 || err.status === 429) return 'retry-later';
  return 'failed';
}

export const pendingCount = (list: OutboxOp[]) => list.filter((o) => !o.error).length;
