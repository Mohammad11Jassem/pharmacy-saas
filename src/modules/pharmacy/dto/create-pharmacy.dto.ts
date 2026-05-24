import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePharmacyDto {
  @ApiProperty({
    example: 'Al Shifa Pharmacy',
  })
  @IsString()
  @IsNotEmpty()
  pharmacyName: string;

  @ApiProperty({
    example: 'PH-1001',
  })
  @IsString()
  @IsNotEmpty()
  pharmacyCode: string;

  @ApiPropertyOptional({
    example: 'LIC-12345',
  })
  @IsOptional()
  @IsString()
  pharmacistLicenseNo?: string;

  @ApiPropertyOptional({
    example: '0988888888',
  })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({
    example: 'pharmacy@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: 'Damascus',
  })
  @IsOptional()
  @IsString()
  governorate?: string;

  @ApiPropertyOptional({
    example: 'Damascus Health Directorate',
  })
  @IsOptional()
  @IsString()
  healthDirectorate?: string;

  @ApiPropertyOptional({
    example: 'Al-Mazzeh',
  })
  @IsOptional()
  @IsString()
  areaName?: string;

  @ApiPropertyOptional({
    example: 'Main street, building 10',
  })
  @IsOptional()
  @IsString()
  addressText?: string;

  @ApiPropertyOptional({
    example: '2026-05-23',
  })
  @IsOptional()
  @IsDateString()
  openingDate?: string;
}