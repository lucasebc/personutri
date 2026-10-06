import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { ItemDto } from '../common/item.dto';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateFreeEntryDto {
  /** Ex.: "Lanche fora de hora". Padrão: "Consumo livre". */
  @IsOptional() @IsString() @MaxLength(60)
  label?: string;

  @IsOptional() @Matches(TIME, { message: 'time deve estar no formato HH:mm' })
  time?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];
}

export class UpdateEntryDto {
  @IsOptional() @IsIn(['pending', 'done', 'skipped'])
  status?: 'pending' | 'done' | 'skipped';

  @IsOptional() @IsString() @MaxLength(60)
  label?: string;

  @IsOptional() @Matches(TIME, { message: 'time deve estar no formato HH:mm' })
  time?: string;

  /** Substitui os itens (permite ajustar quantidades do que foi realmente comido). */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items?: ItemDto[];
}
