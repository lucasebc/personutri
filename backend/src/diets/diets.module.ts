import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealsModule } from '../meals/meals.module';
import { Diet, DietEntry } from './diet.entity';
import { DietsController } from './diets.controller';
import { DietsService } from './diets.service';

@Module({
  imports: [TypeOrmModule.forFeature([Diet, DietEntry]), MealsModule],
  controllers: [DietsController],
  providers: [DietsService],
  exports: [DietsService],
})
export class DietsModule {}
