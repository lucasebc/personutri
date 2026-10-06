import { BodyProfileData, WeightEntryData } from './body.types';
import { ACTIVITY_FACTORS } from './energy';
import { energyOn } from './energy-calculator';

/** Resumo da tela "Corpo": perfil, última pesagem, IMC e as metas da data. */
export function computeBodySummary(profile: BodyProfileData | null, weights: WeightEntryData[], date: string) {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const energy = profile ? energyOn(date, profile, sorted) : null;
  const latest = sorted[sorted.length - 1] ?? null;
  const bmi = latest && profile ? latest.weightKg / (profile.heightCm / 100) ** 2 : null;
  return {
    profile,
    weights: sorted,
    latestWeight: latest,
    bmi: bmi === null ? null : Math.round(bmi * 10) / 10,
    energy: energy && {
      ...energy,
      bmr: Math.round(energy.bmr),
      tdee: Math.round(energy.tdee),
      baseTdee: Math.round(energy.baseTdee),
      exerciseKcal: Math.round(energy.exerciseKcal),
      targetKcal: Math.round(energy.targetKcal),
      macros: {
        protein: Math.round(energy.macros.protein),
        carbs: Math.round(energy.macros.carbs),
        fat: Math.round(energy.macros.fat),
      },
    },
    activityFactors: ACTIVITY_FACTORS,
  };
}
