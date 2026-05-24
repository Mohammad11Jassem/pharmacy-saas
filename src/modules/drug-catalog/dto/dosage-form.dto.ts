import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { DosageFormCategory } from '../../../generated/prisma/client';

export class CreateDosageFormDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  dosageFormName!: string;

  @IsEnum(DosageFormCategory)
  formCategory!: DosageFormCategory;
}

export class UpdateDosageFormDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  dosageFormName?: string;

  @IsEnum(DosageFormCategory)
  formCategory?: DosageFormCategory;
}