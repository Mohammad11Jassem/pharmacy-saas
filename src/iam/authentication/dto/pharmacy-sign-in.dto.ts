import { IsString, MaxLength, MinLength } from 'class-validator';

export class PharmacySignInDto {
  @IsString()
  @MaxLength(50)
  loginCode!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}