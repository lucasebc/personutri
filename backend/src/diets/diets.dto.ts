import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class DietEntryDto {
  /** Informe o id para manter uma entrada existente (preserva o histórico do diário). */
  @IsOptional()
  @IsInt()
  id?: number;

  @IsInt()
  @Min(1)
  mealId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  label: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'time deve estar no formato HH:mm' })
  time: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Escolha pelo menos um dia da semana' })
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays: number[];
}

export class DietDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DietEntryDto)
  entries: DietEntryDto[];
}
