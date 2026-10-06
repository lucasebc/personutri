import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { isValidDate, weekday } from '../common/dates';
import { totalOf, viewItem } from '../common/item-view';
import { emptyNutrition, Nutrition, roundNutrition, sumNutrition } from '../common/nutrients';
import { DietsService } from '../diets/diets.service';
import { FoodsService } from '../foods/foods.service';
import { ItemDto } from '../common/item.dto';
import { DiaryEntry, DiaryItem } from './diary.entity';
import { CreateFreeEntryDto, UpdateEntryDto } from './diary.dto';

@Injectable()
export class DiaryService {
  constructor(
    @InjectRepository(DiaryEntry) private readonly repo: Repository<DiaryEntry>,
    @InjectRepository(DiaryItem) private readonly itemRepo: Repository<DiaryItem>,
    private readonly diets: DietsService,
    private readonly foods: FoodsService,
  ) {}

  assertDate(date: string) {
    if (!isValidDate(date)) throw new BadRequestException('Data inválida (use YYYY-MM-DD)');
  }

  view(e: DiaryEntry) {
    return {
      id: e.id,
      date: e.date,
      time: e.time,
      label: e.label,
      kind: e.kind,
      status: e.status,
      mealId: e.mealId,
      items: e.items.map(viewItem),
      totals: roundNutrition(totalOf(e.items)),
    };
  }

  /**
   * Garante que as refeições da dieta ativa para o dia existam como registros pendentes,
   * e remove pendências obsoletas (ex.: a dieta mudou). Registros já feitos/pulados ficam.
   */
  async syncPlanned(date: string): Promise<void> {
    const diet = await this.diets.getActiveEntity();
    const wd = weekday(date);
    const wanted = diet ? diet.entries.filter((e) => e.weekdays.includes(wd)) : [];
    const existing = await this.repo.findBy({ date, kind: 'planned' });

    const wantedIds = new Set(wanted.map((w) => w.id));
    const stale = existing.filter((e) => e.status === 'pending' && !wantedIds.has(e.dietEntryId ?? -1));
    if (stale.length) await this.repo.remove(stale);

    const have = new Set(existing.map((e) => e.dietEntryId));
    for (const w of wanted) {
      if (have.has(w.id)) continue;
      await this.repo.save(
        this.repo.create({
          date,
          time: w.time,
          label: w.label,
          kind: 'planned',
          status: 'pending',
          dietEntryId: w.id,
          mealId: w.meal.id,
          items: w.meal.items.map((i) => ({ food: i.food, grams: i.grams }) as DiaryItem),
        }),
      );
    }
  }

  async forDate(date: string) {
    this.assertDate(date);
    await this.syncPlanned(date);
    const entries = await this.repo.findBy({ date });
    entries.sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99') || a.id - b.id);
    return { date, entries: entries.map((e) => this.view(e)) };
  }

  async addFree(date: string, dto: CreateFreeEntryDto) {
    this.assertDate(date);
    const items = await this.buildItems(dto.items);
    const entry = await this.repo.save(
      this.repo.create({
        date,
        time: dto.time ?? null,
        label: dto.label?.trim() || 'Consumo livre',
        kind: 'free',
        status: 'done',
        dietEntryId: null,
        mealId: null,
        items,
      }),
    );
    return this.view(entry);
  }

  async getEntity(id: number): Promise<DiaryEntry> {
    const entry = await this.repo.findOneBy({ id });
    if (!entry) throw new NotFoundException(`Registro ${id} não encontrado`);
    return entry;
  }

  async update(id: number, dto: UpdateEntryDto) {
    const entry = await this.getEntity(id);
    if (dto.status !== undefined) {
      if (entry.kind === 'free' && dto.status !== 'done') {
        throw new BadRequestException('Consumo livre não pode ser pulado: remova o registro');
      }
      entry.status = dto.status;
    }
    if (dto.label !== undefined && entry.kind === 'free') entry.label = dto.label.trim() || entry.label;
    if (dto.time !== undefined && entry.kind === 'free') entry.time = dto.time;
    if (dto.items) {
      await this.itemRepo.remove(entry.items);
      entry.items = await this.buildItems(dto.items);
    }
    return this.view(await this.repo.save(entry));
  }

  async remove(id: number) {
    const entry = await this.getEntity(id);
    if (entry.kind === 'planned') {
      throw new BadRequestException('Refeições programadas não são removidas: marque como "pulada".');
    }
    await this.repo.remove(entry);
  }

  /** Totais consumidos (apenas status `done`) por data, no intervalo [from, to]. */
  async consumedByDate(from: string, to: string): Promise<Map<string, Nutrition>> {
    const entries = await this.repo.find({ where: { date: Between(from, to), status: 'done' } });
    const byDate = new Map<string, DiaryEntry[]>();
    for (const e of entries) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
    const out = new Map<string, Nutrition>();
    for (const [date, list] of byDate) out.set(date, sumNutrition(list.map((e) => totalOf(e.items))));
    return out;
  }

  /** Totais ainda pendentes (programado e não feito) do dia. */
  async pendingFor(date: string): Promise<Nutrition> {
    const entries = await this.repo.findBy({ date, status: 'pending', kind: 'planned' });
    return entries.length ? sumNutrition(entries.map((e) => totalOf(e.items))) : emptyNutrition();
  }

  private async buildItems(items: ItemDto[]): Promise<DiaryItem[]> {
    const foods = await this.foods.getMany(items.map((i) => i.foodId));
    return items.map((i) => {
      const food = foods.get(i.foodId);
      if (!food) throw new BadRequestException(`Alimento ${i.foodId} não existe`);
      return { food, grams: i.grams } as DiaryItem;
    });
  }
}
