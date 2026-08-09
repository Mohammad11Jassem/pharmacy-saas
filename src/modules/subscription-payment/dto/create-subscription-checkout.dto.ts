import { Type } from 'class-transformer';

import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSubscriptionCheckoutDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  planId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  offerId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  idempotencyKey: string;
}