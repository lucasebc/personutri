import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { FoodSource } from '../common/food-like';
import { Micros } from '../common/nutrients';

export { FoodSource, foodNutrition, normalizeSearch } from '../common/food-like';

/** Alimento ou produto. Todos os valores nutricionais são por 100 g. */
@Entity('foods')
@Index(['source', 'externalId'], { unique: true })
export class Food {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  source: FoodSource;

  /** Nº do alimento na TACO ou código de barras no Open Food Facts. */
  @Column({ type: 'varchar', nullable: true })
  externalId: string | null;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  brand: string | null;

  @Column({ type: 'varchar', nullable: true })
  category: string | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  barcode: string | null;

  /** Nome sem acentos e minúsculo, usado na busca. */
  @Index()
  @Column({ type: 'varchar' })
  searchName: string;

  @Column({ type: 'float' })
  kcal: number;

  @Column({ type: 'float', default: 0 })
  protein: number;

  @Column({ type: 'float', default: 0 })
  carbs: number;

  @Column({ type: 'float', default: 0 })
  fat: number;

  @Column({ type: 'float', default: 0 })
  fiber: number;

  @Column({ type: 'simple-json' })
  micros: Micros;

  /** Porção típica em gramas (ex.: 1 unidade/fatia), quando conhecida. */
  @Column({ type: 'float', nullable: true })
  servingGrams: number | null;

  @Column({ type: 'varchar', nullable: true })
  servingLabel: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
