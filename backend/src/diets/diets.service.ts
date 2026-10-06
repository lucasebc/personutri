import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { totalOf } from '../common/item-view';
import { addNutrition, emptyNutrition, Nutrition, roundNutrition } from '../common/nutrients';
import { MealsService } from '../meals/meals.service';
import { Diet, DietEntry } from './diet.entity';
import { DietDto } from './diets.dto';

@Injectable()
export class DietsService {
  constructor(
    @InjectRepository(Diet) private readonly repo: Repository<Diet>,
    @InjectRepository(DietEntry) private readonly entryRepo: Repository<DietEntry>,
    private readonly meals: MealsService,
  ) {}

  view(diet: Diet) {
    const entries = [...diet.entries]
      .sort((a, b) => a.time.localeCompare(b.time))
      .map((e) => ({
        id: e.id,
        label: e.label,
        time: e.time,
        weekdays: e.weekdays,
        meal: this.meals.view(e.meal),
      }));

    // Totais por dia da semana (0 = domingo)
    const byWeekday = Array.from({ length: 7 }, (_, wd) => {
      let sum: Nutrition = emptyNutrition();
      for (const e of diet.entries) {
        if (e.weekdays.includes(wd)) sum = addNutrition(sum, totalOf(e.meal.items));
      }
      return { weekday: wd, totals: roundNutrition(sum) };
    });
    const daysWithMeals = byWeekday.filter((d) => d.totals.kcal > 0);
    const averageKcal = daysWithMeals.length
      ? Math.round(daysWithMeals.reduce((s, d) => s + d.totals.kcal, 0) / daysWithMeals.length)
      : 0;

    return { id: diet.id, name: diet.name, active: diet.active, entries, byWeekday, averageKcal };
  }

  async list() {
    const diets = await this.repo.find({ order: { name: 'ASC' } });
    return diets.map((d) => this.view(d));
  }

  async getEntity(id: number): Promise<Diet> {
    const diet = await this.repo.findOneBy({ id });
    if (!diet) throw new NotFoundException(`Dieta ${id} não encontrada`);
    return diet;
  }

  get(id: number) {
    return this.getEntity(id).then((d) => this.view(d));
  }

  getActiveEntity(): Promise<Diet | null> {
    return this.repo.findOneBy({ active: true });
  }

  async create(dto: DietDto) {
    const diet = this.repo.create({ name: dto.name.trim(), active: false, entries: [] });
    diet.entries = await this.buildEntries(dto, []);
    const saved = await this.repo.save(diet);
    // A primeira dieta cadastrada já vira a ativa.
    if ((await this.repo.count()) === 1) return this.activate(saved.id);
    return this.view(saved);
  }

  async update(id: number, dto: DietDto) {
    const diet = await this.getEntity(id);
    diet.name = dto.name.trim();
    const keep = await this.buildEntries(dto, diet.entries);
    const keepIds = new Set(keep.filter((e) => e.id).map((e) => e.id));
    const removed = diet.entries.filter((e) => !keepIds.has(e.id));
    if (removed.length) await this.entryRepo.remove(removed);
    diet.entries = keep;
    return this.view(await this.repo.save(diet));
  }

  async activate(id: number) {
    const diet = await this.getEntity(id);
    await this.repo.update({ active: true }, { active: false });
    diet.active = true;
    return this.view(await this.repo.save(diet));
  }

  async remove(id: number) {
    const diet = await this.getEntity(id);
    await this.repo.remove(diet);
  }

  private async buildEntries(dto: DietDto, existing: DietEntry[]): Promise<DietEntry[]> {
    const byId = new Map(existing.map((e) => [e.id, e]));
    const out: DietEntry[] = [];
    for (const e of dto.entries) {
      const meal = await this.meals.getEntity(e.mealId).catch(() => {
        throw new BadRequestException(`Refeição ${e.mealId} não existe`);
      });
      const target = e.id !== undefined ? byId.get(e.id) : undefined;
      if (e.id !== undefined && !target) throw new BadRequestException(`Entrada ${e.id} não pertence a esta dieta`);
      const entry = target ?? this.entryRepo.create();
      entry.meal = meal;
      entry.label = e.label.trim();
      entry.time = e.time;
      entry.weekdays = [...new Set(e.weekdays)].sort((a, b) => a - b);
      out.push(entry);
    }
    return out;
  }
}
