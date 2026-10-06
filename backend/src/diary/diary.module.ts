import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DietsModule } from '../diets/diets.module';
import { FoodsModule } from '../foods/foods.module';
import { DiaryController } from './diary.controller';
import { DiaryEntry, DiaryItem } from './diary.entity';
import { DiaryService } from './diary.service';

@Module({
  imports: [TypeOrmModule.forFeature([DiaryEntry, DiaryItem]), DietsModule, FoodsModule],
  controllers: [DiaryController],
  providers: [DiaryService],
  exports: [DiaryService],
})
export class DiaryModule {}
