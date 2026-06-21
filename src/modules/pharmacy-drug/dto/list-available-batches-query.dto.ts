import { IsEnum, IsOptional } from 'class-validator';
import { UnitType } from '../../../generated/prisma/client';

export class ListAvailableBatchesQueryDto {
  @IsOptional()
  @IsEnum(UnitType)
  unitType?: UnitType;
}