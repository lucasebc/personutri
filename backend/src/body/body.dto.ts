import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, Matches, Max, Min } from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class ProfileDto {
  @IsIn(['male', 'female'])
  sex: 'male' | 'female';

  @Matches(DATE, { message: 'birthDate deve estar no formato YYYY-MM-DD' })
  birthDate: string;

  @IsNumber() @Min(100) @Max(250) @Type(() => Number)
  heightCm: number;

  @IsIn(['sedentary', 'light', 'moderate', 'high', 'athlete'])
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'high' | 'athlete';

  /** kg/semana (negativo = emagrecer). Limitado a faixas razoáveis. */
  @IsOptional() @IsNumber() @Min(-1.5) @Max(1) @Type(() => Number)
  weeklyGoalKg?: number;

  @IsOptional() @IsNumber() @Min(30) @Max(300) @Type(() => Number)
  targetWeightKg?: number | null;

  @IsOptional() @IsNumber() @Min(0.8) @Max(3.5) @Type(() => Number)
  proteinPerKg?: number;

  @IsOptional() @IsNumber() @Min(15) @Max(45) @Type(() => Number)
  fatPercent?: number;

  @IsOptional() @IsIn(['mifflin', 'katch'])
  bmrFormula?: 'mifflin' | 'katch';

  /** level = fator de atividade fixo; tracked = base do dia a dia + treinos registrados. */
  @IsOptional() @IsIn(['level', 'tracked'])
  activityMode?: 'level' | 'tracked';

  /** Atalho de onboarding: registra uma pesagem em `weightDate` (padrão: hoje). */
  @IsOptional() @IsNumber() @Min(20) @Max(400) @Type(() => Number)
  currentWeightKg?: number;

  @IsOptional() @Matches(DATE)
  weightDate?: string;
}

export class WeightDto {
  @Matches(DATE, { message: 'date deve estar no formato YYYY-MM-DD' })
  date: string;

  @IsNumber() @Min(20) @Max(400) @Type(() => Number)
  weightKg: number;

  @IsOptional() @IsNumber() @Min(2) @Max(70) @Type(() => Number)
  bodyFatPct?: number | null;

  @IsOptional() @IsNumber() @Min(30) @Max(250) @Type(() => Number)
  waistCm?: number | null;
}
