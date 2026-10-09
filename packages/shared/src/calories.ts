// CÓPIA de backend/src/exercise/calories.ts (para estimar calorias offline). Não edite aqui: o teste de paridade
// em backend/src/exercise/shared-parity.spec.ts compara este arquivo com o original.
/**
 * Cálculo de calorias de exercício (funções puras).
 *
 * Base: 1 MET ≈ 1 kcal por kg por hora (Compendium of Physical Activities).
 *  - bruto  = MET × kg × h            (inclui o gasto de repouso)
 *  - líquido = (MET − 1) × kg × h     (só o que o treino acrescenta ao repouso)
 * Para caminhada e corrida usamos as equações metabólicas do ACSM, que levam em conta
 * velocidade e inclinação; para ciclismo, uma interpolação da tabela de MET por velocidade.
 */

export type CalcMode = 'met' | 'walk' | 'run' | 'cycle';

/** Velocidade (m/min) acima da qual a equação de caminhada deixa de valer e usamos a de corrida (~7,2 km/h). */
const WALK_RUN_SWITCH_M_MIN = 120;

const kmhToMMin = (kmh: number) => (kmh * 1000) / 60;

/** ACSM, caminhada: VO2 = 0,1·v + 1,8·v·inclinação + 3,5 (ml/kg/min); MET = VO2 / 3,5. */
export function walkMet(speedKmh: number, gradePercent = 0): number {
  const v = kmhToMMin(speedKmh);
  if (v > WALK_RUN_SWITCH_M_MIN) return runMet(speedKmh, gradePercent);
  return (0.1 * v + 1.8 * v * (gradePercent / 100) + 3.5) / 3.5;
}

/** ACSM, corrida: VO2 = 0,2·v + 0,9·v·inclinação + 3,5. */
export function runMet(speedKmh: number, gradePercent = 0): number {
  const v = kmhToMMin(speedKmh);
  return (0.2 * v + 0.9 * v * (gradePercent / 100) + 3.5) / 3.5;
}

/** Compendium: ciclismo de lazer (<16 km/h) 4,0 … competitivo (>32 km/h) 15,8. */
const CYCLE_POINTS: Array<[number, number]> = [
  [10, 3.5],
  [16, 4.0],
  [17.6, 6.8],
  [20.8, 8.0],
  [24, 10.0],
  [28.2, 12.0],
  [32, 15.8],
];

export function cycleMet(speedKmh: number): number {
  if (speedKmh <= CYCLE_POINTS[0][0]) return CYCLE_POINTS[0][1];
  for (let i = 1; i < CYCLE_POINTS.length; i++) {
    const [x1, y1] = CYCLE_POINTS[i];
    if (speedKmh <= x1) {
      const [x0, y0] = CYCLE_POINTS[i - 1];
      return y0 + ((speedKmh - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return CYCLE_POINTS[CYCLE_POINTS.length - 1][1];
}

export interface ActivityCalcLike {
  calcMode: CalcMode;
  met: number | null;
}

export interface WorkoutCalcInput {
  durationMin: number;
  speedKmh?: number | null;
  distanceKm?: number | null;
  gradePercent?: number | null;
  /** Calorias ativas medidas por um dispositivo (relógio): têm prioridade sobre o cálculo. */
  deviceActiveKcal?: number | null;
}

export interface WorkoutCalories {
  met: number | null;
  speedKmh: number | null;
  /** Inclui o repouso. */
  grossKcal: number | null;
  /** Acima do repouso: é o que entra no gasto diário. */
  netKcal: number | null;
  source: 'device' | 'calculated' | null;
}

/** Velocidade informada ou derivada da distância e da duração. */
export function effectiveSpeedKmh(w: Pick<WorkoutCalcInput, 'durationMin' | 'speedKmh' | 'distanceKm'>): number | null {
  if (w.speedKmh != null && w.speedKmh > 0) return w.speedKmh;
  if (w.distanceKm != null && w.distanceKm > 0 && w.durationMin > 0) return w.distanceKm / (w.durationMin / 60);
  return null;
}

export function activityMet(activity: ActivityCalcLike, speedKmh: number | null, gradePercent: number | null): number | null {
  switch (activity.calcMode) {
    case 'met':
      return activity.met;
    case 'walk':
      return speedKmh === null ? null : walkMet(speedKmh, gradePercent ?? 0);
    case 'run':
      return speedKmh === null ? null : runMet(speedKmh, gradePercent ?? 0);
    case 'cycle':
      return speedKmh === null ? null : cycleMet(speedKmh);
  }
}

/** `weightKg` é o peso vigente na data do treino (null se o usuário ainda não registrou peso). */
export function workoutCalories(activity: ActivityCalcLike, w: WorkoutCalcInput, weightKg: number | null): WorkoutCalories {
  const hours = w.durationMin / 60;
  const speedKmh = effectiveSpeedKmh(w);
  const met = activityMet(activity, speedKmh, w.gradePercent ?? null);
  const resting = weightKg === null ? null : weightKg * hours;

  if (w.deviceActiveKcal != null) {
    return {
      met,
      speedKmh,
      netKcal: w.deviceActiveKcal,
      grossKcal: resting === null ? null : w.deviceActiveKcal + resting,
      source: 'device',
    };
  }
  if (met === null || weightKg === null) return { met, speedKmh, grossKcal: null, netKcal: null, source: null };
  return {
    met,
    speedKmh,
    grossKcal: met * weightKg * hours,
    netKcal: Math.max(0, met - 1) * weightKg * hours,
    source: 'calculated',
  };
}
