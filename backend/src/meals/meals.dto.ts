import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { ItemDto } from '../common/item.dto';

export class MealDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'A refeição precisa de pelo menos um alimento' })
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];
}
