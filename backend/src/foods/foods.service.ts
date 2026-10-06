import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MICRO_KEYS, Micros } from '../common/nutrients';
import { Food, normalizeSearch } from './food.entity';
import { CreateFoodDto, UpdateFoodDto } from './foods.dto';
import { OffClient, OffUnavailableError } from './off.client';
import { MappedOffFood } from './off.mapper';

interface TacoRecord {
  id: string;
  name: string;
  category: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  micros: Micros;
}

export type SearchSource = 'all' | 'local' | 'off';

export interface FoodSearchResult {
  foods: Food[];
  /** Preenchido quando o Open Food Facts não pôde ser consultado. */
  offError?: string;
}

@Injectable()
export class FoodsService implements OnModuleInit {
  private readonly logger = new Logger(FoodsService.name);

  constructor(
    @InjectRepository(Food) private readonly repo: Repository<Food>,
    private readonly off: OffClient,
  ) {}

  /** Carrega a TACO (alimentos genéricos brasileiros) na primeira execução. */
  async onModuleInit() {
    if ((await this.repo.count({ where: { source: 'taco' } })) > 0) return;
    const file = join(__dirname, 'data', 'taco.json');
    const records = JSON.parse(readFileSync(file, 'utf8')) as TacoRecord[];
    const foods = records.map((r) =>
      this.repo.create({
        source: 'taco',
        externalId: r.id,
        name: r.name,
        brand: null,
        category: r.category,
        barcode: null,
        searchName: normalizeSearch(r.name),
        kcal: r.kcal,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        fiber: r.fiber ?? 0,
        micros: r.micros,
        servingGrams: null,
        servingLabel: null,
      }),
    );
    await this.repo.save(foods, { chunk: 100 });
    this.logger.log(`TACO importada: ${foods.length} alimentos`);
  }

  async get(id: number): Promise<Food> {
    const food = await this.repo.findOneBy({ id });
    if (!food) throw new NotFoundException(`Alimento ${id} não encontrado`);
    return food;
  }

  async getMany(ids: number[]): Promise<Map<number, Food>> {
    if (!ids.length) return new Map();
    const foods = await this.repo.findBy({ id: In([...new Set(ids)]) });
    return new Map(foods.map((f) => [f.id, f]));
  }

  async search(q: string, source: SearchSource = 'all', limit = 25): Promise<FoodSearchResult> {
    const term = normalizeSearch(q);
    if (!term) return { foods: [] };

    let offError: string | undefined;
    if (source === 'off' || (source === 'all' && /^\d{8,14}$/.test(term))) {
      try {
        // Código de barras: busca direta. Texto: busca na API e persiste os resultados como cache.
        const mapped = /^\d{8,14}$/.test(term)
          ? [await this.off.byBarcode(term)].filter((f): f is MappedOffFood => f !== null)
          : await this.off.search(q, limit);
        await this.upsertOff(mapped);
      } catch (err) {
        if (!(err instanceof OffUnavailableError)) throw err;
        offError = err.message;
      }
    }

    // Resultados do OFF já foram gravados acima, então a consulta é sempre no banco local.
    // Todos os termos precisam aparecer no nome (AND), em qualquer ordem.
    const qb = this.repo.createQueryBuilder('f');
    // `local` e `all` pesquisam tudo o que já está no banco (TACO, cadastrados e produtos já consultados).
    qb.where(source === 'off' ? "f.source = 'off'" : '1=1');
    term
      .split(/\s+/)
      .filter(Boolean)
      .forEach((w, i) => {
        qb.andWhere(`(f.searchName LIKE :w${i} OR f.barcode = :bc${i})`, { [`w${i}`]: `%${w}%`, [`bc${i}`]: w });
      });
    const rows = await qb.limit(300).getMany();

    // Ranking simples: cadastrados por você primeiro, depois nomes que começam com o termo, depois os mais curtos.
    const rank = (f: Food) =>
      (f.source === 'custom' ? 0 : 10) + (f.searchName.startsWith(term) ? 0 : 5) + Math.min(f.searchName.length / 100, 4);
    rows.sort((a, b) => rank(a) - rank(b));

    return { foods: rows.slice(0, limit), offError };
  }

  async byBarcode(code: string): Promise<Food> {
    const barcode = code.replace(/\D/g, '');
    if (barcode.length < 8) throw new BadRequestException('Código de barras inválido');
    const local = await this.repo.findOneBy({ barcode });
    if (local) return local;
    try {
      const mapped = await this.off.byBarcode(barcode);
      if (!mapped) throw new NotFoundException('Produto não encontrado no Open Food Facts');
      const [food] = await this.upsertOff([mapped]);
      return food;
    } catch (err) {
      if (err instanceof OffUnavailableError) throw new BadRequestException(err.message);
      throw err;
    }
  }

  create(dto: CreateFoodDto): Promise<Food> {
    const food = this.repo.create({
      source: 'custom',
      externalId: null,
      name: dto.name.trim(),
      brand: dto.brand?.trim() || null,
      category: dto.category?.trim() || null,
      barcode: null,
      searchName: normalizeSearch(dto.name),
      kcal: dto.kcal,
      protein: dto.protein,
      carbs: dto.carbs,
      fat: dto.fat,
      fiber: dto.fiber ?? 0,
      micros: this.cleanMicros(dto.micros),
      servingGrams: dto.servingGrams ?? null,
      servingLabel: dto.servingLabel?.trim() || null,
    });
    return this.repo.save(food);
  }

  async update(id: number, dto: UpdateFoodDto): Promise<Food> {
    const food = await this.get(id);
    if (food.source !== 'custom') {
      throw new BadRequestException('Só alimentos cadastrados manualmente podem ser editados');
    }
    const { micros, name, ...rest } = dto;
    Object.assign(food, rest);
    if (name !== undefined) {
      food.name = name.trim();
      food.searchName = normalizeSearch(name);
    }
    if (micros !== undefined) food.micros = this.cleanMicros(micros);
    return this.repo.save(food);
  }

  async remove(id: number): Promise<void> {
    const food = await this.get(id);
    if (food.source !== 'custom') {
      throw new BadRequestException('Só alimentos cadastrados manualmente podem ser removidos');
    }
    try {
      await this.repo.remove(food);
    } catch {
      throw new BadRequestException('Este alimento está em uso em refeições ou no diário');
    }
  }

  private cleanMicros(input?: Record<string, number>): Micros {
    const out: Micros = {};
    for (const key of MICRO_KEYS) {
      const v = input?.[key];
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[key] = v;
    }
    return out;
  }

  private async upsertOff(items: MappedOffFood[]): Promise<Food[]> {
    const saved: Food[] = [];
    for (const item of items) {
      const existing = await this.repo.findOneBy({ source: 'off', externalId: item.externalId });
      const food = existing ?? this.repo.create({ source: 'off' });
      Object.assign(food, item, { searchName: normalizeSearch(`${item.name} ${item.brand ?? ''}`) });
      saved.push(await this.repo.save(food));
    }
    return saved;
  }
}
