import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateActiveIngredientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  ingredientName!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateActiveIngredientDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  ingredientName?: string;

  @IsOptional()
  @IsString()
  description?: string;
}