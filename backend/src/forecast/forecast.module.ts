import { Module } from '@nestjs/common';
import { BodyModule } from '../body/body.module';
import { DiaryModule } from '../diary/diary.module';
import { ForecastController } from './forecast.controller';
import { ForecastService } from './forecast.service';

@Module({
  imports: [BodyModule, DiaryModule],
  controllers: [ForecastController],
  providers: [ForecastService],
})
export class ForecastModule {}
