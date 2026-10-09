import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivityDto, EstimateDto, ImportDto, UpdateActivityDto, WorkoutDto } from './exercise.dto';
import { WorkoutsService } from './workouts.service';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  list(@Query('q') q?: string) {
    return this.activities.list(q);
  }

  /** Estimativa de calorias para o formulário (não grava nada). */
  @Post('estimate')
  estimate(@Body() dto: EstimateDto) {
    return this.activities.estimate(dto);
  }

  @Post()
  create(@Body() dto: ActivityDto) {
    return this.activities.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateActivityDto) {
    return this.activities.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.activities.remove(id);
  }
}

@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workouts: WorkoutsService) {}

  @Get()
  day(@Query('date') date: string) {
    return this.workouts.forDate(date);
  }

  @Post()
  create(@Body() dto: WorkoutDto) {
    return this.workouts.create(dto);
  }

  /** Importação idempotente em lote (por source + externalId). */
  @Post('import')
  @HttpCode(200)
  import(@Body() dto: ImportDto) {
    return this.workouts.import(dto.items, dto.deletedExternalIds ?? [], dto.source ?? 'device');
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: WorkoutDto) {
    return this.workouts.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.workouts.remove(id);
  }
}
