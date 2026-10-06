import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Meal } from '../meals/meal.entity';

/** Dieta = agenda semanal de refeições. Só uma fica ativa por vez. */
@Entity('diets')
export class Diet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'boolean', default: false })
  active: boolean;

  @OneToMany(() => DietEntry, (e) => e.diet, { cascade: true, eager: true })
  entries: DietEntry[];
}

@Entity('diet_entries')
export class DietEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Diet, (d) => d.entries, { onDelete: 'CASCADE' })
  diet: Diet;

  @ManyToOne(() => Meal, { eager: true, onDelete: 'RESTRICT' })
  meal: Meal;

  /** Nome no dia a dia: "Café da manhã", "Lanche da tarde"... */
  @Column({ type: 'varchar' })
  label: string;

  /** "HH:mm" */
  @Column({ type: 'varchar' })
  time: string;

  /** 0 = domingo ... 6 = sábado */
  @Column({
    type: 'varchar',
    transformer: {
      to: (v: number[]) => (v ?? []).join(','),
      from: (v: string) => (v ? v.split(',').map(Number) : []),
    },
  })
  weekdays: number[];
}
