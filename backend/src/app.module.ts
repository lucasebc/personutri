import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { BodyModule } from './body/body.module';
import { BodyProfile, WeightEntry } from './body/body.entity';
import { DashboardModule } from './dashboard/dashboard.module';
import { Diet, DietEntry } from './diets/diet.entity';
import { DietsModule } from './diets/diets.module';
import { DiaryEntry, DiaryItem } from './diary/diary.entity';
import { DiaryModule } from './diary/diary.module';
import { Food } from './foods/food.entity';
import { FoodsModule } from './foods/foods.module';
import { ForecastModule } from './forecast/forecast.module';
import { Meal, MealItem } from './meals/meal.entity';
import { MealsModule } from './meals/meals.module';

const DATABASE_PATH = process.env.DATABASE_PATH || 'data/personutri.sqlite';
if (DATABASE_PATH !== ':memory:') mkdirSync(dirname(DATABASE_PATH), { recursive: true });

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: DATABASE_PATH,
      entities: [Food, Meal, MealItem, Diet, DietEntry, DiaryEntry, DiaryItem, BodyProfile, WeightEntry],
      // App pessoal de usuário único: o esquema é sincronizado automaticamente.
      synchronize: true,
      foreignKeys: true,
    } as never),
    FoodsModule,
    MealsModule,
    DietsModule,
    DiaryModule,
    BodyModule,
    DashboardModule,
    ForecastModule,
  ],
})
export class AppModule {}
