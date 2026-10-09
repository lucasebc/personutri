import { CATALOG } from './catalog';
import { activityNameForExerciseType, GENERIC_ACTIVITY, MAPPED_EXERCISE_TYPES } from './health-connect-map';

describe('health-connect-map', () => {
  it('todo tipo mapeado aponta para uma atividade que existe no catálogo', () => {
    const names = new Set(CATALOG.map((c) => c.name));
    for (const t of MAPPED_EXERCISE_TYPES) expect(names.has(activityNameForExerciseType(t))).toBe(true);
    expect(names.has(GENERIC_ACTIVITY)).toBe(true);
  });

  it('aceita variações de escrita', () => {
    expect(activityNameForExerciseType('RUNNING')).toBe('Corrida');
    expect(activityNameForExerciseType('running')).toBe('Corrida');
    expect(activityNameForExerciseType('EXERCISE_TYPE_WALKING')).toBe('Caminhada');
  });

  it('tipo desconhecido ou ausente cai na atividade genérica', () => {
    expect(activityNameForExerciseType('PARAGLIDING')).toBe(GENERIC_ACTIVITY);
    expect(activityNameForExerciseType(undefined)).toBe(GENERIC_ACTIVITY);
  });
});
