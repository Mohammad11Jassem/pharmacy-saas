import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CodeGenerationService } from '../../common/code-generation/code-generation.service';
import { UserAccountStatus } from '../../generated/prisma/enums';

@Injectable()
export class UsersService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly codeGenerationService: CodeGenerationService,
  ) {}
  async create(createUserDto: CreateUserDto) {
    // if (
    //   createUserDto.accountType !== AccountType.ADMIN &&
    //   createUserDto.accountType !== AccountType.MEDICAL_TEAM
    // ) {
    //   throw new ConflictException(
    //     'Only ADMIN and MEDICAL_TEAM users can be created from this API',
    //   );
    // }

    const loginCode = await this.codeGenerationService.generate({prefix: 'ADM'});

    try {
      const user = await this.prisma.userAccount.create({
        data: {
          email: createUserDto.email,
          phone: createUserDto.phone,
          fullName: createUserDto.fullName,
          // No password yet. The user will set it later using loginCode.
          passwordHash: null,
          accountType: createUserDto.accountType,
          // because the account is not activated yet.
          status: UserAccountStatus.PENDING,
          loginCode,
        },
        select: {
          userId: true,
          email: true,
          phone: true,
          fullName: true,
          accountType: true,
          status: true,
          loginCode: true,
          createdAt: true,
        },
      });

      return {
        message: 'User created successfully',
        user,
      };
    } catch (error) {
      return {
          message: error instanceof Error ? error.message : 'An error occurred while creating the user',
          user: null
        } ;
    }
  }

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
