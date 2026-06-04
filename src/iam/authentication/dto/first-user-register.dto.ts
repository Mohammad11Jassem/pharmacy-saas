import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { AccountType } from '../../../generated/prisma/client';

export class FirstUserRegisterDto {
  @IsString()
  @MaxLength(50)
  loginCode!: string;

  @IsEnum(AccountType)
  accountType!: AccountType;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  passwordConfirmation!: string;

  @IsEmail()
  email: string;
}
