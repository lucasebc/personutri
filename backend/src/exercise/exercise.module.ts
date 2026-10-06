import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BodyModule } from '../body/body.module';
import { ActivitiesService } from './activities.service';
import { Activity, Workout } from './exercise.entity';
import { ActivitiesController, WorkoutsController } from './exercise.controller';
import { WorkoutsService } from './workouts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Activity, Workout]), BodyModule],
  controllers: [ActivitiesController, WorkoutsController],
  providers: [ActivitiesService, WorkoutsService],
  exports: [WorkoutsService, ActivitiesService],
})
export class ExerciseModule {}
