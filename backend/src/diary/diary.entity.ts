import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Food } from '../foods/food.entity';

export type DiaryKind = 'planned' | 'free';
export type DiaryStatus = 'pending' | 'done' | 'skipped';

/**
 * Registro do dia: ou uma refeição programada (gerada a partir da dieta ativa, que o
 * usuário marca como feita/pulada) ou um consumo livre. Só `done` entra nos totais.
 */
@Entity('diary_entries')
@Index(['date', 'dietEntryId'], { unique: true })
export class DiaryEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'varchar' })
  date: string;

  @Column({ type: 'varchar', nullable: true })
  time: string | null;

  @Column({ type: 'varchar' })
  label: string;

  @Column({ type: 'varchar' })
  kind: DiaryKind;

  @Column({ type: 'varchar', default: 'pending' })
  status: DiaryStatus;

  /** Entrada da dieta que originou o registro (sem FK: o histórico sobrevive a mudanças na dieta). */
  @Column({ type: 'integer', nullable: true })
  dietEntryId: number | null;

  @Column({ type: 'integer', nullable: true })
  mealId: number | null;

  @OneToMany(() => DiaryItem, (i) => i.entry, { cascade: true, eager: true })
  items: DiaryItem[];
}

@Entity('diary_items')
export class DiaryItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DiaryEntry, (e) => e.items, { onDelete: 'CASCADE' })
  entry: DiaryEntry;

  @ManyToOne(() => Food, { eager: true, onDelete: 'RESTRICT' })
  food: Food;

  @Column({ type: 'float' })
  grams: number;
}
