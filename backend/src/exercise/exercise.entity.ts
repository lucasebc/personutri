import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CalcMode } from './calories';

/** Atividade do catálogo (embutida ou criada pelo usuário). */
@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  category: string;

  /** met = MET fixo; walk/run/cycle = calculado pela velocidade (e inclinação). */
  @Column({ type: 'varchar', default: 'met' })
  calcMode: CalcMode;

  @Column({ type: 'float', nullable: true })
  met: number | null;

  /** Itens do catálogo embutido não podem ser editados nem removidos. */
  @Column({ type: 'boolean', default: false })
  builtin: boolean;

  @Index()
  @Column({ type: 'varchar' })
  searchName: string;
}

export type WorkoutSource = 'manual' | 'device';

/** Treino/atividade realizado. */
@Entity('workouts')
@Index(['source', 'externalId'], { unique: true })
export class Workout {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'varchar' })
  date: string;

  @Column({ type: 'varchar', nullable: true })
  time: string | null;

  @ManyToOne(() => Activity, { eager: true, onDelete: 'RESTRICT' })
  activity: Activity;

  @Column({ type: 'float' })
  durationMin: number;

  @Column({ type: 'float', nullable: true })
  distanceKm: number | null;

  @Column({ type: 'float', nullable: true })
  speedKmh: number | null;

  @Column({ type: 'float', nullable: true })
  gradePercent: number | null;

  @Column({ type: 'integer', nullable: true })
  avgHeartRate: number | null;

  /** Calorias ativas medidas por relógio/app: quando presentes, valem mais que o cálculo. */
  @Column({ type: 'float', nullable: true })
  deviceActiveKcal: number | null;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', default: 'manual' })
  source: WorkoutSource;

  /** Id do registro na origem (ex.: Health Connect), para não duplicar numa reimportação. */
  @Column({ type: 'varchar', nullable: true })
  externalId: string | null;
}
