import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { DietDto } from './diets.dto';
import { DietsService } from './diets.service';

@Controller('diets')
export class DietsController {
  constructor(private readonly diets: DietsService) {}

  @Get()
  list() {
    return this.diets.list();
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.diets.get(id);
  }

  @Post()
  create(@Body() dto: DietDto) {
    return this.diets.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: DietDto) {
    return this.diets.update(id, dto);
  }

  @Post(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.diets.activate(id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.diets.remove(id);
  }
}
