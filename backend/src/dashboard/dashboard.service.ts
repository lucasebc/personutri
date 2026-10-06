import { Injectable } from '@nestjs/common';
import { addDays, dateRange, isValidDate, todayInTz } from '../common/dates';
import {
  addNutrition,
  emptyNutrition,
  FIBER_REFERENCE_G,
  KCAL_PER_G,
  MICRO_KEYS,
  MICRO_META,
  Nutrition,
  round,
  roundNutrition,
} from '../common/nutrients';
import { BodyService } from '../body/body.service';
import { DiaryService } from '../diary/diary.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly body: BodyService,
    private readonly diary: DiaryService,
  ) {}

  async day(dateParam?: string) {
    const date = dateParam && isValidDate(dateParam) ? dateParam : todayInTz();
    const ctx = await this.body.energyContext();
    const { entries } = await this.diary.forDate(date);

    const weekFrom = addDays(date, -6);
    const consumedWeek = await this.diary.consumedByDate(weekFrom, date);
    const consumed: Nutrition = consumedWeek.get(date) ?? emptyNutrition();
    const pending = await this.diary.pendingFor(date);
    const projected = addNutrition(consumed, pending);

    const energy = ctx.on(date);
    const targets = energy && {
      kcal: Math.round(energy.targetKcal),
      protein: Math.round(energy.macros.protein),
      carbs: Math.round(energy.macros.carbs),
      fat: Math.round(energy.macros.fat),
    };

    // Calculado sobre valores arredondados para que a conta feche com os números exibidos.
    const balanceOf = (rawKcal: number) => {
      if (!energy) return null;
      const kcal = Math.round(rawKcal);
      const vsTdee = kcal - Math.round(energy.tdee);
      return {
        vsTdee,
        vsTarget: kcal - Math.round(energy.targetKcal),
        status: Math.abs(vsTdee) <= 100 ? 'maintenance' : vsTdee < 0 ? 'deficit' : 'surplus',
        // kg aproximados se esse balanço se repetisse durante uma semana
        weeklyKg: round((vsTdee * 7) / 7700, 2),
      } as const;
    };

    const pct = (value: number, target?: number) => (target ? Math.round((value / target) * 100) : null);
    const kcalFromMacros = consumed.protein * KCAL_PER_G.protein + consumed.carbs * KCAL_PER_G.carbs + consumed.fat * KCAL_PER_G.fat;
    const split = (g: number, perG: number) => (kcalFromMacros > 0 ? Math.round(((g * perG) / kcalFromMacros) * 100) : 0);

    // Nutriente que nenhum alimento consumido informa (a TACO não tem açúcares nem gordura saturada,
    // por exemplo) aparece como "sem dados", e não como zero.
    const micros = MICRO_KEYS.map((key) => {
      const meta = MICRO_META[key];
      const raw = consumed.micros[key];
      return {
        key,
        label: meta.label,
        unit: meta.unit,
        amount: raw === undefined ? null : round(raw, meta.reference < 5 ? 2 : 1),
        reference: meta.reference,
        kind: meta.kind,
        pct: raw === undefined ? null : Math.round((raw / meta.reference) * 100),
      };
    });

    const week = dateRange(weekFrom, date).map((d) => {
      const e = ctx.on(d);
      return {
        date: d,
        consumed: Math.round(consumedWeek.get(d)?.kcal ?? 0),
        tdee: e ? Math.round(e.tdee) : null,
        target: e ? Math.round(e.targetKcal) : null,
      };
    });

    return {
      date,
      hasProfile: !!ctx.profile,
      hasWeight: ctx.weights.length > 0,
      energy: energy && {
        weightKg: energy.weightKg,
        bmr: Math.round(energy.bmr),
        tdee: Math.round(energy.tdee),
        targetKcal: targets!.kcal,
      },
      targets,
      consumed: roundNutrition(consumed),
      pending: roundNutrition(pending),
      projected: roundNutrition(projected),
      balance: balanceOf(consumed.kcal),
      projectedBalance: balanceOf(projected.kcal),
      remainingKcal: targets ? targets.kcal - Math.round(consumed.kcal) : null,
      macros: {
        protein: { consumed: round(consumed.protein), target: targets?.protein ?? null, pct: pct(consumed.protein, targets?.protein), kcalPct: split(consumed.protein, 4) },
        carbs: { consumed: round(consumed.carbs), target: targets?.carbs ?? null, pct: pct(consumed.carbs, targets?.carbs), kcalPct: split(consumed.carbs, 4) },
        fat: { consumed: round(consumed.fat), target: targets?.fat ?? null, pct: pct(consumed.fat, targets?.fat), kcalPct: split(consumed.fat, 9) },
        fiber: { consumed: round(consumed.fiber), target: FIBER_REFERENCE_G, pct: pct(consumed.fiber, FIBER_REFERENCE_G) },
      },
      micros,
      meals: entries.map((e) => ({
        id: e.id,
        time: e.time,
        label: e.label,
        kind: e.kind,
        status: e.status,
        kcal: e.totals.kcal,
      })),
      mealsDone: entries.filter((e) => e.status === 'done').length,
      mealsTotal: entries.filter((e) => e.status !== 'skipped').length,
      week,
    };
  }
}
