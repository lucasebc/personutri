/** Nome da atividade genérica do catálogo, usada quando o tipo do Health Connect não tem equivalente. */
export const GENERIC_ACTIVITY = 'Outra atividade';

/**
 * Tipos de exercício do Health Connect (constantes `EXERCISE_TYPE_*` do ExerciseSessionRecord, pelo nome)
 * → nome da atividade no catálogo. O app envia o nome (não o número) para o mapeamento ficar legível e testável.
 */
const MAP: Record<string, string> = {
  WALKING: 'Caminhada',
  RUNNING: 'Corrida',
  RUNNING_TREADMILL: 'Corrida na esteira',
  BIKING: 'Ciclismo ao ar livre',
  BIKING_STATIONARY: 'Bicicleta ergométrica (moderada)',
  STRENGTH_TRAINING: 'Musculação (leve a moderada)',
  WEIGHTLIFTING: 'Musculação (leve a moderada)',
  ELLIPTICAL: 'Elíptico',
  ROWING_MACHINE: 'Remo ergômetro (moderado)',
  ROWING: 'Remo ergômetro (moderado)',
  SWIMMING_POOL: 'Natação (leve a moderada)',
  SWIMMING_OPEN_WATER: 'Natação (leve a moderada)',
  HIKING: 'Trilha / caminhada em terreno irregular',
  YOGA: 'Yoga (hatha)',
  PILATES: 'Pilates',
  STRETCHING: 'Alongamento',
  DANCING: 'Zumba / dança aeróbica',
  HIGH_INTENSITY_INTERVAL_TRAINING: 'Treino funcional / circuito',
  BOOT_CAMP: 'Treino funcional / circuito',
  CALISTHENICS: 'Calistenia (leve a moderada)',
  STAIR_CLIMBING: 'Subir escadas (ritmo rápido)',
  STAIR_CLIMBING_MACHINE: 'Simulador de escada',
  SOCCER: 'Futebol (recreativo)',
  BASKETBALL: 'Basquete (jogo)',
  VOLLEYBALL: 'Vôlei (recreativo)',
  TENNIS: 'Tênis',
  TABLE_TENNIS: 'Tênis de mesa',
  BADMINTON: 'Badminton',
  SQUASH: 'Squash',
  HANDBALL: 'Handebol',
  BOXING: 'Boxe (saco de pancada)',
  MARTIAL_ARTS: 'Jiu-jitsu / judô / karatê / muay thai',
  SKATING: 'Patins',
  EXERCISE_CLASS: 'Ginástica aeróbica (baixo impacto)',
  JUMP_ROPE: 'Pular corda',
  // Exercícios de musculação registrados individualmente
  BENCH_PRESS: 'Musculação (leve a moderada)',
  DEADLIFT: 'Musculação (leve a moderada)',
  SQUAT: 'Musculação (leve a moderada)',
  LUNGE: 'Musculação (leve a moderada)',
  LAT_PULL_DOWN: 'Musculação (leve a moderada)',
  BARBELL_SHOULDER_PRESS: 'Musculação (leve a moderada)',
  BACK_EXTENSION: 'Musculação (leve a moderada)',
  DUMBBELL_CURL_LEFT_ARM: 'Musculação (leve a moderada)',
  DUMBBELL_CURL_RIGHT_ARM: 'Musculação (leve a moderada)',
  DUMBBELL_FRONT_RAISE: 'Musculação (leve a moderada)',
  DUMBBELL_LATERAL_RAISE: 'Musculação (leve a moderada)',
  DUMBBELL_TRICEPS_EXTENSION_LEFT_ARM: 'Musculação (leve a moderada)',
  DUMBBELL_TRICEPS_EXTENSION_RIGHT_ARM: 'Musculação (leve a moderada)',
  DUMBBELL_TRICEPS_EXTENSION_TWO_ARM: 'Musculação (leve a moderada)',
  // Calistenia
  BURPEE: 'Calistenia (intensa)',
  CRUNCH: 'Calistenia (leve a moderada)',
  PLANK: 'Calistenia (leve a moderada)',
  JUMPING_JACK: 'Calistenia (leve a moderada)',
  BENCH_SIT_UP: 'Calistenia (leve a moderada)',
  FORWARD_TWIST: 'Calistenia (leve a moderada)',
  UPPER_TWIST: 'Calistenia (leve a moderada)',
};

/** Aceita "RUNNING", "running" ou "EXERCISE_TYPE_RUNNING". */
export function activityNameForExerciseType(type: string | undefined | null): string {
  const key = (type ?? '').trim().toUpperCase().replace(/^EXERCISE_TYPE_/, '');
  return MAP[key] ?? GENERIC_ACTIVITY;
}

export const MAPPED_EXERCISE_TYPES = Object.keys(MAP);
