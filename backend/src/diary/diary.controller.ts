import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CreateFreeEntryDto, UpdateEntryDto } from './diary.dto';
import { DiaryService } from './diary.service';

@Controller('diary')
export class DiaryController {
  constructor(private readonly diary: DiaryService) {}

  /** Agenda do dia: refeições programadas (da dieta ativa) + consumos livres. */
  @Get(':date')
  day(@Param('date') date: string) {
    return this.diary.forDate(date);
  }

  /** Adiciona algo consumido fora do plano. */
  @Post(':date/free')
  addFree(@Param('date') date: string, @Body() dto: CreateFreeEntryDto) {
    return this.diary.addFree(date, dto);
  }

  /** Marca como feita/pulada, ou ajusta quantidades. */
  @Patch('entries/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEntryDto) {
    return this.diary.update(id, dto);
  }

  @Delete('entries/:id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.diary.remove(id);
  }
}
