import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PharmacyStatus } from '../../../generated/prisma/enums';

export class ChangePharmacyStatusDto {
  @ApiProperty({
    enum: PharmacyStatus,
    example: PharmacyStatus.ACTIVE,
  })
  @IsEnum(PharmacyStatus)
  status: PharmacyStatus;
}
