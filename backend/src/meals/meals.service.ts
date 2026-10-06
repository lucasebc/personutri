import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DietEntry } from '../diets/diet.entity';
import { FoodsService } from '../foods/foods.service';
import { Meal, MealItem } from './meal.entity';
import { mealView } from './meal-view';
import { MealDto } from './meals.dto';

@Injectable()
export class MealsService {
  constructor(
    @InjectRepository(Meal) private readonly repo: Repository<Meal>,
    @InjectRepository(MealItem) private readonly itemRepo: Repository<MealItem>,
    @InjectRepository(DietEntry) private readonly dietEntries: Repository<DietEntry>,
    private readonly foods: FoodsService,
  ) {}

  view(meal: Meal) {
    return mealView(meal);
  }

  async list() {
    const meals = await this.repo.find({ order: { name: 'ASC' } });
    return meals.map((m) => this.view(m));
  }

  async getEntity(id: number): Promise<Meal> {
    const meal = await this.repo.findOneBy({ id });
    if (!meal) throw new NotFoundException(`Refeição ${id} não encontrada`);
    return meal;
  }

  async get(id: number) {
    return this.view(await this.getEntity(id));
  }

  async create(dto: MealDto) {
    const meal = this.repo.create({ name: dto.name.trim(), notes: dto.notes?.trim() || null, items: [] });
    meal.items = await this.buildItems(dto);
    return this.view(await this.repo.save(meal));
  }

  async update(id: number, dto: MealDto) {
    const meal = await this.getEntity(id);
    meal.name = dto.name.trim();
    meal.notes = dto.notes?.trim() || null;
    // Substitui os itens: apaga os antigos e grava os novos.
    await this.itemRepo.remove(meal.items);
    meal.items = await this.buildItems(dto);
    return this.view(await this.repo.save(meal));
  }

  async remove(id: number) {
    const meal = await this.getEntity(id);
    const inUse = await this.dietEntries.count({ where: { meal: { id } } });
    if (inUse > 0) throw new BadRequestException('Esta refeição faz parte de uma dieta. Remova-a da dieta primeiro.');
    await this.repo.remove(meal);
  }

  private async buildItems(dto: MealDto): Promise<Meal['items']> {
    const foods = await this.foods.getMany(dto.items.map((i) => i.foodId));
    return dto.items.map((i) => {
      const food = foods.get(i.foodId);
      if (!food) throw new BadRequestException(`Alimento ${i.foodId} não existe`);
      return { food, grams: i.grams } as Meal['items'][number];
    });
  }
}
