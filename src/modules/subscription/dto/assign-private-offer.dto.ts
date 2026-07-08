import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class AssignPrivateOfferDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(1000)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  pharmacyIds: number[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  grantReason?: string;

  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @IsOptional()
  @IsISO8601()
  validUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}