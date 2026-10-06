import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateFoodDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  /** Valores por 100 g */
  @IsNumber() @Min(0) @Max(1000) @Type(() => Number)
  kcal: number;

  @IsNumber() @Min(0) @Max(100) @Type(() => Number)
  protein: number;

  @IsNumber() @Min(0) @Max(100) @Type(() => Number)
  carbs: number;

  @IsNumber() @Min(0) @Max(100) @Type(() => Number)
  fat: number;

  @IsOptional() @IsNumber() @Min(0) @Max(100) @Type(() => Number)
  fiber?: number;

  /** Chaves de MICRO_META, nas unidades de MICRO_META, por 100 g. */
  @IsOptional()
  @IsObject()
  micros?: Record<string, number>;

  @IsOptional() @IsNumber() @Min(1) @Max(5000) @Type(() => Number)
  servingGrams?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  servingLabel?: string;
}

export class UpdateFoodDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120)
  name?: string;

  @IsOptional() @IsString() @MaxLength(80)
  brand?: string;

  @IsOptional() @IsString() @MaxLength(80)
  category?: string;

  @IsOptional() @IsNumber() @Min(0) @Max(1000) @Type(() => Number)
  kcal?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(100) @Type(() => Number)
  protein?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(100) @Type(() => Number)
  carbs?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(100) @Type(() => Number)
  fat?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(100) @Type(() => Number)
  fiber?: number;

  @IsOptional() @IsObject()
  micros?: Record<string, number>;

  @IsOptional() @IsNumber() @Min(1) @Max(5000) @Type(() => Number)
  servingGrams?: number;

  @IsOptional() @IsString() @MaxLength(60)
  servingLabel?: string;
}
