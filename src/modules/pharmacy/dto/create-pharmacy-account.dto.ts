import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CreatePharmacyOwnerDto } from '../../pharmacy-owners/dto/create-pharmacy-owner.dto';
import { CreatePharmacyDto } from './create-pharmacy.dto';

export enum OwnerMode {
  NEW = 'NEW',
  EXISTING = 'EXISTING',
}

export class CreatePharmacyAccountDto {
  @ApiProperty({
    enum: OwnerMode,
    example: OwnerMode.NEW,
    description: 'NEW means create new owner, EXISTING means use existing owner',
  })
  @IsEnum(OwnerMode)
  ownerMode!: OwnerMode;

  @ApiPropertyOptional({
    example: 1,
    description: 'Required only when ownerMode is EXISTING',
  })
  @ValidateIf((dto: CreatePharmacyAccountDto) => dto.ownerMode === OwnerMode.EXISTING)
  @IsInt()
  existingOwnerId?: number;

  @ApiPropertyOptional({
    type: CreatePharmacyOwnerDto,
    description: 'Required only when ownerMode is NEW',
  })
  @ValidateIf((dto: CreatePharmacyAccountDto) => dto.ownerMode === OwnerMode.NEW)
  @ValidateNested()
  @Type(() => CreatePharmacyOwnerDto)
  newOwner?: CreatePharmacyOwnerDto;

  @ApiProperty({
    type: CreatePharmacyDto,
  })
  @ValidateNested()
  @Type(() => CreatePharmacyDto)
  pharmacy!: CreatePharmacyDto;
  
}