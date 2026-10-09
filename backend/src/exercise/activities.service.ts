import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeSearch } from '../common/food-like';
import { BodyService } from '../body/body.service';
import { weightOn } from '../body/energy-calculator';
import { todayInTz } from '../common/dates';
import { CATALOG } from './catalog';
import { workoutCalories } from './calories';
import { Activity, Workout } from './exercise.entity';
import { ActivityDto, EstimateDto, UpdateActivityDto } from './exercise.dto';

@Injectable()
export class ActivitiesService implements OnModuleInit {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    @InjectRepository(Activity) private readonly repo: Repository<Activity>,
    @InjectRepository(Workout) private readonly workouts: Repository<Workout>,
    private readonly body: BodyService,
  ) {}

  /** Garante o catálogo embutido (acrescenta entradas novas sem mexer nas existentes). */
  async onModuleInit() {
    const have = new Set((await this.repo.findBy({ builtin: true })).map((a) => a.name));
    const missing = CATALOG.filter((c) => !have.has(c.name));
    if (!missing.length) return;
    await this.repo.save(
      missing.map((c) =>
        this.repo.create({
          name: c.name,
          category: c.category,
          calcMode: c.calcMode,
          met: c.met ?? null,
          builtin: true,
          searchName: normalizeSearch(`${c.name} ${c.category}`),
        }),
      ),
    );
    this.logger.log(`Catálogo de atividades: ${missing.length} entradas adicionadas`);
  }

  async list(q?: string) {
    const term = q ? normalizeSearch(q) : '';
    const all = await this.repo.find();
    const words = term.split(/\s+/).filter(Boolean);
    return all
      .filter((a) => words.every((w) => a.searchName.includes(w)))
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }

  async get(id: number): Promise<Activity> {
    const a = await this.repo.findOneBy({ id });
    if (!a) throw new NotFoundException(`Atividade ${id} não encontrada`);
    return a;
  }

  findByName(name: string): Promise<Activity | null> {
    return this.repo.findOneBy({ name });
  }

  create(dto: ActivityDto): Promise<Activity> {
    return this.repo.save(
      this.repo.create({
        name: dto.name.trim(),
        category: dto.category.trim(),
        calcMode: 'met',
        met: dto.met,
        builtin: false,
        searchName: normalizeSearch(`${dto.name} ${dto.category}`),
      }),
    );
  }

  async update(id: number, dto: UpdateActivityDto): Promise<Activity> {
    const a = await this.get(id);
    if (a.builtin) throw new BadRequestException('Atividades do catálogo não podem ser editadas; crie uma própria.');
    if (dto.name !== undefined) a.name = dto.name.trim();
    if (dto.category !== undefined) a.category = dto.category.trim();
    if (dto.met !== undefined) a.met = dto.met;
    a.searchName = normalizeSearch(`${a.name} ${a.category}`);
    return this.repo.save(a);
  }

  async remove(id: number): Promise<void> {
    const a = await this.get(id);
    if (a.builtin) throw new BadRequestException('Atividades do catálogo não podem ser removidas.');
    if (await this.workouts.count({ where: { activity: { id } } })) {
      throw new BadRequestException('Esta atividade tem treinos registrados.');
    }
    await this.repo.remove(a);
  }

  /** Estimativa de calorias sem gravar nada (usada no formulário de treino). */
  async estimate(dto: EstimateDto, today = todayInTz()) {
    const activity = await this.get(dto.activityId);
    let weightKg = dto.weightKg ?? null;
    if (weightKg === null) {
      const ctx = await this.body.energyContext();
      weightKg = weightOn(today, ctx.weights)?.weightKg ?? null;
    }
    const c = workoutCalories(activity, dto, weightKg);
    return {
      weightKg,
      met: c.met === null ? null : Math.round(c.met * 10) / 10,
      speedKmh: c.speedKmh === null ? null : Math.round(c.speedKmh * 10) / 10,
      grossKcal: c.grossKcal === null ? null : Math.round(c.grossKcal),
      netKcal: c.netKcal === null ? null : Math.round(c.netKcal),
    };
  }
}
