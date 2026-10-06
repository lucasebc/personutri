import { Module } from '@nestjs/common';
import { BodyModule } from '../body/body.module';
import { DiaryModule } from '../diary/diary.module';
import { ExerciseModule } from '../exercise/exercise.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [BodyModule, DiaryModule, ExerciseModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
