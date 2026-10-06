import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Put, Post, Query } from '@nestjs/common';
import { ProfileDto, WeightDto } from './body.dto';
import { BodyService } from './body.service';

@Controller('body')
export class BodyController {
  constructor(private readonly body: BodyService) {}

  @Get()
  summary(@Query('date') date?: string) {
    return this.body.summary(date);
  }

  @Put('profile')
  async saveProfile(@Body() dto: ProfileDto) {
    await this.body.saveProfile(dto);
    return this.body.summary();
  }

  @Get('weights')
  weights() {
    return this.body.listWeights();
  }

  /** Cria ou atualiza a pesagem do dia informado. */
  @Post('weights')
  async addWeight(@Body() dto: WeightDto) {
    await this.body.upsertWeight(dto);
    return this.body.summary();
  }

  @Delete('weights/:id')
  @HttpCode(204)
  removeWeight(@Param('id', ParseIntPipe) id: number) {
    return this.body.removeWeight(id);
  }
}
