import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BodyController } from './body.controller';
import { BodyProfile, WeightEntry } from './body.entity';
import { BodyService } from './body.service';

@Module({
  imports: [TypeOrmModule.forFeature([BodyProfile, WeightEntry])],
  controllers: [BodyController],
  providers: [BodyService],
  exports: [BodyService],
})
export class BodyModule {}
