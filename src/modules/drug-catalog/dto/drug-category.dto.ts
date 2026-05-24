import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDrugCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  categoryName!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateDrugCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  categoryName?: string;

  @IsOptional()
  @IsString()
  description?: string;
}