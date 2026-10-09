import { doneTotals } from './outbox/overlay';
import type { DiaryEntry, Dashboard } from './types';

const pendingKcal = (entries: Array<Pick<DiaryEntry, 'status' | 'kind' | 'totals'>>) =>
  entries.filter((e) => e.kind === 'planned' && e.status === 'pending').reduce((s, e) => s + e.totals.kcal, 0);

/**
 * Ajusta o dashboard em cache ao que ainda não foi enviado ao servidor: compara a agenda do servidor
 * (`base`) com a agenda já com as pendências (`view`). Micronutrientes não são recalculados offline.
 */
export function applyPendingToDashboard(d: Dashboard, base: DiaryEntry[], view: Array<Pick<DiaryEntry, 'id' | 'time' | 'label' | 'kind' | 'status' | 'totals'>>): Dashboard {
  const before = doneTotals(base);
  const after = doneTotals(view);
  const delta = { kcal: after.kcal - before.kcal, protein: after.protein - before.protein, carbs: after.carbs - before.carbs, fat: after.fat - before.fat };
  const dPending = pendingKcal(view) - pendingKcal(base);
  const unchanged = !delta.kcal && !delta.protein && !delta.carbs && !delta.fat && !dPending && view.length === base.length && view.every((e, i) => e.status === base[i]?.status && e.id === base[i]?.id);
  if (unchanged) return d;

  const consumed = {
    ...d.consumed,
    kcal: Math.round(d.consumed.kcal + delta.kcal),
    protein: Math.round((d.consumed.protein + delta.protein) * 10) / 10,
    carbs: Math.round((d.consumed.carbs + delta.carbs) * 10) / 10,
    fat: Math.round((d.consumed.fat + delta.fat) * 10) / 10,
  };
  const pending = { ...d.pending, kcal: Math.max(0, Math.round(d.pending.kcal + dPending)) };
  const projected = { ...d.projected, kcal: consumed.kcal + pending.kcal };

  const balanceOf = (kcal: number) => {
    if (!d.energy) return null;
    const vsTdee = kcal - d.energy.tdee;
    return {
      vsTdee,
      vsTarget: kcal - d.energy.targetKcal,
      status: (Math.abs(vsTdee) <= 100 ? 'maintenance' : vsTdee < 0 ? 'deficit' : 'surplus') as 'maintenance' | 'deficit' | 'surplus',
      weeklyKg: Math.round(((vsTdee * 7) / 7700) * 100) / 100,
    };
  };

  const pct = (v: number, t: number | null) => (t ? Math.round((v / t) * 100) : null);
  const kcalFromMacros = consumed.protein * 4 + consumed.carbs * 4 + consumed.fat * 9;
  const split = (g: number, perG: number) => (kcalFromMacros > 0 ? Math.round(((g * perG) / kcalFromMacros) * 100) : 0);

  return {
    ...d,
    consumed,
    pending,
    projected,
    balance: balanceOf(consumed.kcal),
    projectedBalance: balanceOf(projected.kcal),
    remainingKcal: d.targets ? d.targets.kcal - consumed.kcal : null,
    macros: {
      protein: { ...d.macros.protein, consumed: consumed.protein, pct: pct(consumed.protein, d.macros.protein.target), kcalPct: split(consumed.protein, 4) },
      carbs: { ...d.macros.carbs, consumed: consumed.carbs, pct: pct(consumed.carbs, d.macros.carbs.target), kcalPct: split(consumed.carbs, 4) },
      fat: { ...d.macros.fat, consumed: consumed.fat, pct: pct(consumed.fat, d.macros.fat.target), kcalPct: split(consumed.fat, 9) },
      fiber: d.macros.fiber,
    },
    meals: view.map((e) => ({ id: e.id, time: e.time, label: e.label, kind: e.kind, status: e.status, kcal: e.totals.kcal })),
    mealsDone: view.filter((e) => e.status === 'done').length,
    mealsTotal: view.filter((e) => e.status !== 'skipped').length,
  };
}
