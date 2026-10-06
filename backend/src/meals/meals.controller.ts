import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { MealDto } from './meals.dto';
import { MealsService } from './meals.service';

@Controller('meals')
export class MealsController {
  constructor(private readonly meals: MealsService) {}

  @Get()
  list() {
    return this.meals.list();
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.meals.get(id);
  }

  @Post()
  create(@Body() dto: MealDto) {
    return this.meals.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: MealDto) {
    return this.meals.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.meals.remove(id);
  }
}
