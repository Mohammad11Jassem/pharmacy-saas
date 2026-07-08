import { Type } from 'class-transformer';

import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import {
  DiscountType,
  OfferScope,
} from '../../../generated/prisma/enums';

export class CreatePlanOfferDto {
  /*
   * code:
   *
   * كود مميز للعرض.
   *
   * مثال:
   * SUMMER_30
   * LOYALTY_4_YEARS
   */
  @IsString()
  @MaxLength(100)
  code: string;

  /*
   * اسم العرض الذي سيظهر في الواجهة.
   *
   * مثال:
   * عرض الصيف
   */
  @IsString()
  @MaxLength(255)
  title: string;

  /*
   * وصف العرض.
   *
   * اختياري.
   */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /*
   * نوع العرض:
   *
   * PUBLIC  → عرض عام
   * PRIVATE → عرض خاص
   */
  @IsEnum(OfferScope)
  scope: OfferScope;

  /*
   * نوع الخصم:
   *
   * PERCENTAGE
   * FIXED_AMOUNT
   */
  @IsEnum(DiscountType)
  discountType: DiscountType;

  /*
   * قيمة الخصم.
   *
   * مثال:
   *
   * PERCENTAGE:
   * 30 = خصم 30%
   *
   * FIXED_AMOUNT:
   * 500000 = خصم 500000 SP
   */
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0.01)
  discountValue: number;

  /*
   * متى يبدأ العرض.
   */
  @IsISO8601()
  startsAt: string;

  /*
   * متى ينتهي العرض.
   */
  @IsISO8601()
  endsAt: string;

  /*
   * هل العرض فعال؟
   *
   * اختياري.
   *
   * إذا لم يرسل:
   * true
   */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}