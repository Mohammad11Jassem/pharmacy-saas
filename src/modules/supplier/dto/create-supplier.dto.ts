import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

function trimString(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim();
}

function optionalTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  return trimmed === '' ? undefined : trimmed;
}

function normalizePhone(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  if (trimmed === '') {
    return undefined;
  }

  return trimmed.replace(/[\s\-()]/g, '');
}

export class CreateSupplierDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty({ message: 'supplierName is required' })
  @Length(2, 100, {
    message: 'supplierName must be between 2 and 100 characters',
  })
  supplierName: string;

  @Transform(({ value }) => normalizePhone(value))
  @IsOptional()
  @IsString()
  @Matches(/^(\+?[0-9]{7,15}|0[0-9]{7,14})$/, {
    message:
      'phone must be a valid phone number, for example 0999999999 or +963999999999',
  })
  phone?: string;

  @Transform(({ value }) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @Transform(({ value }) => optionalTrimmedString(value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}