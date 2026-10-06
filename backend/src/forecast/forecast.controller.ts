import { Controller, Get, Query } from '@nestjs/common';
import { ForecastService } from './forecast.service';

@Controller('forecast')
export class ForecastController {
  constructor(private readonly forecast: ForecastService) {}

  /** GET /forecast/weekly?weeks=12&ahead=4&date=YYYY-MM-DD */
  @Get('weekly')
  weekly(@Query('weeks') weeks?: string, @Query('ahead') ahead?: string, @Query('date') date?: string) {
    const clamp = (v: string | undefined, def: number, max: number) => Math.min(Math.max(Math.round(Number(v)) || def, 1), max);
    return this.forecast.weekly(clamp(weeks, 12, 52), clamp(ahead, 4, 12), date);
  }
}
