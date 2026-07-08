import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  Min,
} from 'class-validator';

export enum SubscriptionActivationMode {
  IMMEDIATE = 'IMMEDIATE',
  AFTER_CURRENT = 'AFTER_CURRENT',
}

export class SubscribePharmacyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  planId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  offerId?: number;

  @IsOptional()
  @IsEnum(SubscriptionActivationMode)
  activationMode: SubscriptionActivationMode =
    SubscriptionActivationMode.AFTER_CURRENT;

    /*
   * الإداري هو الذي يحدد متى يبدأ الاشتراك.
   *
   * مثال:
   * 2026-09-01T00:00:00.000Z
   */
  @IsISO8601()
  startsAt: string;
}