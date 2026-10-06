import { Injectable } from '@nestjs/common';
import { addDays, isValidDate, todayInTz } from '../common/dates';
import { BodyService } from '../body/body.service';
import { DiaryService } from '../diary/diary.service';
import { computeForecast, ForecastResult } from './forecast';

@Injectable()
export class ForecastService {
  constructor(
    private readonly body: BodyService,
    private readonly diary: DiaryService,
  ) {}

  async weekly(weeksBack = 12, weeksAhead = 4, today = todayInTz()): Promise<ForecastResult> {
    if (!isValidDate(today)) today = todayInTz();
    const ctx = await this.body.energyContext();
    if (!ctx.profile) return { ready: false, reason: 'no-profile' };
    const from = addDays(today, -7 * (weeksBack + 1));
    const consumed = await this.diary.consumedByDate(from, today);
    const consumedKcal = new Map([...consumed].map(([d, n]) => [d, n.kcal]));
    return computeForecast({ today, profile: ctx.profile, weights: ctx.weights, consumedKcal, weeksBack, weeksAhead });
  }
}
