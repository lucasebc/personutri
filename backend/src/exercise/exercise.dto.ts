import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class ActivityDto {
  @IsString() @MinLength(2) @MaxLength(80)
  name: string;

  @IsString() @MinLength(2) @MaxLength(60)
  category: string;

  /** Atividades próprias usam MET fixo (consulte o Compendium ou use a estimativa do seu relógio). */
  @IsNumber() @Min(1) @Max(25) @Type(() => Number)
  met: number;
}

export class UpdateActivityDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80)
  name?: string;

  @IsOptional() @IsString() @MinLength(2) @MaxLength(60)
  category?: string;

  @IsOptional() @IsNumber() @Min(1) @Max(25) @Type(() => Number)
  met?: number;
}

export class WorkoutDto {
  @Matches(DATE, { message: 'date deve estar no formato YYYY-MM-DD' })
  date: string;

  @IsOptional() @Matches(TIME, { message: 'time deve estar no formato HH:mm' })
  time?: string;

  @IsInt() @Min(1)
  activityId: number;

  @IsNumber() @Min(1) @Max(1440) @Type(() => Number)
  durationMin: number;

  @IsOptional() @IsNumber() @Min(0.01) @Max(500) @Type(() => Number)
  distanceKm?: number;

  @IsOptional() @IsNumber() @Min(0.5) @Max(60) @Type(() => Number)
  speedKmh?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(30) @Type(() => Number)
  gradePercent?: number;

  @IsOptional() @IsInt() @Min(30) @Max(250) @Type(() => Number)
  avgHeartRate?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(10000) @Type(() => Number)
  deviceActiveKcal?: number;

  @IsOptional() @IsString() @MaxLength(300)
  notes?: string;
}

export class ImportWorkoutDto {
  @Matches(DATE, { message: 'date deve estar no formato YYYY-MM-DD' })
  date: string;

  @IsOptional() @Matches(TIME, { message: 'time deve estar no formato HH:mm' })
  time?: string;

  /** Id da atividade no catálogo; se ausente, usa-se `exerciseType`. */
  @IsOptional() @IsInt() @Min(1)
  activityId?: number;

  /** Tipo do Health Connect pelo nome (ex.: RUNNING, STRENGTH_TRAINING). */
  @IsOptional() @IsString() @MaxLength(60)
  exerciseType?: string;

  @IsNumber() @Min(1) @Max(1440) @Type(() => Number)
  durationMin: number;

  @IsOptional() @IsNumber() @Min(0.01) @Max(500) @Type(() => Number)
  distanceKm?: number;

  @IsOptional() @IsNumber() @Min(0.5) @Max(60) @Type(() => Number)
  speedKmh?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(30) @Type(() => Number)
  gradePercent?: number;

  @IsOptional() @IsInt() @Min(30) @Max(250) @Type(() => Number)
  avgHeartRate?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(10000) @Type(() => Number)
  deviceActiveKcal?: number;

  /** Título da sessão na origem (vira observação). */
  @IsOptional() @IsString() @MaxLength(300)
  title?: string;

  @IsOptional() @IsIn(['manual', 'device'])
  source?: 'manual' | 'device';

  /** Obrigatório na importação: identifica o registro na origem. */
  @IsString() @MinLength(1) @MaxLength(120)
  externalId: string;
}

export class ImportDto {
  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true })
  @Type(() => ImportWorkoutDto)
  items: ImportWorkoutDto[];

  /** Registros removidos na origem (o Health Connect informa remoções). */
  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsString({ each: true })
  deletedExternalIds?: string[];

  @IsOptional() @IsIn(['manual', 'device'])
  source?: 'manual' | 'device';
}

export class EstimateDto {
  @IsInt() @Min(1)
  activityId: number;

  @IsNumber() @Min(1) @Max(1440) @Type(() => Number)
  durationMin: number;

  @IsOptional() @IsNumber() @Min(0.01) @Max(500) @Type(() => Number)
  distanceKm?: number;

  @IsOptional() @IsNumber() @Min(0.5) @Max(60) @Type(() => Number)
  speedKmh?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(30) @Type(() => Number)
  gradePercent?: number;

  /** Padrão: peso mais recente registrado. */
  @IsOptional() @IsNumber() @Min(20) @Max(400) @Type(() => Number)
  weightKg?: number;
}
