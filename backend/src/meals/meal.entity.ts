import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Food } from '../foods/food.entity';

@Entity('meals')
export class Meal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @OneToMany(() => MealItem, (item) => item.meal, { cascade: true, eager: true })
  items: MealItem[];
}

@Entity('meal_items')
export class MealItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Meal, (meal) => meal.items, { onDelete: 'CASCADE' })
  meal: Meal;

  @ManyToOne(() => Food, { eager: true, onDelete: 'RESTRICT' })
  food: Food;

  @Column({ type: 'float' })
  grams: number;
}
