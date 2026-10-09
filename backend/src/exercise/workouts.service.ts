import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { BodyService } from '../body/body.service';
import { weightOn } from '../body/energy-calculator';
import { addDays, isValidDate, todayInTz } from '../common/dates';
import { ActivitiesService } from './activities.service';
import { Activity, Workout } from './exercise.entity';
import { ImportWorkoutDto, WorkoutDto } from './exercise.dto';
import { activityNameForExerciseType, GENERIC_ACTIVITY } from './health-connect-map';
import { workoutTotals, workoutView } from './workout-view';

@Injectable()
export class WorkoutsService {
  constructor(
    @InjectRepository(Workout) private readonly repo: Repository<Workout>,
    private readonly activities: ActivitiesService,
    private readonly body: BodyService,
  ) {}

  async forDate(date: string) {
    if (!isValidDate(date)) throw new BadRequestException('Data inválida (use YYYY-MM-DD)');
    const ctx = await this.body.energyContext();
    const list = await this.repo.findBy({ date });
    list.sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99') || a.id - b.id);
    const workouts = list.map((w) => workoutView(w, weightOn(date, ctx.weights)?.weightKg ?? null));
    return { date, workouts, totals: workoutTotals(workouts) };
  }

  /** Calorias líquidas de treino por data no intervalo (alimenta o gasto diário no modo `tracked`). */
  async netKcalByDate(from: string, to: string): Promise<Map<string, number>> {
    const ctx = await this.body.energyContext();
    const list = await this.repo.find({ where: { date: Between(from, to) } });
    const out = new Map<string, number>();
    for (const w of list) {
      const v = workoutView(w, weightOn(w.date, ctx.weights)?.weightKg ?? null);
      out.set(w.date, (out.get(w.date) ?? 0) + (v.netKcal ?? 0));
    }
    return out;
  }

  async create(dto: WorkoutDto) {
    const w = this.repo.create({ source: 'manual', externalId: null });
    await this.fill(w, dto);
    return this.viewOf(await this.repo.save(w));
  }

  async update(id: number, dto: WorkoutDto) {
    const w = await this.repo.findOneBy({ id });
    if (!w) throw new NotFoundException(`Treino ${id} não encontrado`);
    await this.fill(w, dto);
    return this.viewOf(await this.repo.save(w));
  }

  async remove(id: number) {
    const w = await this.repo.findOneBy({ id });
    if (!w) throw new NotFoundException(`Treino ${id} não encontrado`);
    await this.repo.remove(w);
  }

  /**
   * Importação em lote (ex.: de um app que lê o Health Connect do relógio). Idempotente:
   * (source, externalId) já existente é atualizado em vez de duplicado. O tipo de exercício do
   * Health Connect é mapeado para o catálogo; sem equivalente (ou sem dados para o cálculo) usa-se
   * a atividade genérica, mantendo as calorias do relógio quando houver.
   */
  async import(items: ImportWorkoutDto[], deletedExternalIds: string[] = [], defaultSource: 'manual' | 'device' = 'device') {
    let created = 0;
    let updated = 0;
    let deleted = 0;
    const errors: Array<{ index: number; message: string }> = [];

    for (const [index, item] of items.entries()) {
      try {
        const source = item.source ?? defaultSource;
        const existing = await this.repo.findOneBy({ source, externalId: item.externalId });
        const w = existing ?? this.repo.create({ source, externalId: item.externalId });
        let activity = item.activityId
          ? await this.activities.get(item.activityId).catch(() => null)
          : await this.activities.findByName(activityNameForExerciseType(item.exerciseType));
        if (!activity) throw new BadRequestException(`Atividade não encontrada para o item ${item.externalId}`);
        const hasSpeed = item.speedKmh != null || item.distanceKm != null;
        if (activity.calcMode !== 'met' && !hasSpeed && item.deviceActiveKcal == null) {
          activity = (await this.activities.findByName(GENERIC_ACTIVITY)) ?? activity;
        }
        await this.fill(w, { ...item, activityId: activity.id, notes: item.title });
        await this.repo.save(w);
        if (existing) updated++;
        else created++;
      } catch (e) {
        errors.push({ index, message: (e as Error).message });
      }
    }

    for (const externalId of deletedExternalIds) {
      const found = await this.repo.findOneBy({ source: defaultSource, externalId });
      if (found) {
        await this.repo.remove(found);
        deleted++;
      }
    }
    return { created, updated, deleted, errors };
  }

  private async viewOf(w: Workout) {
    const ctx = await this.body.energyContext();
    return workoutView(w, weightOn(w.date, ctx.weights)?.weightKg ?? null);
  }

  private async fill(w: Workout, dto: Omit<WorkoutDto, 'activityId'> & { activityId: number }) {
    if (!isValidDate(dto.date)) throw new BadRequestException('Data inválida');
    if (dto.date > addDays(todayInTz(), 1)) throw new BadRequestException('A data do treino não pode estar no futuro');
    const activity: Activity = await this.activities.get(dto.activityId).catch(() => {
      throw new BadRequestException(`Atividade ${dto.activityId} não existe`);
    });
    const hasSpeed = dto.speedKmh != null || dto.distanceKm != null;
    if (activity.calcMode !== 'met' && !hasSpeed && dto.deviceActiveKcal == null) {
      throw new BadRequestException('Informe a velocidade ou a distância para calcular as calorias.');
    }
    w.date = dto.date;
    w.time = dto.time ?? null;
    w.activity = activity;
    w.durationMin = dto.durationMin;
    w.distanceKm = dto.distanceKm ?? null;
    w.speedKmh = dto.speedKmh ?? null;
    w.gradePercent = dto.gradePercent ?? null;
    w.avgHeartRate = dto.avgHeartRate ?? null;
    w.deviceActiveKcal = dto.deviceActiveKcal ?? null;
    w.notes = dto.notes?.trim() || null;
  }
}
