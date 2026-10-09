import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isValidDate, todayInTz } from '../common/dates';
import { BodyProfile, WeightEntry } from './body.entity';
import { ProfileDto, WeightDto } from './body.dto';
import { computeBodySummary } from './body-summary';
import { EnergyOn, energyOn } from './energy-calculator';

@Injectable()
export class BodyService {
  constructor(
    @InjectRepository(BodyProfile) private readonly profiles: Repository<BodyProfile>,
    @InjectRepository(WeightEntry) private readonly weights: Repository<WeightEntry>,
  ) {}

  getProfile(): Promise<BodyProfile | null> {
    return this.profiles.findOneBy({ id: 1 });
  }

  async saveProfile(dto: ProfileDto): Promise<BodyProfile> {
    if (!isValidDate(dto.birthDate)) throw new BadRequestException('Data de nascimento inválida');
    if (dto.birthDate >= todayInTz()) throw new BadRequestException('Data de nascimento deve ser no passado');
    const existing = await this.getProfile();
    const profile = this.profiles.create({
      id: 1,
      sex: dto.sex,
      birthDate: dto.birthDate,
      heightCm: dto.heightCm,
      activityLevel: dto.activityLevel,
      weeklyGoalKg: dto.weeklyGoalKg ?? existing?.weeklyGoalKg ?? 0,
      targetWeightKg: dto.targetWeightKg === undefined ? (existing?.targetWeightKg ?? null) : dto.targetWeightKg,
      proteinPerKg: dto.proteinPerKg ?? existing?.proteinPerKg ?? 1.8,
      fatPercent: dto.fatPercent ?? existing?.fatPercent ?? 25,
      bmrFormula: dto.bmrFormula ?? existing?.bmrFormula ?? 'mifflin',
      activityMode: dto.activityMode ?? existing?.activityMode ?? 'level',
    });
    const saved = await this.profiles.save(profile);
    if (dto.currentWeightKg !== undefined) {
      await this.upsertWeight({ date: dto.weightDate ?? todayInTz(), weightKg: dto.currentWeightKg });
    }
    return saved;
  }

  listWeights(): Promise<WeightEntry[]> {
    return this.weights.find({ order: { date: 'ASC' } });
  }

  async upsertWeight(dto: WeightDto): Promise<WeightEntry> {
    if (!isValidDate(dto.date)) throw new BadRequestException('Data inválida');
    if (dto.date > todayInTz()) throw new BadRequestException('A data da pesagem não pode estar no futuro');
    const existing = await this.weights.findOneBy({ date: dto.date });
    const entry = existing ?? this.weights.create({ date: dto.date });
    entry.weightKg = dto.weightKg;
    entry.bodyFatPct = dto.bodyFatPct ?? null;
    entry.waistCm = dto.waistCm ?? null;
    entry.source = 'manual';
    return this.weights.save(entry);
  }

  /**
   * Importa pesagens de um dispositivo (uma por dia). Idempotente; nunca sobrescreve uma pesagem manual do mesmo dia.
   */
  async importWeights(items: Array<{ date: string; weightKg: number; bodyFatPct?: number | null }>) {
    let created = 0;
    let updated = 0;
    let skippedManual = 0;
    const today = todayInTz();
    for (const item of items) {
      if (!isValidDate(item.date) || item.date > today) continue;
      const existing = await this.weights.findOneBy({ date: item.date });
      if (existing && existing.source !== 'device') {
        skippedManual++;
        continue;
      }
      const entry = existing ?? this.weights.create({ date: item.date, waistCm: null });
      entry.weightKg = item.weightKg;
      entry.bodyFatPct = item.bodyFatPct ?? null;
      entry.source = 'device';
      await this.weights.save(entry);
      if (existing) updated++;
      else created++;
    }
    return { created, updated, skippedManual };
  }

  async removeWeight(id: number): Promise<void> {
    const entry = await this.weights.findOneBy({ id });
    if (!entry) throw new NotFoundException('Pesagem não encontrada');
    await this.weights.remove(entry);
  }

  /** Carrega perfil + pesagens uma vez e devolve uma função de energia por data. */
  async energyContext(): Promise<{
    profile: BodyProfile | null;
    weights: WeightEntry[];
    on: (date: string, overrideWeightKg?: number) => EnergyOn | null;
  }> {
    const [profile, weights] = await Promise.all([this.getProfile(), this.listWeights()]);
    return {
      profile,
      weights,
      on: (date, override) => (profile ? energyOn(date, profile, weights, override) : null),
    };
  }

  /** Resumo para a tela "Corpo": perfil, metas de hoje e fatores de atividade. */
  async summary(date = todayInTz()) {
    const ctx = await this.energyContext();
    return computeBodySummary(ctx.profile, ctx.weights, date);
  }
}
