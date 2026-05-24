import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
export class CreatePharmacyOwnerDto {
  @ApiProperty({
    example: 'owner@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '0999999999',
  })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({
    example: 'Ahmad Ali',
  })
  @IsString()
  @IsNotEmpty()
  fullName: string;

//   @ApiProperty({
//     example: 'StrongPassword123',
//   })
//   @IsString()
//   @MinLength(8)
//   password!: string;

  @ApiProperty({
    example: '12345678901',
  })
  @IsString()
  @IsNotEmpty()
  nationalId: string;

//   @ApiProperty({
//     example: 'U-1001',
//   })
//   @IsString()
//   @IsNotEmpty()
//   loginCode: string;
}
