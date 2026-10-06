import { Type } from 'class-transformer';
import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class ItemDto {
  @IsInt()
  @Min(1)
  foodId: number;

  /** Quantidade em gramas (ou ml, para líquidos). */
  @IsNumber()
  @Min(1)
  @Max(10000)
  @Type(() => Number)
  grams: number;
}
