import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /** GET /dashboard?date=YYYY-MM-DD (padrão: hoje) */
  @Get()
  day(@Query('date') date?: string) {
    return this.dashboard.day(date);
  }
}
