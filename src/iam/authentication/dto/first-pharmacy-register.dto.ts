import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class FirstPharmacyRegisterDto {
  @IsString()
  @MaxLength(50)
  pharmacyLoginCode!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  pharmacyPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  pharmacyPasswordConfirmation!: string;

  @IsEmail()
  OwnerEmail: string;
}
