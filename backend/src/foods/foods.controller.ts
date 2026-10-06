import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CreateFoodDto, UpdateFoodDto } from './foods.dto';
import { FoodsService, SearchSource } from './foods.service';

@Controller('foods')
export class FoodsController {
  constructor(private readonly foods: FoodsService) {}

  /**
   * GET /foods/search?q=arroz&source=all|local|off
   * - local: TACO + cadastrados manualmente + produtos já consultados
   * - off: consulta o Open Food Facts (produtos do Brasil) e devolve o resultado
   * - all: local; se `q` for um código de barras, consulta o OFF também
   */
  @Get('search')
  search(@Query('q') q = '', @Query('source') source: SearchSource = 'all', @Query('limit') limit?: string) {
    const src: SearchSource = ['all', 'local', 'off'].includes(source) ? source : 'all';
    return this.foods.search(q, src, Math.min(Math.max(Number(limit) || 25, 1), 50));
  }

  @Get('barcode/:code')
  byBarcode(@Param('code') code: string) {
    return this.foods.byBarcode(code);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.foods.get(id);
  }

  @Post()
  create(@Body() dto: CreateFoodDto) {
    return this.foods.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFoodDto) {
    return this.foods.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.foods.remove(id);
  }
}
