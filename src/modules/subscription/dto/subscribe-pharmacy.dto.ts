import { Type } from 'class-transformer';
import {
  IsDateString,
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
   * تاريخ بداية الاشتراك (Calendar Date).
   * يفضل إرسال: 2026-09-01
   * وإذا وصل ISO DateTime فسيتم تجاهل الوقت بالكامل.
   */
  @IsDateString()
  startsAt: string;
}