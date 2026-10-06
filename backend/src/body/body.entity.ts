import { Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import { BodyProfileData, WeightEntryData } from './body.types';
import { ActivityLevel, ActivityMode, BmrFormula, Sex } from './energy';

/** Perfil corporal do usuário (app de usuário único: sempre id = 1). */
@Entity('body_profile')
export class BodyProfile implements BodyProfileData {
  @PrimaryColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'varchar' })
  sex: Sex;

  /** YYYY-MM-DD */
  @Column({ type: 'varchar' })
  birthDate: string;

  @Column({ type: 'float' })
  heightCm: number;

  @Column({ type: 'varchar' })
  activityLevel: ActivityLevel;

  /** Variação de peso desejada por semana, em kg (negativo = emagrecer). */
  @Column({ type: 'float', default: 0 })
  weeklyGoalKg: number;

  @Column({ type: 'float', nullable: true })
  targetWeightKg: number | null;

  @Column({ type: 'float', default: 1.8 })
  proteinPerKg: number;

  @Column({ type: 'float', default: 25 })
  fatPercent: number;

  @Column({ type: 'varchar', default: 'mifflin' })
  bmrFormula: BmrFormula;

  @Column({ type: 'varchar', default: 'level' })
  activityMode: ActivityMode;
}

@Entity('weight_entries')
export class WeightEntry implements WeightEntryData {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  date: string;

  @Column({ type: 'float' })
  weightKg: number;

  @Column({ type: 'float', nullable: true })
  bodyFatPct: number | null;

  @Column({ type: 'float', nullable: true })
  waistCm: number | null;
}
