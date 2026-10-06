import { Injectable } from '@nestjs/common';
import { addDays, isValidDate, todayInTz } from '../common/dates';
import { BodyService } from '../body/body.service';
import { DiaryService } from '../diary/diary.service';
import { WorkoutsService } from '../exercise/workouts.service';
import { computeDashboard } from './dashboard';

@Injectable()
export class DashboardService {
  constructor(
    private readonly body: BodyService,
    private readonly diary: DiaryService,
    private readonly workouts: WorkoutsService,
  ) {}

  async day(dateParam?: string) {
    const date = dateParam && isValidDate(dateParam) ? dateParam : todayInTz();
    const ctx = await this.body.energyContext();
    const { entries } = await this.diary.forDate(date);
    return computeDashboard({
      date,
      profile: ctx.profile,
      weights: ctx.weights,
      entries,
      consumedByDate: await this.diary.consumedByDate(addDays(date, -6), date),
      pending: await this.diary.pendingFor(date),
      exerciseByDate: await this.workouts.netKcalByDate(addDays(date, -6), date),
      workouts: (await this.workouts.forDate(date)).workouts,
    });
  }
}
